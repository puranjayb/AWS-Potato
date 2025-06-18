import json
import os
import boto3
import psycopg2
import base64
import uuid
from datetime import datetime
from botocore.exceptions import ClientError

def get_db_connection():
    """Get RDS connection using the secret from Secrets Manager"""
    client = boto3.client('secretsmanager')
    try:
        secret_value = client.get_secret_value(SecretId=os.environ['DB_SECRET_ARN'])
        secret = json.loads(secret_value['SecretString'])
        
        conn = psycopg2.connect(
            host=secret['host'],
            port=secret['port'],
            database=os.environ['DB_NAME'],
            user=secret['username'],
            password=secret['password']
        )
        return conn
    except Exception as e:
        print(f"Error connecting to database: {str(e)}")
        raise e

def create_files_table(conn):
    """Create files table if it doesn't exist"""
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS files (
                    id SERIAL PRIMARY KEY,
                    file_id VARCHAR(36) UNIQUE NOT NULL,
                    original_filename VARCHAR(255) NOT NULL,
                    s3_key VARCHAR(512) NOT NULL,
                    file_size BIGINT NOT NULL,
                    content_type VARCHAR(100),
                    project_id VARCHAR(36),
                    user_id VARCHAR(255) NOT NULL,
                    user_email VARCHAR(255),
                    upload_status VARCHAR(50) DEFAULT 'uploaded',
                    processing_status VARCHAR(50) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
    except Exception as e:
        print(f"Error creating files table: {str(e)}")
        raise e

def save_file_metadata(file_id, original_filename, s3_key, file_size, content_type, project_id, user_id, user_email):
    """Save file metadata to RDS"""
    conn = get_db_connection()
    try:
        create_files_table(conn)
        
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO files (file_id, original_filename, s3_key, file_size, content_type, project_id, user_id, user_email)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (file_id, original_filename, s3_key, file_size, content_type, project_id, user_id, user_email)
            )
            result = cur.fetchone()
            conn.commit()
            return result[0]
    except Exception as e:
        print(f"Error saving file metadata: {str(e)}")
        raise e
    finally:
        conn.close()

def upload_to_s3(file_content, s3_key, content_type):
    """Upload file to S3 bucket"""
    s3_client = boto3.client('s3')
    try:
        s3_client.put_object(
            Bucket=os.environ['S3_BUCKET_NAME'],
            Key=s3_key,
            Body=file_content,
            ContentType=content_type,
            ServerSideEncryption='AES256'
        )
        return True
    except Exception as e:
        print(f"Error uploading to S3: {str(e)}")
        raise e

def get_file_metadata(file_id, user_id):
    """Get file metadata from RDS"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT file_id, original_filename, s3_key, file_size, content_type, 
                       project_id, user_id, user_email, upload_status, processing_status, created_at
                FROM files 
                WHERE file_id = %s AND user_id = %s
                """,
                (file_id, user_id)
            )
            result = cur.fetchone()
            if result:
                return {
                    'file_id': result[0],
                    'original_filename': result[1],
                    's3_key': result[2],
                    'file_size': result[3],
                    'content_type': result[4],
                    'project_id': result[5],
                    'user_id': result[6],
                    'user_email': result[7],
                    'upload_status': result[8],
                    'processing_status': result[9],
                    'created_at': result[10].isoformat()
                }
            return None
    except Exception as e:
        print(f"Error getting file metadata: {str(e)}")
        raise e
    finally:
        conn.close()

def list_files(user_id, project_id=None):
    """List files for a user, optionally filtered by project"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            if project_id:
                cur.execute(
                    """
                    SELECT file_id, original_filename, file_size, content_type, 
                           user_email, upload_status, processing_status, created_at
                    FROM files 
                    WHERE user_id = %s AND project_id = %s
                    ORDER BY created_at DESC
                    """,
                    (user_id, project_id)
                )
            else:
                cur.execute(
                    """
                    SELECT file_id, original_filename, file_size, content_type, 
                           user_email, upload_status, processing_status, created_at
                    FROM files 
                    WHERE user_id = %s
                    ORDER BY created_at DESC
                    """,
                    (user_id,)
                )
            
            files = []
            for row in cur.fetchall():
                files.append({
                    'file_id': row[0],
                    'original_filename': row[1],
                    'file_size': row[2],
                    'content_type': row[3],
                    'user_email': row[4],
                    'upload_status': row[5],
                    'processing_status': row[6],
                    'created_at': row[7].isoformat()
                })
            return files
    except Exception as e:
        print(f"Error listing files: {str(e)}")
        raise e
    finally:
        conn.close()

def handler(event, context):
    """Main Lambda handler"""
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        action = body.get('action')
        
        # Get user info from Cognito claims (set by API Gateway authorizer)
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_id = claims.get('cognito:username') or claims.get('sub')
        user_email = claims.get('email')
        
        if not user_id:
            return {
                'statusCode': 401,
                'body': json.dumps({
                    'error': 'Unauthorized',
                    'message': 'User not authenticated'
                })
            }
        
        if action == 'upload':
            # Handle file upload
            file_content = body.get('file_content')  # Base64 encoded
            original_filename = body.get('filename')
            content_type = body.get('content_type', 'application/octet-stream')
            project_id = body.get('project_id')
            
            if not file_content or not original_filename:
                return {
                    'statusCode': 400,
                    'body': json.dumps({
                        'error': 'Missing required fields',
                        'message': 'file_content and filename are required'
                    })
                }
            
            # Decode base64 file content
            try:
                file_data = base64.b64decode(file_content)
                file_size = len(file_data)
            except Exception as e:
                return {
                    'statusCode': 400,
                    'body': json.dumps({
                        'error': 'Invalid file content',
                        'message': 'File content must be valid base64'
                    })
                }
            
            # Generate unique file ID and S3 key
            file_id = str(uuid.uuid4())
            timestamp = datetime.now().strftime('%Y/%m/%d')
            s3_key = f"{user_id}/{timestamp}/{file_id}_{original_filename}"
            
            # Upload to S3
            upload_to_s3(file_data, s3_key, content_type)
            
            # Save metadata to RDS
            db_id = save_file_metadata(
                file_id, original_filename, s3_key, 
                file_size, content_type, project_id, user_id, user_email
            )
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'File uploaded successfully',
                    'file_id': file_id,
                    'original_filename': original_filename,
                    'file_size': file_size,
                    's3_key': s3_key,
                    'user_email': user_email
                })
            }
            
        elif action == 'get_file':
            # Get file metadata
            file_id = body.get('file_id')
            
            if not file_id:
                return {
                    'statusCode': 400,
                    'body': json.dumps({
                        'error': 'Missing required fields',
                        'message': 'file_id is required'
                    })
                }
            
            file_metadata = get_file_metadata(file_id, user_id)
            
            if not file_metadata:
                return {
                    'statusCode': 404,
                    'body': json.dumps({
                        'error': 'File not found',
                        'message': 'File not found or access denied'
                    })
                }
            
            return {
                'statusCode': 200,
                'body': json.dumps(file_metadata)
            }
            
        elif action == 'list_files':
            # List user files
            project_id = body.get('project_id')
            files = list_files(user_id, project_id)
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'files': files
                })
            }
            
        else:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'Invalid action',
                    'message': 'Supported actions: upload, get_file, list_files'
                })
            }
            
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Internal Server Error',
                'message': str(e)
            })
        } 