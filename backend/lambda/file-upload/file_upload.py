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
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent,X-Requested-With',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400'
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

def get_content_type_from_filename(filename):
    """Get appropriate content type based on file extension"""
    import mimetypes
    content_type, _ = mimetypes.guess_type(filename)
    return content_type or 'application/octet-stream'

def generate_presigned_upload_url(s3_key, content_type, expiration=3600):
    """Generate presigned URL for direct S3 upload with signature compatibility"""
    s3_client = boto3.client('s3')
    try:
        bucket_name = os.environ['S3_BUCKET_NAME']
        
        print(f"Generating presigned URL for bucket: {bucket_name}, key: {s3_key}")
        print(f"Content-Type: {content_type}")
        
        # Create presigned URL that expects the Content-Type header
        # This ensures signature compatibility with Postman's request
        params = {
            'Bucket': bucket_name,
            'Key': s3_key,
            'ContentType': content_type  # Include content type in signature
        }
        
        response = s3_client.generate_presigned_url(
            'put_object',
            Params=params,
            ExpiresIn=expiration
        )
        
        print(f"Successfully generated presigned URL with Content-Type: {content_type}")
        print(f"URL expires in {expiration} seconds")
        return response
        
    except Exception as e:
        print(f"Error generating presigned URL: {str(e)}")
        print(f"Bucket: {os.environ.get('S3_BUCKET_NAME', 'NOT_SET')}")
        print(f"S3 Key: {s3_key}")
        print(f"Content-Type: {content_type}")
        
        # Fallback: try without ContentType if there's an error
        try:
            print("Attempting fallback without ContentType...")
            fallback_params = {
                'Bucket': bucket_name,
                'Key': s3_key
            }
            fallback_response = s3_client.generate_presigned_url(
                'put_object',
                Params=fallback_params,
                ExpiresIn=expiration
            )
            print("Fallback presigned URL generated successfully")
            return fallback_response
        except Exception as fallback_error:
            print(f"Fallback also failed: {str(fallback_error)}")
            raise e

def generate_presigned_download_url(s3_key, expiration=3600):
    """Generate presigned URL for file download with CORS support"""
    s3_client = boto3.client('s3')
    try:
        response = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': os.environ['S3_BUCKET_NAME'],
                'Key': s3_key,
                'ResponseContentDisposition': f'attachment; filename="{s3_key.split("/")[-1]}"'
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

def delete_file_from_s3(s3_key):
    """Delete file from S3 bucket"""
    s3_client = boto3.client('s3')
    try:
        bucket_name = os.environ['S3_BUCKET_NAME']
        
        print(f"Deleting file from S3: {s3_key}")
        
        s3_client.delete_object(
            Bucket=bucket_name,
            Key=s3_key
        )
        
        print(f"Successfully deleted file from S3: {s3_key}")
        return True
        
    except Exception as e:
        print(f"Error deleting file from S3: {str(e)}")
        print(f"S3 Key: {s3_key}")
        print(f"Bucket: {os.environ.get('S3_BUCKET_NAME', 'NOT_SET')}")
        raise e

def delete_file_metadata(file_id, user_id):
    """Delete file metadata from database"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # First check if file exists and belongs to user
            cur.execute(
                """
                SELECT s3_key, original_filename 
                FROM files 
                WHERE file_id = %s AND user_id = %s
                """,
                (file_id, user_id)
            )
            result = cur.fetchone()
            
            if not result:
                return None  # File not found or access denied
            
            s3_key, filename = result
            
            # Delete the file record
            cur.execute(
                """
                DELETE FROM files 
                WHERE file_id = %s AND user_id = %s
                """,
                (file_id, user_id)
            )
            
            deleted_count = cur.rowcount
            conn.commit()
            
            if deleted_count > 0:
                return {
                    's3_key': s3_key,
                    'filename': filename
                }
            return None
            
    except Exception as e:
        print(f"Error deleting file metadata: {str(e)}")
        raise e
    finally:
        conn.close()

def handler(event, context):
    """Main Lambda handler for simplified file upload"""
    try:
        print(f"Received event: {json.dumps(event, default=str)}")
        
        # Handle CORS preflight OPTIONS requests
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps({'message': 'CORS preflight successful'})
            }
        
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
            content_type = body.get('content_type')
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
            
            # Auto-detect content type if not provided
            if not content_type:
                content_type = get_content_type_from_filename(original_filename)
            
            # Generate unique file ID and S3 key
            file_id = str(uuid.uuid4())
            timestamp = datetime.now().strftime('%Y/%m/%d')
            # Sanitize filename for S3
            safe_filename = original_filename.replace(' ', '_').replace('/', '_')
            s3_key = f"{user_id}/{timestamp}/{file_id}_{safe_filename}"
            
            # Generate presigned URL (without Content-Type constraint for flexibility)
            upload_url = generate_presigned_upload_url(s3_key, content_type, expiration)
            
            # Pre-save metadata (status: 'pending')
            save_file_metadata(
                file_id, original_filename, s3_key, 
                0, content_type, project_id, user_id, user_email,
                upload_status='pending'
            )
            
            print(f"Generated upload URL for file: {original_filename}, file_id: {file_id}, content_type: {content_type}")
            
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'upload_url': upload_url,
                    'file_id': file_id,
                    's3_key': s3_key,
                    'content_type': content_type,
                    'expires_in': expiration,
                    'method': 'PUT',
                    'postman_instructions': {
                        'method': 'PUT',
                        'url': 'Use {{upload_url}} variable',
                        'auth': 'No Auth (presigned URL handles authentication)',
                        'headers': f'Set Content-Type: {content_type} (MUST match exactly)',
                        'body': 'Select "Binary" and choose your file',
                        'important': 'Content-Type header is REQUIRED and must match the value above'
                    },
                    'instructions': f'Upload your file using PUT method with Content-Type: {content_type} header'
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
                    'expires_in': expiration,
                    'cors_note': 'Use fetch() or window.open() to download. For programmatic download, ensure your frontend domain is in S3 CORS policy.',
                    'usage_examples': {
                        'direct_download': 'window.open(download_url)',
                        'fetch_download': 'fetch(download_url).then(response => response.blob())',
                        'anchor_download': '<a href="download_url" download="filename">Download</a>'
                    }
                })
            }
            
        elif action == 'delete':
            # Delete a file (metadata and S3 object)
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
            
            try:
                # Delete the file metadata from the database first (includes validation)
                deleted_metadata = delete_file_metadata(file_id, user_id)
                
                if not deleted_metadata:
                    return {
                        'statusCode': 404,
                        'headers': CORS_HEADERS,
                        'body': json.dumps({
                            'error': 'File not found',
                            'message': 'File not found or access denied'
                        })
                    }
                
                s3_key = deleted_metadata['s3_key']
                filename = deleted_metadata['filename']
                
                # Delete the file from S3
                delete_file_from_s3(s3_key)
                
                print(f"Successfully deleted file: {filename} (ID: {file_id})")
                
                return {
                    'statusCode': 200,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'message': 'File deleted successfully',
                        'file_id': file_id,
                        'filename': filename,
                        's3_key': s3_key,
                        'deleted_at': datetime.now().isoformat()
                    })
                }
                
            except Exception as delete_error:
                print(f"Error during file deletion: {str(delete_error)}")
                return {
                    'statusCode': 500,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'error': 'Delete operation failed',
                        'message': f'Failed to delete file: {str(delete_error)}'
                    })
                }
            
        else:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'error': 'Invalid action',
                    'message': 'Supported actions: upload, confirm, get, list, download, delete'
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