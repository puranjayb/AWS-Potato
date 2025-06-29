#!/usr/bin/env python3
"""
Debug script for troubleshooting S3 upload 403 errors
This script will help identify issues with presigned URL generation and upload process
"""

import requests
import json
import sys
import os
import time

# Configuration - Update these values
API_BASE_URL = "https://your-api-gateway-url.amazonaws.com/prod"
AUTH_TOKEN = "your-jwt-token"

def debug_upload_process():
    """Debug the complete upload process step by step"""
    
    print("🔍 AWS-Potato Upload Debug Tool")
    print("=" * 50)
    
    if API_BASE_URL == "https://your-api-gateway-url.amazonaws.com/prod":
        print("❌ Please update API_BASE_URL with your actual API Gateway URL")
        return False
        
    if AUTH_TOKEN == "your-jwt-token":
        print("❌ Please update AUTH_TOKEN with your actual JWT token")
        return False
    
    # Create a small test file
    test_content = b"Hello World! This is a test file for debugging upload issues."
    test_filename = "debug_test.txt"
    
    print(f"📄 Test file: {test_filename} ({len(test_content)} bytes)")
    print(f"🌐 API URL: {API_BASE_URL}")
    print(f"🔑 Token: {AUTH_TOKEN[:20]}...")
    print()
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {AUTH_TOKEN}'
    }
    
    try:
        # Step 1: Generate upload URL
        print("🔄 Step 1: Requesting upload URL...")
        upload_request = {
            "action": "upload",
            "filename": test_filename,
            "project_id": "debug-project"
        }
        
        response = requests.post(
            f"{API_BASE_URL}/file-upload",
            headers=headers,
            json=upload_request,
            timeout=30
        )
        
        print(f"   Status Code: {response.status_code}")
        print(f"   Response Headers: {dict(response.headers)}")
        
        if response.status_code != 200:
            print(f"❌ Upload URL request failed")
            print(f"   Response: {response.text}")
            return False
        
        upload_data = response.json()
        print(f"✅ Upload URL generated successfully!")
        print(f"   File ID: {upload_data.get('file_id')}")
        print(f"   Content Type: {upload_data.get('content_type')}")
        print(f"   Expires In: {upload_data.get('expires_in')} seconds")
        
        upload_url = upload_data.get('upload_url')
        if not upload_url:
            print("❌ No upload URL in response")
            return False
        
        print(f"   Upload URL: {upload_url[:100]}...")
        print()
        
        # Step 2: Analyze the presigned URL
        print("🔍 Step 2: Analyzing presigned URL...")
        from urllib.parse import urlparse, parse_qs
        
        parsed_url = urlparse(upload_url)
        query_params = parse_qs(parsed_url.query)
        
        print(f"   Bucket: {parsed_url.netloc.split('.')[0]}")
        print(f"   Key: {parsed_url.path[1:]}")  # Remove leading /
        print(f"   Algorithm: {query_params.get('X-Amz-Algorithm', ['Not set'])[0]}")
        print(f"   Credential: {query_params.get('X-Amz-Credential', ['Not set'])[0][:50]}...")
        print(f"   Date: {query_params.get('X-Amz-Date', ['Not set'])[0]}")
        print(f"   Expires: {query_params.get('X-Amz-Expires', ['Not set'])[0]} seconds")
        print(f"   SignedHeaders: {query_params.get('X-Amz-SignedHeaders', ['Not set'])[0]}")
        print()
        
        # Step 3: Test upload with minimal headers
        print("🔄 Step 3: Testing upload with minimal headers...")
        
        minimal_headers = {}  # No custom headers
        
        upload_response = requests.put(
            upload_url,
            data=test_content,
            headers=minimal_headers,
            timeout=30
        )
        
        print(f"   Upload Status Code: {upload_response.status_code}")
        print(f"   Upload Response Headers: {dict(upload_response.headers)}")
        
        if upload_response.status_code == 200:
            print("✅ Upload with minimal headers successful!")
        else:
            print(f"❌ Upload failed with minimal headers")
            print(f"   Response: {upload_response.text}")
            
            # Step 4: Try with Content-Type
            print("\n🔄 Step 4: Testing upload with Content-Type header...")
            
            content_type_headers = {
                'Content-Type': 'text/plain'
            }
            
            upload_response_2 = requests.put(
                upload_url,
                data=test_content,
                headers=content_type_headers,
                timeout=30
            )
            
            print(f"   Upload Status Code: {upload_response_2.status_code}")
            
            if upload_response_2.status_code == 200:
                print("✅ Upload with Content-Type successful!")
            else:
                print(f"❌ Upload with Content-Type also failed")
                print(f"   Response: {upload_response_2.text}")
                
                # Step 5: Try with curl-like headers
                print("\n🔄 Step 5: Testing with browser-like headers...")
                
                browser_headers = {
                    'User-Agent': 'Mozilla/5.0 (compatible; AWS-Potato-Debug)',
                    'Accept': '*/*',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive'
                }
                
                upload_response_3 = requests.put(
                    upload_url,
                    data=test_content,
                    headers=browser_headers,
                    timeout=30
                )
                
                print(f"   Upload Status Code: {upload_response_3.status_code}")
                
                if upload_response_3.status_code != 200:
                    print(f"❌ All upload attempts failed")
                    print(f"   Final Response: {upload_response_3.text}")
                    return False
                else:
                    print("✅ Upload with browser headers successful!")
        
        # Step 6: Verify upload worked
        print("\n🔄 Step 6: Verifying upload...")
        
        # Wait a moment for S3 consistency
        time.sleep(2)
        
        verify_request = {
            "action": "get",
            "file_id": upload_data.get('file_id')
        }
        
        verify_response = requests.post(
            f"{API_BASE_URL}/file-upload",
            headers=headers,
            json=verify_request,
            timeout=30
        )
        
        if verify_response.status_code == 200:
            file_info = verify_response.json()
            print(f"✅ File verification successful!")
            print(f"   Upload Status: {file_info.get('upload_status')}")
            print(f"   File Size: {file_info.get('file_size')} bytes")
        else:
            print(f"❌ File verification failed: {verify_response.status_code}")
        
        print("\n" + "=" * 50)
        print("🎉 Debug process completed!")
        return True
        
    except requests.exceptions.Timeout:
        print("❌ Request timed out - check your network connection")
        return False
    except requests.exceptions.ConnectionError:
        print("❌ Connection error - check your API URL")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def print_troubleshooting_tips():
    """Print troubleshooting tips for common issues"""
    print("\n🛠️  Troubleshooting Tips:")
    print("-" * 30)
    print("1. 403 Forbidden Errors:")
    print("   - Check Lambda function has S3 permissions")
    print("   - Verify presigned URL hasn't expired")
    print("   - Don't add custom headers that weren't in signature")
    print("   - Ensure bucket CORS policy allows your origin")
    print()
    print("2. Signature Mismatch:")
    print("   - Remove Content-Type header from frontend upload")
    print("   - Don't modify the presigned URL")
    print("   - Check file content matches exactly")
    print()
    print("3. CORS Issues:")
    print("   - Update S3 bucket CORS to allow your domain")
    print("   - Deploy CDK changes to update bucket configuration")
    print("   - Check browser developer tools for CORS errors")
    print()
    print("4. Frontend Integration:")
    print("   - Use: fetch(upload_url, { method: 'PUT', body: file })")
    print("   - Don't set: Content-Type, Authorization, or other headers")
    print("   - Handle 403 errors gracefully with retry logic")

if __name__ == "__main__":
    success = debug_upload_process()
    print_troubleshooting_tips()
    
    if success:
        print("\n✅ Debug completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Debug found issues that need to be resolved.")
        sys.exit(1) 