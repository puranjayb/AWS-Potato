import json
import os
import boto3
import psycopg2
import uuid
import requests
from datetime import datetime
from botocore.exceptions import ClientError
import base64

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

def create_pdf_processing_table(conn):
    """Create PDF processing table if it doesn't exist"""
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS pdf_processing (
                    id SERIAL PRIMARY KEY,
                    processing_id VARCHAR(36) UNIQUE NOT NULL,
                    file_id VARCHAR(36) NOT NULL,
                    user_id VARCHAR(255) NOT NULL,
                    pdf_text TEXT,
                    processing_status VARCHAR(50) DEFAULT 'pending',
                    agent_session_id VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS pdf_conversations (
                    id SERIAL PRIMARY KEY,
                    processing_id VARCHAR(36) NOT NULL REFERENCES pdf_processing(processing_id),
                    question TEXT NOT NULL,
                    answer TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
    except Exception as e:
        print(f"Error creating PDF processing tables: {str(e)}")
        raise e

def generate_public_s3_url(s3_key, expiration=3600):
    """Generate a public S3 URL that Gemini can access"""
    try:
        s3_client = boto3.client('s3')
        bucket_name = os.environ['S3_BUCKET_NAME']
        
        # Generate a presigned URL that Gemini can access
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': s3_key},
            ExpiresIn=expiration
        )
        
        return url
    except Exception as e:
        print(f"Error generating public S3 URL: {str(e)}")
        raise e

def process_pdf_with_gemini(pdf_url, question=None):
    """Use Google AI Studio API to process PDF directly from URL"""
    try:
        import google.generativeai as genai
        
        # Configure Google AI Studio API
        api_key = os.environ.get('GOOGLE_AI_STUDIO_API_KEY')
        if not api_key:
            raise ValueError("GOOGLE_AI_STUDIO_API_KEY environment variable is required")
        
        genai.configure(api_key=api_key)
        
        # Initialize the model with vision capabilities
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        if question:
            # For asking questions about the PDF
            prompt = f"""
            Please analyze this PDF document and answer the following question accurately and comprehensively.
            
            Question: {question}
            
            Please provide a detailed answer based only on the information available in the PDF. 
            If the answer cannot be found in the PDF, please say so clearly.
            """
        else:
            # For initial processing - extract and summarize content
            prompt = """
            Please analyze this PDF document and extract its text content. 
            Provide a brief summary of what the document contains.
            Focus on the main topics, key information, and structure of the document.
            """
        
        # Upload the PDF file to Gemini
        try:
            # Download the PDF content for upload to Gemini
            response = requests.get(pdf_url)
            response.raise_for_status()
            
            # Upload file to Gemini
            uploaded_file = genai.upload_file(
                path=None,
                mime_type="application/pdf",
                display_name="uploaded_pdf",
                data=response.content
            )
            
            # Process the file
            response = model.generate_content([prompt, uploaded_file])
            
            # Clean up the uploaded file
            genai.delete_file(uploaded_file.name)
            
            return {
                "status": "success",
                "answer": response.text,
                "summary": response.text if not question else None
            }
            
        except Exception as upload_error:
            print(f"Error uploading to Gemini, trying direct URL method: {str(upload_error)}")
            
            # Fallback: Try with direct URL (if supported)
            response = model.generate_content([
                prompt + f"\n\nPDF URL: {pdf_url}\n\nNote: Please access and analyze the PDF from the provided URL."
            ])
            
            return {
                "status": "success",
                "answer": response.text,
                "summary": response.text if not question else None,
                "note": "Processed using URL reference method"
            }
            
    except Exception as e:
        print(f"Error calling Google AI Studio: {str(e)}")
        return {
            "status": "error",
            "error_message": f"Error processing PDF with Google AI Studio: {str(e)}"
        }

def save_pdf_processing_record(processing_id, file_id, user_id, pdf_url, pdf_summary=None, status='pending'):
    """Save PDF processing record to database"""
    conn = get_db_connection()
    try:
        create_pdf_processing_table(conn)
        
        with conn.cursor() as cur:
            # Update table structure to store URL and summary instead of full text
            cur.execute("""
                ALTER TABLE pdf_processing 
                ADD COLUMN IF NOT EXISTS pdf_url TEXT,
                ADD COLUMN IF NOT EXISTS pdf_summary TEXT
            """)
            
            cur.execute(
                """
                INSERT INTO pdf_processing (processing_id, file_id, user_id, pdf_url, pdf_summary, processing_status)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (processing_id) DO UPDATE SET
                    pdf_url = EXCLUDED.pdf_url,
                    pdf_summary = EXCLUDED.pdf_summary,
                    processing_status = EXCLUDED.processing_status,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id
                """,
                (processing_id, file_id, user_id, pdf_url, pdf_summary, status)
            )
            result = cur.fetchone()
            conn.commit()
            return result[0]
    except Exception as e:
        print(f"Error saving PDF processing record: {str(e)}")
        raise e
    finally:
        conn.close()

def save_conversation(processing_id, question, answer):
    """Save conversation to database"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO pdf_conversations (processing_id, question, answer)
                VALUES (%s, %s, %s)
                RETURNING id
                """,
                (processing_id, question, answer)
            )
            result = cur.fetchone()
            conn.commit()
            return result[0]
    except Exception as e:
        print(f"Error saving conversation: {str(e)}")
        raise e
    finally:
        conn.close()

