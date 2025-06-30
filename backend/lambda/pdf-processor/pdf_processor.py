import json
import os
import boto3
import psycopg2
import uuid
import requests
from datetime import datetime
from botocore.exceptions import ClientError
import fitz  # PyMuPDF for PDF processing
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

def download_pdf_from_s3(s3_key):
    """Download PDF file from S3 using the signed URL"""
    try:
        s3_client = boto3.client('s3')
        bucket_name = os.environ['S3_BUCKET_NAME']
        
        # Get the object from S3
        response = s3_client.get_object(Bucket=bucket_name, Key=s3_key)
        pdf_content = response['Body'].read()
        
        return pdf_content
    except Exception as e:
        print(f"Error downloading PDF from S3: {str(e)}")
        raise e

def extract_text_from_pdf(pdf_content):
    """Extract text content from PDF using PyMuPDF"""
    try:
        # Open PDF from bytes
        pdf_document = fitz.open(stream=pdf_content, filetype="pdf")
        
        text_content = ""
        for page_num in range(pdf_document.page_count):
            page = pdf_document[page_num]
            text_content += f"\n--- Page {page_num + 1} ---\n"
            text_content += page.get_text()
        
        pdf_document.close()
        return text_content
    except Exception as e:
        print(f"Error extracting text from PDF: {str(e)}")
        raise e

def answer_pdf_question_with_gemini(pdf_text, question):
    """Use Google AI Studio API to answer questions about PDF content"""
    try:
        import google.generativeai as genai
        
        # Configure Google AI Studio API
        api_key = os.environ.get('GOOGLE_AI_STUDIO_API_KEY')
        if not api_key:
            raise ValueError("GOOGLE_AI_STUDIO_API_KEY environment variable is required")
        
        genai.configure(api_key=api_key)
        
        # Initialize the model
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Limit PDF text to avoid token limits (approximately 50,000 characters)
        text_limit = 50000
        if len(pdf_text) > text_limit:
            pdf_text = pdf_text[:text_limit] + "\n\n[Text truncated due to length...]"
        
        prompt = f"""
        Based on the following PDF content, please answer the user's question accurately and comprehensively.
        
        PDF Content:
        {pdf_text}
        
        User Question: {question}
        
        Please provide a detailed answer based only on the information available in the PDF. 
        If the answer cannot be found in the PDF, please say so clearly.
        
        Answer:
        """
        
        response = model.generate_content(prompt)
        
        return {
            "status": "success",
            "answer": response.text
        }
    except Exception as e:
        print(f"Error calling Google AI Studio: {str(e)}")
        return {
            "status": "error",
            "error_message": f"Error answering question with Google AI Studio: {str(e)}"
        }

def save_pdf_processing_record(processing_id, file_id, user_id, pdf_text, status='pending'):
    """Save PDF processing record to database"""
    conn = get_db_connection()
    try:
        create_pdf_processing_table(conn)
        
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO pdf_processing (processing_id, file_id, user_id, pdf_text, processing_status)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (processing_id) DO UPDATE SET
                    pdf_text = EXCLUDED.pdf_text,
                    processing_status = EXCLUDED.processing_status,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id
                """,
                (processing_id, file_id, user_id, pdf_text, status)
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
                SELECT processing_id, file_id, user_id, pdf_text, processing_status, created_at
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
                    'pdf_text': result[3],
                    'processing_status': result[4],
                    'created_at': result[5].isoformat()
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
                # Download PDF from signed URL or S3
                if signed_url.startswith('http'):
                    # Download from signed URL
                    response = requests.get(signed_url)
                    pdf_content = response.content
                else:
                    # Treat as S3 key
                    pdf_content = download_pdf_from_s3(signed_url)
                
                # Extract text from PDF
                pdf_text = extract_text_from_pdf(pdf_content)
                
                # Save processing record
                save_pdf_processing_record(processing_id, file_id, user_id, pdf_text, 'completed')
                
                return {
                    'statusCode': 200,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'message': 'PDF processed successfully',
                        'processing_id': processing_id,
                        'text_length': len(pdf_text),
                        'status': 'completed'
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
                # Get answer using Vertex AI Gemini
                result = answer_pdf_question_with_gemini(processing_record['pdf_text'], question)
                
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