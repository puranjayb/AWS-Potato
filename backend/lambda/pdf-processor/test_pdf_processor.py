#!/usr/bin/env python3
"""
Test script for PDF Processor Lambda with Google AI Studio (URL-based processing)
"""

import json
import os
import sys

# Add the current directory to the path to import the lambda function
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pdf_processor import handler

def test_process_pdf():
    """Test PDF processing functionality with URL-based approach"""
    print("Testing PDF processing (URL-based)...")
    
    # Mock event for processing PDF
    event = {
        'httpMethod': 'POST',
        'headers': {
            'x-user-id': 'test-user-123'
        },
        'body': json.dumps({
            'action': 'process_pdf',
            'file_id': 'test-file-uuid',
            'signed_url': 'https://example.com/test-pdf-url'
        }),
        'requestContext': {
            'authorizer': {
                'claims': {
                    'cognito:username': 'test-user-123',
                    'email': 'test@example.com',
                    'sub': 'test-cognito-sub'
                }
            }
        }
    }
    
    context = {}
    
    try:
        response = handler(event, context)
        print(f"Response: {json.dumps(response, indent=2)}")
        
        # Check if response contains expected fields for URL-based processing
        if response.get('statusCode') == 200:
            body = json.loads(response.get('body', '{}'))
            print(f"✅ Processing successful")
            print(f"   Processing ID: {body.get('processing_id')}")
            print(f"   Summary: {body.get('summary', 'N/A')[:100]}...")
        else:
            print(f"❌ Processing failed with status: {response.get('statusCode')}")
            
        return response
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None

def test_ask_question():
    """Test asking a question about PDF (URL-based)"""
    print("\nTesting question asking (URL-based)...")
    
    # Mock event for asking question
    event = {
        'httpMethod': 'POST',
        'headers': {
            'x-user-id': 'test-user-123'
        },
        'body': json.dumps({
            'action': 'ask_question',
            'processing_id': 'test-processing-uuid',
            'question': 'What is the main topic of this document?'
        }),
        'requestContext': {
            'authorizer': {
                'claims': {
                    'cognito:username': 'test-user-123',
                    'email': 'test@example.com',
                    'sub': 'test-cognito-sub'
                }
            }
        }
    }
    
    context = {}
    
    try:
        response = handler(event, context)
        print(f"Response: {json.dumps(response, indent=2)}")
        
        # Check if response contains expected fields
        if response.get('statusCode') == 200:
            body = json.loads(response.get('body', '{}'))
            print(f"✅ Question answered successfully")
            print(f"   Question: {body.get('question')}")
            print(f"   Answer: {body.get('answer', 'N/A')[:150]}...")
        else:
            print(f"❌ Question failed with status: {response.get('statusCode')}")
            
        return response
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None

def test_get_conversations():
    """Test getting conversation history"""
    print("\nTesting conversation history retrieval...")
    
    # Mock event for getting conversations
    event = {
        'httpMethod': 'POST',
        'headers': {
            'x-user-id': 'test-user-123'
        },
        'body': json.dumps({
            'action': 'get_conversations',
            'processing_id': 'test-processing-uuid'
        }),
        'requestContext': {
            'authorizer': {
                'claims': {
                    'cognito:username': 'test-user-123',
                    'email': 'test@example.com',
                    'sub': 'test-cognito-sub'
                }
            }
        }
    }
    
    context = {}
    
    try:
        response = handler(event, context)
        print(f"Response: {json.dumps(response, indent=2)}")
        
        # Check if response contains expected fields
        if response.get('statusCode') == 200:
            body = json.loads(response.get('body', '{}'))
            conversations = body.get('conversations', [])
            print(f"✅ Retrieved {len(conversations)} conversations")
        else:
            print(f"❌ Conversation retrieval failed with status: {response.get('statusCode')}")
            
        return response
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None

def test_cors_preflight():
    """Test CORS preflight request"""
    print("Testing CORS preflight...")
    
    event = {
        'httpMethod': 'OPTIONS'
    }
    
    context = {}
    
    try:
        response = handler(event, context)
        print(f"Response: {json.dumps(response, indent=2)}")
        
        # Check CORS headers
        headers = response.get('headers', {})
        if headers.get('Access-Control-Allow-Origin'):
            print("✅ CORS preflight handled correctly")
        else:
            print("❌ CORS headers missing")
            
        return response
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None

def test_error_handling():
    """Test error handling scenarios"""
    print("\nTesting error handling...")
    
    # Test missing action
    event = {
        'httpMethod': 'POST',
        'headers': {
            'x-user-id': 'test-user-123'
        },
        'body': json.dumps({
            'file_id': 'test-file-uuid'
            # Missing 'action' field
        }),
        'requestContext': {
            'authorizer': {
                'claims': {
                    'cognito:username': 'test-user-123',
                    'email': 'test@example.com',
                    'sub': 'test-cognito-sub'
                }
            }
        }
    }
    
    context = {}
    
    try:
        response = handler(event, context)
        print(f"Response: {json.dumps(response, indent=2)}")
        
        if response.get('statusCode') == 400:
            print("✅ Error handling works correctly")
        else:
            print("❌ Error handling not working as expected")
            
        return response
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None

if __name__ == "__main__":
    print("PDF Processor Lambda Test Script")
    print("URL-based Processing with Google AI Studio")
    print("=" * 50)
    
    # Set up mock environment variables if not present
    if not os.environ.get('DATABASE_URL'):
        os.environ['DATABASE_URL'] = 'postgresql://mock:mock@localhost:5432/mock'
    if not os.environ.get('S3_BUCKET_NAME'):
        os.environ['S3_BUCKET_NAME'] = 'mock-bucket'
    if not os.environ.get('GOOGLE_AI_STUDIO_API_KEY'):
        os.environ['GOOGLE_AI_STUDIO_API_KEY'] = 'mock-api-key'
        print("⚠️  Using mock Google AI Studio API key for testing")
    
    print(f"Environment setup:")
    print(f"  DATABASE_URL: {'✅ Set' if os.environ.get('DATABASE_URL') else '❌ Missing'}")
    print(f"  S3_BUCKET_NAME: {'✅ Set' if os.environ.get('S3_BUCKET_NAME') else '❌ Missing'}")
    print(f"  GOOGLE_AI_STUDIO_API_KEY: {'✅ Set' if os.environ.get('GOOGLE_AI_STUDIO_API_KEY') else '❌ Missing'}")
    print()
    
    # Run tests
    test_cors_preflight()
    test_process_pdf()
    test_ask_question()
    test_get_conversations()
    test_error_handling()
    
    print("\n" + "=" * 50)
    print("Test script completed!")
    print("Note: Most tests will fail without proper database and API key setup.")
    print("This script validates the request/response structure and error handling.") 