def get_conversation_history(processing_id):
    """Get conversation history for a processing session"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT question, answer, timestamp
                FROM pdf_conversations
                WHERE processing_id = %s
                ORDER BY timestamp ASC
                """,
                (processing_id,)
            )
            
            conversations = []
            for row in cur.fetchall():
                conversations.append({
                    'question': row[0],
                    'answer': row[1],
                    'timestamp': row[2].isoformat()
                })
            return conversations
    except Exception as e:
        print(f"Error getting conversation history: {str(e)}")
        raise e
    finally:
        conn.close()

def get_processing_record(processing_id, user_id):
    """Get PDF processing record"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT processing_id, file_id, user_id, pdf_url, pdf_summary, processing_status, created_at
                FROM pdf_processing
                WHERE processing_id = %s AND user_id = %s
                """,
                (processing_id, user_id)
            )
            result = cur.fetchone()
            if result:
                return {
                    'processing_id': result[0],
                    'file_id': result[1],
                    'user_id': result[2],
                    'pdf_url': result[3],
                    'pdf_summary': result[4],
                    'processing_status': result[5],
                    'created_at': result[6].isoformat()
                }
            return None
    except Exception as e:
        print(f"Error getting processing record: {str(e)}")
        raise e
    finally:
        conn.close()

def extract_user_info(event):
    """Extract user information from the event"""
    try:
        # Check if user info is in the authorizer context (Cognito)
        authorizer = event.get('requestContext', {}).get('authorizer', {})
        if authorizer.get('claims'):
            claims = authorizer['claims']
            return {
                'user_id': claims.get('cognito:username', claims.get('sub')),
                'email': claims.get('email'),
                'cognito_sub': claims.get('sub')
            }
        
        # Fallback: extract from headers or body
        headers = event.get('headers', {})
        if 'x-user-id' in headers:
            return {'user_id': headers['x-user-id']}
        
        # Last resort: try to get from body
        body = json.loads(event.get('body', '{}'))
        if 'user_id' in body:
            return {'user_id': body['user_id']}
        
        return None
    except Exception as e:
        print(f"Error extracting user info: {str(e)}")
        return None

