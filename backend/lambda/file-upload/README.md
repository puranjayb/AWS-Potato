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

- File upload to S3 with encryption
- File metadata storage in RDS
- User-based file access control
- Project-based file organization
- File listing and retrieval
- Base64 encoded file content support
- Automatic file organization by date
- Stores user email from Cognito claims

## Environment Variables

The function expects the following environment variables:

- `DB_SECRET_ARN`: ARN of the RDS database secret in AWS Secrets Manager
- `DB_NAME`: Name of the PostgreSQL database
- `S3_BUCKET_NAME`: Name of the S3 bucket for file storage

## API Endpoints

### Upload File
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

## Error Handling

The function handles various error scenarios:
- Invalid or missing authentication
- Missing required fields
- Invalid base64 file content
- S3 upload failures
- Database connection issues
- File not found or access denied

All errors are returned with appropriate HTTP status codes and error messages.

## File Size Limits

The current implementation supports files up to the Lambda payload limit (6MB for synchronous invocations). For larger files, consider implementing presigned URL uploads directly to S3.

## CORS Support

The API endpoint supports CORS with the following configurations:
- Allowed Origins: All
- Allowed Methods: POST
- Allowed Headers: Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token 