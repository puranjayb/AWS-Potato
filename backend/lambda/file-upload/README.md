# File Upload Lambda Function

This Lambda function handles file uploads to S3 and stores file metadata in Amazon RDS (PostgreSQL). It supports uploading files, retrieving file metadata, and listing user files.

## API Endpoint

The function is exposed through API Gateway at:
```
POST /files
```

This endpoint requires Cognito authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <IdToken>
```

## Features

- **Two upload methods:**
  - Base64 encoded file upload (up to 6MB)
  - Presigned URL upload (unlimited size, direct to S3)
- File upload to S3 with AES256 encryption
- File metadata storage in RDS PostgreSQL
- User-based file access control
- Project-based file organization
- File listing and retrieval
- Presigned URL generation for downloads
- Automatic file organization by date
- Upload status tracking (pending/uploaded)
- Stores user email from Cognito claims

## Environment Variables

The function expects the following environment variables:

- `DB_SECRET_ARN`: ARN of the RDS database secret in AWS Secrets Manager
- `DB_NAME`: Name of the PostgreSQL database
- `S3_BUCKET_NAME`: Name of the S3 bucket for file storage

## API Endpoints

### Upload File (Base64 - Limited to 6MB)
```json
POST /files
Authorization: Bearer <IdToken>
{
    "action": "upload",
    "file_content": "base64_encoded_file_content",
    "filename": "document.pdf",
    "content_type": "application/pdf",
    "project_id": "project-uuid"  // optional
}

Response:
{
    "message": "File uploaded successfully",
    "file_id": "file-uuid",
    "original_filename": "document.pdf",
    "file_size": 1024,
    "s3_key": "user123/2024/03/20/file-uuid_document.pdf",
    "user_email": "user@example.com"
}
```

### Generate Presigned Upload URL (Recommended for large files)
```json
POST /files
Authorization: Bearer <IdToken>
{
    "action": "generate_upload_url",
    "filename": "large-document.pdf",
    "content_type": "application/pdf",
    "project_id": "project-uuid",  // optional
    "expiration": 3600  // optional, default 1 hour
}

Response:
{
    "upload_url": "https://bucket.s3.amazonaws.com/user123/2024/03/20/uuid_large-document.pdf?X-Amz-...",
    "file_id": "file-uuid",
    "s3_key": "user123/2024/03/20/uuid_large-document.pdf",
    "expires_in": 3600,
    "method": "PUT"
}

// Frontend then uploads directly to S3:
PUT https://bucket.s3.amazonaws.com/user123/2024/03/20/uuid_large-document.pdf?X-Amz-...
Content-Type: application/pdf
[Binary file data]
```

### Confirm Upload (After using presigned URL)
```json
POST /files
Authorization: Bearer <IdToken>
{
    "action": "confirm_upload",
    "file_id": "file-uuid",
    "file_size": 50000000  // optional but recommended
}

Response:
{
    "message": "File upload confirmed successfully",
    "file_metadata": {
        "file_id": "file-uuid",
        "original_filename": "large-document.pdf",
        "s3_key": "user123/2024/03/20/uuid_large-document.pdf",
        "file_size": 50000000,
        "upload_status": "uploaded",
        // ... other metadata
    }
}
```

### Generate Presigned Download URL
```json
POST /files
Authorization: Bearer <IdToken>
{
    "action": "generate_download_url",
    "file_id": "file-uuid",
    "expiration": 3600  // optional, default 1 hour
}

Response:
{
    "download_url": "https://bucket.s3.amazonaws.com/user123/2024/03/20/uuid_document.pdf?X-Amz-...",
    "file_id": "file-uuid",
    "filename": "document.pdf",
    "expires_in": 3600
}
```

### Get File Metadata
```json
POST /files
Authorization: Bearer <IdToken>
{
    "action": "get_file",
    "file_id": "file-uuid"
}