def handler(event, context):
    """Main Lambda handler"""
    try:
        # Handle CORS preflight
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps({'message': 'CORS preflight handled'})
            }
        
        # Extract user information
        user_info = extract_user_info(event)
        if not user_info or not user_info.get('user_id'):
            return {
                'statusCode': 401,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'error': 'Unauthorized',
                    'message': 'User authentication required'
                })
            }
        
        user_id = user_info['user_id']
        
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        action = body.get('action')
        
        if action == 'process_pdf':
            # Process a PDF for the first time
            file_id = body.get('file_id')
            signed_url = body.get('signed_url')
            
            if not file_id or not signed_url:
                return {
                    'statusCode': 400,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'error': 'Missing required fields',
                        'message': 'file_id and signed_url are required'
                    })
                }
            
            # Generate processing ID
            processing_id = str(uuid.uuid4())
            
            try:
                # Generate accessible URL for Gemini
                if signed_url.startswith('http'):
                    # Use the provided signed URL
                    pdf_url = signed_url
                else:
                    # Generate a new signed URL from S3 key
                    pdf_url = generate_public_s3_url(signed_url)
                
                # Process PDF with Gemini to get summary
                result = process_pdf_with_gemini(pdf_url)
                
                if result['status'] == 'success':
                    # Save processing record with URL and summary
                    save_pdf_processing_record(
                        processing_id, 
                        file_id, 
                        user_id, 
                        pdf_url, 
                        result.get('summary', result['answer']), 
                        'completed'
                    )
                    
                    return {
                        'statusCode': 200,
                        'headers': CORS_HEADERS,
                        'body': json.dumps({
                            'message': 'PDF processed successfully',
                            'processing_id': processing_id,
                            'summary': result.get('summary', result['answer'])[:500] + '...' if len(result.get('summary', result['answer'])) > 500 else result.get('summary', result['answer']),
                            'status': 'completed'
                        })
                    }
                else:
                    # Save failed processing record
                    save_pdf_processing_record(processing_id, file_id, user_id, pdf_url, None, 'failed')
                    
                    return {
                        'statusCode': 500,
                        'headers': CORS_HEADERS,
                        'body': json.dumps({
                            'error': 'PDF processing failed',
                            'message': result.get('error_message', 'Unknown error'),
                            'processing_id': processing_id,
                            'status': 'failed'
                        })
                    }
                
            except Exception as e:
                # Save failed processing record
                save_pdf_processing_record(processing_id, file_id, user_id, "", 'failed')
                
                return {
                    'statusCode': 500,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'error': 'PDF processing failed',
                        'message': str(e),
                        'processing_id': processing_id,
                        'status': 'failed'
                    })
                }
        
        elif action == 'ask_question':
            # Ask a question about a processed PDF
            processing_id = body.get('processing_id')
            question = body.get('question')
            
            if not processing_id or not question:
                return {
                    'statusCode': 400,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'error': 'Missing required fields',
                        'message': 'processing_id and question are required'
                    })
                }
            
            # Get processing record
            processing_record = get_processing_record(processing_id, user_id)
            if not processing_record:
                return {
                    'statusCode': 404,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'error': 'Processing record not found',
                        'message': 'Invalid processing_id or access denied'
                    })
                }
            
            if processing_record['processing_status'] != 'completed':
                return {
                    'statusCode': 400,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'error': 'Processing not completed',
                        'message': f"Processing status: {processing_record['processing_status']}"
                    })
                }
            
            try:
                # Ask question using Gemini with the PDF URL
                result = process_pdf_with_gemini(processing_record['pdf_url'], question)
                
                if result['status'] == 'success':
                    answer = result['answer']
                    
                    # Save conversation
                    save_conversation(processing_id, question, answer)
                    
                    return {
                        'statusCode': 200,
                        'headers': CORS_HEADERS,
                        'body': json.dumps({
                            'processing_id': processing_id,
                            'question': question,
                            'answer': answer,
                            'timestamp': datetime.utcnow().isoformat()
                        })
                    }
                else:
                    return {
                        'statusCode': 500,
                        'headers': CORS_HEADERS,
                        'body': json.dumps({
                            'error': 'Question processing failed',
                            'message': result.get('error_message', 'Unknown error')
                        })
                    }
                    
            except Exception as e:
                return {
                    'statusCode': 500,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'error': 'Question processing failed',
                        'message': str(e)
                    })
                }
        
        elif action == 'get_conversations':
            # Get conversation history
            processing_id = body.get('processing_id')
            
            if not processing_id:
                return {
                    'statusCode': 400,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'error': 'Missing required fields',
                        'message': 'processing_id is required'
                    })
                }
            
            # Verify user has access to this processing record
            processing_record = get_processing_record(processing_id, user_id)
            if not processing_record:
                return {
                    'statusCode': 404,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'error': 'Processing record not found',
                        'message': 'Invalid processing_id or access denied'
                    })
                }
            
            conversations = get_conversation_history(processing_id)
            
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'processing_id': processing_id,
                    'conversations': conversations,
                    'total_conversations': len(conversations)
                })
            }
        
        else:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'error': 'Invalid action',
                    'message': f"Unsupported action: {action}. Supported actions: process_pdf, ask_question, get_conversations"
                })
            }
    
    except Exception as e:
        print(f"Handler error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        } 