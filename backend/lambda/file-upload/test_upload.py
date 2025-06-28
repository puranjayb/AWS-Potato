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
import os
import time

# Configuration - Update these values
API_URL = "https://your-api-gateway-url.execute-api.us-west-2.amazonaws.com/prod"
ID_TOKEN = "your-cognito-id-token-here"  # Get this from your frontend authentication

def test_simplified_upload():
    """Test the complete simplified upload workflow"""
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {ID_TOKEN}'
    }
    
    print("🚀 Starting Simplified File Upload Test")
    print("=" * 50)
    
    # Step 1: Generate upload URL
    print("1️⃣ Generating upload URL...")
    upload_payload = {
        "action": "upload",
        "filename": "test-document.txt",
        "content_type": "text/plain",
        "project_id": "test-project-123",
        "expiration": 3600
    }
    
    response = requests.post(f"{API_URL}/file-upload", headers=headers, json=upload_payload)
    print(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        print(f"❌ Failed to generate upload URL: {response.text}")
        return
    
    upload_data = response.json()
    file_id = upload_data['file_id']
    upload_url = upload_data['upload_url']
    
    print(f"✅ Upload URL generated successfully!")
    print(f"📁 File ID: {file_id}")
    print(f"🔗 Upload URL: {upload_url[:100]}...")
    
    # Step 2: Upload file content to S3
    print("\n2️⃣ Uploading file to S3...")
    file_content = "Hello World! This is a test file for the simplified AWS-Potato upload system."
    
    upload_headers = {
        'Content-Type': 'text/plain'
    }
    
    s3_response = requests.put(upload_url, data=file_content, headers=upload_headers)
    print(f"S3 Upload Status: {s3_response.status_code}")
    
    if s3_response.status_code != 200:
        print(f"❌ Failed to upload to S3: {s3_response.text}")
        return
    
    print("✅ File uploaded to S3 successfully!")
    
    # Step 3: Confirm upload
    print("\n3️⃣ Confirming upload...")
    confirm_payload = {
        "action": "confirm",
        "file_id": file_id,
        "file_size": len(file_content)
    }
    
    response = requests.post(f"{API_URL}/file-upload", headers=headers, json=confirm_payload)
    print(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        print(f"❌ Failed to confirm upload: {response.text}")
        return
    
    confirm_data = response.json()
    print("✅ Upload confirmed successfully!")
    print(f"📄 File metadata: {json.dumps(confirm_data['file_metadata'], indent=2)}")
    
    # Step 4: Get file metadata
    print("\n4️⃣ Getting file metadata...")
    get_payload = {
        "action": "get",
        "file_id": file_id
    }
    
    response = requests.post(f"{API_URL}/file-upload", headers=headers, json=get_payload)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        metadata = response.json()
        print("✅ File metadata retrieved:")
        print(f"📁 Filename: {metadata['original_filename']}")
        print(f"📊 Size: {metadata['file_size']} bytes")
        print(f"🏷️ Status: {metadata['upload_status']}")
    else:
        print(f"❌ Failed to get metadata: {response.text}")
    
    # Step 5: List files
    print("\n5️⃣ Listing files...")
    list_payload = {
        "action": "list"
    }
    
    response = requests.post(f"{API_URL}/file-upload", headers=headers, json=list_payload)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        files_data = response.json()
        print(f"✅ Found {len(files_data['files'])} files:")
        for i, file in enumerate(files_data['files'][:5], 1):  # Show first 5 files
            print(f"  {i}. {file['original_filename']} ({file['file_size']} bytes)")
    else:
        print(f"❌ Failed to list files: {response.text}")
    
    # Step 6: Generate download URL
    print("\n6️⃣ Generating download URL...")
    download_payload = {
        "action": "download",
        "file_id": file_id,
        "expiration": 3600
    }
    
    response = requests.post(f"{API_URL}/file-upload", headers=headers, json=download_payload)
    print(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        print(f"❌ Failed to generate download URL: {response.text}")
        return
    
    download_data = response.json()
    download_url = download_data['download_url']
    
    print("✅ Download URL generated successfully!")
    print(f"🔗 Download URL: {download_url[:100]}...")
    
    # Step 7: Download file content
    print("\n7️⃣ Downloading file content...")
    download_response = requests.get(download_url)
    print(f"Download Status: {download_response.status_code}")
    
    if download_response.status_code == 200:
        downloaded_content = download_response.text
        print("✅ File downloaded successfully!")
        print(f"📄 Content: {downloaded_content}")
        
        # Verify content matches
        if downloaded_content == file_content:
            print("🎉 Content verification successful! Upload-download cycle completed perfectly.")
        else:
            print("⚠️ Content mismatch detected!")
    else:
        print(f"❌ Failed to download file: {download_response.text}")
    
    print("\n" + "=" * 50)
    print("🏁 Test completed!")
    return file_id

def test_error_scenarios():
    """Test error handling scenarios"""
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {ID_TOKEN}'
    }
    
    print("\n🧪 Testing Error Scenarios")
    print("=" * 50)
    
    # Test invalid action
    print("1️⃣ Testing invalid action...")
    invalid_payload = {
        "action": "invalid_action"
    }
    
    response = requests.post(f"{API_URL}/file-upload", headers=headers, json=invalid_payload)
    print(f"Status: {response.status_code}")
    if response.status_code == 400:
        print("✅ Invalid action properly rejected")
    else:
        print(f"❌ Unexpected response: {response.text}")
    
    # Test missing filename
    print("\n2️⃣ Testing missing filename...")
    missing_filename = {
        "action": "upload",
        "content_type": "text/plain"
    }
    
    response = requests.post(f"{API_URL}/file-upload", headers=headers, json=missing_filename)
    print(f"Status: {response.status_code}")
    if response.status_code == 400:
        print("✅ Missing filename properly rejected")
    else:
        print(f"❌ Unexpected response: {response.text}")
    
    # Test invalid file_id
    print("\n3️⃣ Testing invalid file_id...")
    invalid_file_id = {
        "action": "get",
        "file_id": "invalid-file-id-12345"
    }
    
    response = requests.post(f"{API_URL}/file-upload", headers=headers, json=invalid_file_id)
    print(f"Status: {response.status_code}")
    if response.status_code == 404:
        print("✅ Invalid file_id properly rejected")
    else:
        print(f"❌ Unexpected response: {response.text}")

def main():
    """Main test function"""
    if API_URL == "https://your-api-gateway-url.execute-api.us-west-2.amazonaws.com/prod":
        print("❌ Please update API_URL in the script with your actual API Gateway URL")
        return
    
    if ID_TOKEN == "your-cognito-id-token-here":
        print("❌ Please update ID_TOKEN in the script with your actual Cognito ID token")
        return
    
    print("🎯 AWS-Potato Simplified File Upload Test")
    print(f"🌐 API URL: {API_URL}")
    print(f"🔑 Token: {ID_TOKEN[:20]}...")
    
    try:
        file_id = test_simplified_upload()
        test_error_scenarios()
        
        print(f"\n🎉 All tests completed!")
        if file_id:
            print(f"📁 Test file uploaded with ID: {file_id}")
            
    except Exception as e:
        print(f"💥 Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 