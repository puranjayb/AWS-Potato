#!/usr/bin/env python3
"""
Test script for PDF Processor Lambda
"""

import json
import os
import sys

# Add the current directory to the path to import the lambda function
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pdf_processor import handler

def test_process_pdf():
    """Test PDF processing functionality"""
    print("Testing PDF processing...")
    
    # Mock event for processing PDF
    event = {
        'httpMethod': 'POST',
        'headers': {
            'x-user-id': 'test-user-123'
        },
        'body': json.dumps({
            'action': 'process_pdf',
            'file_id': 'test-file-uuid',
            'signed_url': 'test-s3-key-or-url'
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
        return response
    except Exception as e:
        print(f"Error: {str(e)}")
        return None

def test_ask_question():
    """Test asking a question about PDF"""
    print("\nTesting question asking...")
    
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
        return response
    except Exception as e:
        print(f"Error: {str(e)}")
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
        return response
    except Exception as e:
        print(f"Error: {str(e)}")
        return None

def test_cors_preflight():
    """Test CORS preflight request"""
    print("\nTesting CORS preflight...")
    
    event = {
        'httpMethod': 'OPTIONS'
    }
    
    context = {}
    
    try:
        response = handler(event, context)
        print(f"Response: {json.dumps(response, indent=2)}")
        return response
    except Exception as e:
        print(f"Error: {str(e)}")
        return None

if __name__ == "__main__":
    print("PDF Processor Lambda Test Script")
    print("=" * 40)
    
    # Set up mock environment variables if not present
    if not os.environ.get('DATABASE_URL'):
        os.environ['DATABASE_URL'] = 'postgresql://mock:mock@localhost:5432/mock'
    if not os.environ.get('S3_BUCKET_NAME'):
        os.environ['S3_BUCKET_NAME'] = 'mock-bucket'
    if not os.environ.get('GOOGLE_CLOUD_PROJECT'):
        os.environ['GOOGLE_CLOUD_PROJECT'] = 'mock-project'
    
    # Run tests
    test_cors_preflight()
    test_process_pdf()
    test_ask_question()
    test_get_conversations()
    
    print("\nTest script completed!") 