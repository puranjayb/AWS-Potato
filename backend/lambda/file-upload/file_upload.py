import json
import os
import boto3
import psycopg2
import uuid
from datetime import datetime
from botocore.exceptions import ClientError

# CORS headers for all responses
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
}

def get_db_connection():
    """Get Neon DB connection using DATABASE_URL environment variable"""
    try:
        database_url = os.environ['DATABASE_URL']
        conn = psycopg2.connect(database_url)
        return conn
    except Exception as e:
        print(f"Error connecting to Neon database: {str(e)}")
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
                    upload_status VARCHAR(50) DEFAULT 'pending',
                    processing_status VARCHAR(50) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
    except Exception as e:
        print(f"Error creating files table: {str(e)}")
        raise e

def save_file_metadata(file_id, original_filename, s3_key, file_size, content_type, project_id, user_id, user_email, upload_status='pending'):
    """Save file metadata to Neon DB"""
    conn = get_db_connection()
    try:
        create_files_table(conn)
        
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO files (file_id, original_filename, s3_key, file_size, content_type, project_id, user_id, user_email, upload_status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (file_id, original_filename, s3_key, file_size, content_type, project_id, user_id, user_email, upload_status)
            )
            result = cur.fetchone()
            conn.commit()
            return result[0]
    except Exception as e:
        print(f"Error saving file metadata: {str(e)}")
        raise e
    finally:
        conn.close()

def get_file_metadata(file_id, user_id):
    """Get file metadata from Neon DB"""
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

def generate_presigned_upload_url(s3_key, content_type, expiration=3600):
    """Generate presigned URL for direct S3 upload with CORS support"""
    s3_client = boto3.client('s3')
    try:
        response = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': os.environ['S3_BUCKET_NAME'],
                'Key': s3_key,
                'ContentType': content_type,
                'ServerSideEncryption': 'AES256'
            },
            ExpiresIn=expiration
        )
        return response
    except Exception as e:
        print(f"Error generating presigned URL: {str(e)}")
        raise e

def generate_presigned_download_url(s3_key, expiration=3600):
    """Generate presigned URL for file download"""
    s3_client = boto3.client('s3')
    try:
        response = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': os.environ['S3_BUCKET_NAME'],
                'Key': s3_key
            },
            ExpiresIn=expiration
        )
        return response
    except Exception as e:
        print(f"Error generating presigned download URL: {str(e)}")
        raise e