Response:
{
    "file_id": "file-uuid",
    "original_filename": "document.pdf",
    "s3_key": "user123/2024/03/20/file-uuid_document.pdf",
    "file_size": 1024,
    "content_type": "application/pdf",
    "project_id": "project-uuid",
    "user_id": "user123",
    "user_email": "user@example.com",
    "upload_status": "uploaded",
    "processing_status": "pending",
    "created_at": "2024-03-20T12:00:00Z"
}
```

### List Files
```json
POST /files
Authorization: Bearer <IdToken>
{
    "action": "list_files",
    "project_id": "project-uuid"  // optional - filter by project
}

Response:
{
    "files": [
        {
            "file_id": "file-uuid",
            "original_filename": "document.pdf",
            "file_size": 1024,
            "content_type": "application/pdf",
            "user_email": "user@example.com",
            "upload_status": "uploaded",
            "processing_status": "completed",
            "created_at": "2024-03-20T12:00:00Z"
        }
    ]
}
```

## Dependencies

Required Python packages:
- boto3: AWS SDK for Python
- psycopg2-binary: PostgreSQL database adapter

## Database Schema

### Files Table
```sql
CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    file_id VARCHAR(36) UNIQUE NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    s3_key VARCHAR(512) NOT NULL,
    file_size BIGINT NOT NULL,
    content_type VARCHAR(100),
    project_id VARCHAR(36),
    user_id VARCHAR(255) NOT NULL,
    user_email VARCHAR(255),
    upload_status VARCHAR(50) DEFAULT 'uploaded',
    processing_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

## S3 Storage Structure

Files are organized in S3 with the following structure:
```
bucket-name/
├── user123/
│   ├── 2024/03/20/
│   │   ├── file-uuid1_document1.pdf
│   │   └── file-uuid2_image1.jpg
│   └── 2024/03/21/
│       └── file-uuid3_report.docx
└── user456/
    └── 2024/03/20/
        └── file-uuid4_data.csv
```

## Security Features

- Server-side encryption (AES256) for all uploaded files
- User-based access control (users can only access their own files)
- Project-based file organization
- JWT token validation through Cognito
- User email extraction from Cognito claims

## Upload Workflows

### Workflow 1: Base64 Upload (Small Files ≤ 6MB)
```
1. Frontend → Lambda: POST /files { action: "upload", file_content: "base64..." }
2. Lambda decodes base64 and uploads to S3
3. Lambda saves metadata to RDS
4. Lambda → Frontend: Success response with file metadata
```

### Workflow 2: Presigned URL Upload (Large Files, Recommended)
```
1. Frontend → Lambda: POST /files { action: "generate_upload_url", filename: "..." }
2. Lambda generates presigned URL and saves pending metadata
3. Lambda → Frontend: Presigned URL + file_id
4. Frontend → S3: PUT [presigned_url] with binary file data
5. Frontend → Lambda: POST /files { action: "confirm_upload", file_id: "..." }
6. Lambda updates file status to "uploaded"
```

### Workflow 3: File Download
```
1. Frontend → Lambda: POST /files { action: "generate_download_url", file_id: "..." }
2. Lambda validates user access and file status
3. Lambda → Frontend: Presigned download URL
4. Frontend → S3: GET [download_url] to download file
```

## Error Handling

The function handles various error scenarios:
- Invalid or missing authentication
- Missing required fields
- Invalid base64 file content
- S3 upload failures
- Database connection issues
- File not found or access denied
- File not ready for download (pending status)
- Expired presigned URLs

All errors are returned with appropriate HTTP status codes and error messages.

## File Size Limits

The current implementation supports files up to the Lambda payload limit (6MB for synchronous invocations). For larger files, consider implementing presigned URL uploads directly to S3.

## CORS Support

The API endpoint supports CORS with the following configurations:
- Allowed Origins: All
- Allowed Methods: POST
- Allowed Headers: Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token 