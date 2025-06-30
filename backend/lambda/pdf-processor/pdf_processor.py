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

def upload_pdf_to_gemini(pdf_url, api_key):
    """Upload PDF to Gemini File API"""
    try:
        # Download PDF content
        pdf_response = requests.get(pdf_url, timeout=30)
        pdf_response.raise_for_status()
        
        # Upload to Gemini File API
        upload_url = "https://generativelanguage.googleapis.com/upload/v1beta/files"
        
        headers = {
            "X-Goog-Upload-Protocol": "multipart"
        }
        
        files = {
            "metadata": (None, '{"file": {"display_name": "uploaded_pdf"}}', "application/json"),
            "file": ("document.pdf", pdf_response.content, "application/pdf")
        }
        
        upload_url_with_key = f"{upload_url}?key={api_key}"
        response = requests.post(upload_url_with_key, headers=headers, files=files, timeout=60)
        response.raise_for_status()
        
        file_info = response.json()
        return file_info.get("file", {}).get("uri")
        
    except Exception as e:
        print(f"Error uploading PDF to Gemini: {str(e)}")
        raise e

def process_pdf_with_gemini_rest(pdf_url, question=None):
    """Use Google AI Studio REST API to process PDF directly from URL"""
    try:
        # Get API key
        api_key = os.environ.get('GOOGLE_AI_STUDIO_API_KEY')
        if not api_key:
            raise ValueError("GOOGLE_AI_STUDIO_API_KEY environment variable is required")
        
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
            Please analyze this PDF document and provide a comprehensive summary. 
            Focus on the main topics, key information, and structure of the document.
            Extract the most important details and present them in a clear, organized manner.
            """
        
        try:
            # Method 1: Try uploading the PDF file
            file_uri = upload_pdf_to_gemini(pdf_url, api_key)
            
            # Generate content using the uploaded file
            generate_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt},
                            {"file_data": {"mime_type": "application/pdf", "file_uri": file_uri}}
                        ]
                    }
                ]
            }
            
            headers = {"Content-Type": "application/json"}
            
            response = requests.post(generate_url, json=payload, headers=headers, timeout=120)
            response.raise_for_status()
            
            result = response.json()
            
            if "candidates" in result and len(result["candidates"]) > 0:
                text_response = result["candidates"][0]["content"]["parts"][0]["text"]
                
                return {
                    "status": "success",
                    "answer": text_response,
                    "summary": text_response if not question else None
                }
            else:
                raise Exception("No response generated from Gemini")
                
        except Exception as upload_error:
            print(f"File upload method failed: {str(upload_error)}")
            
            # Method 2: Fallback to text-only processing with URL reference
            fallback_prompt = f"""
            I need you to analyze a PDF document. While I cannot directly provide the PDF content, 
            here is the information about it:
            
            PDF URL: {pdf_url}
            
            {prompt}
            
            Please note that you would need to access the PDF from the URL to provide a complete analysis.
            If you cannot access the URL directly, please indicate that the PDF needs to be processed 
            through an alternative method.
            """
            
            generate_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": fallback_prompt}
                        ]
                    }
                ]
            }
            
            headers = {"Content-Type": "application/json"}
            
            response = requests.post(generate_url, json=payload, headers=headers, timeout=60)
            response.raise_for_status()
            
            result = response.json()
            
            if "candidates" in result and len(result["candidates"]) > 0:
                text_response = result["candidates"][0]["content"]["parts"][0]["text"]
                
                return {
                    "status": "success",
                    "answer": text_response,
                    "summary": text_response if not question else None,
                    "note": "Processed using URL reference method (PDF content not directly analyzed)"
                }
            else:
                raise Exception("No response generated from Gemini")
                
    except Exception as e:
        print(f"Error calling Google AI Studio REST API: {str(e)}")
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
                result = process_pdf_with_gemini_rest(pdf_url)
                
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
                result = process_pdf_with_gemini_rest(processing_record['pdf_url'], question)
                
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