def update_file_status(file_id, user_id, file_size=None, upload_status=None, processing_status=None):
    """Update file upload status and size after presigned URL upload"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Build dynamic query based on provided parameters
            update_fields = []
            params = []
            
            if file_size is not None:
                update_fields.append("file_size = %s")
                params.append(file_size)
            
            if upload_status is not None:
                update_fields.append("upload_status = %s")
                params.append(upload_status)
            
            if processing_status is not None:
                update_fields.append("processing_status = %s")
                params.append(processing_status)
            
            update_fields.append("updated_at = CURRENT_TIMESTAMP")
            
            # Add WHERE clause parameters
            params.extend([file_id, user_id])
            
            query = f"""
                UPDATE files 
                SET {', '.join(update_fields)}
                WHERE file_id = %s AND user_id = %s
                RETURNING id
            """
            
            cur.execute(query, params)
            result = cur.fetchone()
            conn.commit()
            
            return result is not None
    except Exception as e:
        print(f"Error updating file status: {str(e)}")
        raise e
    finally:
        conn.close()

def extract_user_info(event):
    """Extract user information from the Lambda event"""
    print(f"Event structure: {json.dumps(event, default=str)}")
    
    user_id = None
    user_email = None
    
    # Try to extract user info from Cognito authorizer
    try:
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        if claims:
            user_id = claims.get('cognito:username') or claims.get('sub')
            user_email = claims.get('email')
            print(f"Extracted from claims - user_id: {user_id}, email: {user_email}")
    except Exception as e:
        print(f"Failed to extract from claims: {e}")
    
    # Fallback: try authorizer directly
    if not user_id:
        try:
            authorizer = event.get('requestContext', {}).get('authorizer', {})
            user_id = authorizer.get('principalId') or authorizer.get('sub')
            user_email = authorizer.get('email')
            print(f"Extracted from authorizer - user_id: {user_id}, email: {user_email}")
        except Exception as e:
            print(f"Failed to extract from authorizer: {e}")
    
    return user_id, user_email

def handler(event, context):
    """Main Lambda handler for simplified file upload"""
    try:
        print(f"Received event: {json.dumps(event, default=str)}")
        
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        action = body.get('action')
        
        print(f"Requested action: {action}")
        
        # Extract user info
        user_id, user_email = extract_user_info(event)
        
        if not user_id:
            print("Authentication failed - no user_id found")
            return {
                'statusCode': 401,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'error': 'Unauthorized',
                    'message': 'User not authenticated - no user ID found'
                })
            }
        
        print(f"Authenticated user: {user_id}, email: {user_email}")
        
        if action == 'upload':
            # Generate presigned URL for file upload
            original_filename = body.get('filename')
            content_type = body.get('content_type', 'application/octet-stream')
            project_id = body.get('project_id')
            expiration = body.get('expiration', 3600)  # Default 1 hour
            
            if not original_filename:
                return {
                    'statusCode': 400,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'error': 'Missing required fields',
                        'message': 'filename is required'
                    })
                }
            
            # Generate unique file ID and S3 key
            file_id = str(uuid.uuid4())
            timestamp = datetime.now().strftime('%Y/%m/%d')
            # Sanitize filename for S3
            safe_filename = original_filename.replace(' ', '_').replace('/', '_')
            s3_key = f"{user_id}/{timestamp}/{file_id}_{safe_filename}"
            
            # Generate presigned URL
            upload_url = generate_presigned_upload_url(s3_key, content_type, expiration)
            
            # Pre-save metadata (status: 'pending')
            save_file_metadata(
                file_id, original_filename, s3_key, 
                0, content_type, project_id, user_id, user_email,
                upload_status='pending'
            )
            
            print(f"Generated upload URL for file: {original_filename}, file_id: {file_id}")
            
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'upload_url': upload_url,
                    'file_id': file_id,
                    's3_key': s3_key,
                    'expires_in': expiration,
                    'method': 'PUT',
                    'instructions': 'Upload your file to the upload_url using PUT method with the correct Content-Type header'
                })
            }
            
        elif action == 'confirm':
            # Confirm that file was uploaded via presigned URL
            file_id = body.get('file_id')
            file_size = body.get('file_size')
            
            if not file_id:
                return {
                    'statusCode': 400,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'error': 'Missing required fields',
                        'message': 'file_id is required'
                    })
                }
            
            # Update file status to uploaded
            success = update_file_status(
                file_id, user_id, 
                file_size=file_size,
                upload_status='uploaded'
            )
            
            if not success:
                return {
                    'statusCode': 404,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'error': 'File not found',
                        'message': 'File not found or access denied'
                    })
                }
            
            # Get updated file metadata
            file_metadata = get_file_metadata(file_id, user_id)
            
            print(f"Upload confirmed for file_id: {file_id}")
            
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'message': 'File upload confirmed successfully',
                    'file_metadata': file_metadata
                })
            }
            
        elif action == 'get':
            # Get file metadata
            file_id = body.get('file_id')
            
            if not file_id:
                return {
                    'statusCode': 400,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'error': 'Missing required fields',
                        'message': 'file_id is required'
                    })
                }
            
            file_metadata = get_file_metadata(file_id, user_id)
            
            if not file_metadata:
                return {
                    'statusCode': 404,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'error': 'File not found',
                        'message': 'File not found or access denied'
                    })
                }
            
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps(file_metadata)
            }
            
        elif action == 'list':
            # List user files
            project_id = body.get('project_id')
            files = list_files(user_id, project_id)
            
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'files': files
                })
            }
            
        elif action == 'download':
            # Generate presigned URL for file download
            file_id = body.get('file_id')
            expiration = body.get('expiration', 3600)  # Default 1 hour
            
            if not file_id:
                return {
                    'statusCode': 400,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'error': 'Missing required fields',
                        'message': 'file_id is required'
                    })
                }
            
            # Get file metadata to ensure user has access
            file_metadata = get_file_metadata(file_id, user_id)
            
            if not file_metadata:
                return {
                    'statusCode': 404,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'error': 'File not found',
                        'message': 'File not found or access denied'
                    })
                }
            
            # Only allow download of uploaded files
            if file_metadata['upload_status'] != 'uploaded':
                return {
                    'statusCode': 400,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'error': 'File not ready',
                        'message': 'File upload not completed yet'
                    })
                }
            
            # Generate presigned download URL
            download_url = generate_presigned_download_url(file_metadata['s3_key'], expiration)
            
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'download_url': download_url,
                    'file_id': file_id,
                    'filename': file_metadata['original_filename'],
                    'expires_in': expiration
                })
            }
            
        else:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'error': 'Invalid action',
                    'message': 'Supported actions: upload, confirm, get, list, download'
                })
            }
            
    except Exception as e:
        print(f"Unexpected error in handler: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'error': 'Internal Server Error',
                'message': str(e)
            })
        } 