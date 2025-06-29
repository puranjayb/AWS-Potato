#!/usr/bin/env python3
"""
Simplified AWS-Potato File Upload Testing Script

This script tests the simplified file upload API that only uses presigned URLs.
No more base64 encoding/decoding complexity!

Usage:
    python test_upload.py

Before running:
1. Set API_URL to your API Gateway endpoint
2. Set ID_TOKEN to your Cognito authentication token
"""

import requests
import json
import sys
import os
from pathlib import Path
import mimetypes

# Configuration
API_BASE_URL = "https://your-api-gateway-url.amazonaws.com/prod"  # Replace with your actual API URL
AUTH_TOKEN = "your-jwt-token"  # Replace with actual JWT token from signin

def get_content_type(filename):
    """Auto-detect content type from filename"""
    content_type, _ = mimetypes.guess_type(filename)
    return content_type or 'application/octet-stream'

def test_upload_workflow():
    """Test the complete file upload workflow"""
    
    # Test file path
    test_file = "test-document.txt"
    
    # Create test file if it doesn't exist
    if not os.path.exists(test_file):
        with open(test_file, 'w') as f:
            f.write("This is a test document for file upload testing.\n")
            f.write("Created by the AWS-Potato file upload test script.\n")
            f.write("Timestamp: " + str(os.time.time()) if hasattr(os, 'time') else "Unknown")
    
    file_size = os.path.getsize(test_file)
    content_type = get_content_type(test_file)
    
    print(f"Testing upload for: {test_file}")
    print(f"File size: {file_size} bytes")
    print(f"Detected content type: {content_type}")
    print("-" * 50)
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {AUTH_TOKEN}'
    }
    
    # Step 1: Get upload URL
    print("Step 1: Requesting upload URL...")
    upload_request = {
        "action": "upload",
        "filename": test_file,
        "content_type": content_type,  # Let the API auto-detect if not specified
        "project_id": "test-project"
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/file-upload",
            headers=headers,
            json=upload_request
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"Error: {response.text}")
            return False
            
        upload_data = response.json()
        print(f"Upload URL generated successfully!")
        print(f"File ID: {upload_data['file_id']}")
        print(f"Content Type: {upload_data.get('content_type', 'Not specified')}")
        
        # Step 2: Upload file to S3
        print("\nStep 2: Uploading file to S3...")
        upload_url = upload_data['upload_url']
        
        # Read file content
        with open(test_file, 'rb') as f:
            file_content = f.read()
        
        # Upload to S3 - don't specify Content-Type to avoid signature mismatch
        upload_headers = {}
        
        # Only set Content-Type if it's a specific type, otherwise let S3 detect
        if content_type and content_type != 'application/octet-stream':
            upload_headers['Content-Type'] = content_type
        
        s3_response = requests.put(
            upload_url,
            data=file_content,
            headers=upload_headers
        )
        
        print(f"S3 Upload Status Code: {s3_response.status_code}")
        
        if s3_response.status_code != 200:
            print(f"S3 Upload Error: {s3_response.text}")
            return False
            
        print("File uploaded to S3 successfully!")
        
        # Step 3: Confirm upload
        print("\nStep 3: Confirming upload...")
        confirm_request = {
            "action": "confirm",
            "file_id": upload_data['file_id'],
            "file_size": file_size
        }
        
        confirm_response = requests.post(
            f"{API_BASE_URL}/file-upload",
            headers=headers,
            json=confirm_request
        )
        
        print(f"Confirm Status Code: {confirm_response.status_code}")
        
        if confirm_response.status_code != 200:
            print(f"Confirm Error: {confirm_response.text}")
            return False
            
        confirm_data = confirm_response.json()
        print("Upload confirmed successfully!")
        print(f"File metadata: {json.dumps(confirm_data.get('file_metadata', {}), indent=2)}")
        
        # Step 4: Test download URL generation
        print("\nStep 4: Testing download URL generation...")
        download_request = {
            "action": "download",
            "file_id": upload_data['file_id']
        }
        
        download_response = requests.post(
            f"{API_BASE_URL}/file-upload",
            headers=headers,
            json=download_request
        )
        
        print(f"Download URL Status Code: {download_response.status_code}")
        
        if download_response.status_code == 200:
            download_data = download_response.json()
            print("Download URL generated successfully!")
            print(f"Download URL expires in: {download_data.get('expires_in')} seconds")
        else:
            print(f"Download URL Error: {download_response.text}")
        
        # Step 5: List files
        print("\nStep 5: Listing files...")
        list_request = {
            "action": "list"
        }
        
        list_response = requests.post(
            f"{API_BASE_URL}/file-upload",
            headers=headers,
            json=list_request
        )
        
        print(f"List Files Status Code: {list_response.status_code}")
        
        if list_response.status_code == 200:
            list_data = list_response.json()
            print(f"Found {len(list_data.get('files', []))} files")
            for file_info in list_data.get('files', []):
                print(f"  - {file_info.get('original_filename')} ({file_info.get('file_size')} bytes)")
        else:
            print(f"List Files Error: {list_response.text}")
        
        print("\n" + "="*50)
        print("Upload workflow completed successfully!")
        return True
        
    except Exception as e:
        print(f"Error during upload workflow: {str(e)}")
        return False

def main():
    """Main function"""
    print("AWS-Potato File Upload Test Script")
    print("="*50)
    
    if API_BASE_URL == "https://your-api-gateway-url.amazonaws.com/prod":
        print("⚠️  Please update API_BASE_URL with your actual API Gateway URL")
        return
        
    if AUTH_TOKEN == "your-jwt-token":
        print("⚠️  Please update AUTH_TOKEN with your actual JWT token")
        print("   You can get this by signing in through the auth API")
        return
    
    success = test_upload_workflow()
    
    if success:
        print("✅ All tests passed!")
        sys.exit(0)
    else:
        print("❌ Tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    main() 