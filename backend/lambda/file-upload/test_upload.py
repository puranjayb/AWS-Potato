#!/usr/bin/env python3
"""
Test script for file upload Lambda function
Run this locally to test the file upload functionality
"""

import json
import base64
import requests
import os

# Configuration - Update these with your actual values
API_URL = "https://your-api-gateway-url.execute-api.region.amazonaws.com/prod"
ID_TOKEN = "your-cognito-id-token-here"  # Get this from your auth response

def test_base64_upload():
    """Test uploading a small file via base64"""
    print("=== Testing Base64 Upload ===")
    
    # Create a simple test file content
    test_content = "Hello World! This is a test file for upload."
    base64_content = base64.b64encode(test_content.encode()).decode()
    
    payload = {
        "action": "upload",
        "file_content": base64_content,
        "filename": "test-file.txt",
        "content_type": "text/plain"
    }
    
    headers = {
        "Authorization": f"Bearer {ID_TOKEN}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(f"{API_URL}/files", json=payload, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            return response.json().get('file_id')
        else:
            print(f"Upload failed: {response.text}")
            return None
            
    except Exception as e:
        print(f"Error during upload: {e}")
        return None

def test_presigned_url_upload():
    """Test generating presigned URL for upload"""
    print("\n=== Testing Presigned URL Upload ===")
    
    payload = {
        "action": "generate_upload_url",
        "filename": "large-test-file.txt",
        "content_type": "text/plain"
    }
    
    headers = {
        "Authorization": f"Bearer {ID_TOKEN}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(f"{API_URL}/files", json=payload, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            result = response.json()
            upload_url = result.get('upload_url')
            file_id = result.get('file_id')
            
            # Now upload directly to S3
            test_content = "This is a large test file uploaded via presigned URL."
            upload_response = requests.put(
                upload_url, 
                data=test_content.encode(),
                headers={"Content-Type": "text/plain"}
            )
            
            print(f"S3 Upload Status: {upload_response.status_code}")
            
            if upload_response.status_code == 200:
                # Confirm the upload
                confirm_payload = {
                    "action": "confirm_upload",
                    "file_id": file_id,
                    "file_size": len(test_content.encode())
                }
                
                confirm_response = requests.post(
                    f"{API_URL}/files", 
                    json=confirm_payload, 
                    headers=headers
                )
                
                print(f"Confirm Status: {confirm_response.status_code}")
                print(f"Confirm Response: {confirm_response.json()}")
                
                return file_id
            else:
                print(f"S3 upload failed: {upload_response.text}")
                return None
        else:
            print(f"Presigned URL generation failed: {response.text}")
            return None
            
    except Exception as e:
        print(f"Error during presigned URL upload: {e}")
        return None

def test_list_files():
    """Test listing files"""
    print("\n=== Testing List Files ===")
    
    payload = {
        "action": "list_files"
    }
    
    headers = {
        "Authorization": f"Bearer {ID_TOKEN}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(f"{API_URL}/files", json=payload, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
    except Exception as e:
        print(f"Error during list files: {e}")

def test_get_file(file_id):
    """Test getting file metadata"""
    print(f"\n=== Testing Get File: {file_id} ===")
    
    payload = {
        "action": "get_file",
        "file_id": file_id
    }
    
    headers = {
        "Authorization": f"Bearer {ID_TOKEN}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(f"{API_URL}/files", json=payload, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
    except Exception as e:
        print(f"Error during get file: {e}")

def test_download_url(file_id):
    """Test generating download URL"""
    print(f"\n=== Testing Download URL: {file_id} ===")
    
    payload = {
        "action": "generate_download_url",
        "file_id": file_id
    }
    
    headers = {
        "Authorization": f"Bearer {ID_TOKEN}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(f"{API_URL}/files", json=payload, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            download_url = response.json().get('download_url')
            # Test downloading the file
            download_response = requests.get(download_url)
            print(f"Download Status: {download_response.status_code}")
            print(f"Downloaded Content: {download_response.text[:100]}...")
        
    except Exception as e:
        print(f"Error during download URL generation: {e}")

def main():
    """Run all tests"""
    print("File Upload Test Suite")
    print("=====================")
    
    # Update these before running
    if API_URL == "https://your-api-gateway-url.execute-api.region.amazonaws.com/prod":
        print("❌ Please update API_URL in the script")
        return
    
    if ID_TOKEN == "your-cognito-id-token-here":
        print("❌ Please update ID_TOKEN in the script")
        print("   You can get this by:")
        print("   1. Sign in through your frontend")
        print("   2. Check browser dev tools > Network tab")
        print("   3. Copy the Authorization header value")
        return
    
    # Test base64 upload
    file_id1 = test_base64_upload()
    
    # Test presigned URL upload  
    file_id2 = test_presigned_url_upload()
    
    # Test listing files
    test_list_files()
    
    # Test getting file metadata
    if file_id1:
        test_get_file(file_id1)
        test_download_url(file_id1)
    
    if file_id2:
        test_get_file(file_id2)
        test_download_url(file_id2)

if __name__ == "__main__":
    main() 