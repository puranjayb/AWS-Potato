# 📦 Postman Testing Guide for AWS-Potato Simplified File Upload API

## 🚀 Quick Setup

### 1. Import the Collection
1. Open Postman
2. Click **"Import"** (top-left)
3. Drag and drop `AWS-Potato-FileUpload.postman_collection.json`
4. Click **"Import"**

### 2. Configure Environment Variables
After importing, create or update environment variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `api_url` | `https://your-api-gateway-url.execute-api.us-west-2.amazonaws.com/prod` | Your API Gateway URL |
| `id_token` | `your-cognito-id-token` | Your authentication token |

**To set variables:**
1. Click the **environment dropdown** (top-right)
2. Click **"Manage Environments"**
3. Create new or edit existing environment
4. Add the variables above

## 🔑 Getting Your Credentials

### API URL
**Option 1 - AWS Console:**
1. Go to **AWS Console** → **API Gateway**
2. Find your API → **Stages** → **prod**
3. Copy the **Invoke URL**

**Option 2 - CDK Output:**
```bash
cd backend
aws cloudformation describe-stacks --stack-name BackendStack --query "Stacks[0].Outputs"
```

### ID Token
1. Sign in to your frontend application
2. Open **Browser Dev Tools** → **Network** tab
3. Make any API request
4. Look for **Authorization header**: `Bearer <token>`
5. Copy the token part (without "Bearer ")

## 🧪 Simplified Testing Workflow

**The new API uses only presigned URLs for all file uploads - no more base64 complexity!**

### Complete Upload Test (Recommended)
Run these requests in order:

1. **"1. Generate Upload URL"** - Get presigned S3 upload URL
2. **"2. Upload File to S3"** - Upload your file directly to S3
   - ⚠️ **Important**: Select file in Body → Binary or Raw
   - ⚠️ **Important**: Content-Type must match step 1
3. **"3. Confirm Upload"** - Mark upload as complete
4. **"4. Get File Metadata"** - Verify file details
5. **"5. List Files"** - See all your files
6. **"6. Generate Download URL"** - Get download link
7. **"7. Download File from S3"** - Test the download

## 📋 Request Details

### Authentication
All requests to `/file-upload` endpoint require:
```
Authorization: Bearer {{id_token}}
Content-Type: application/json
```

**Exception**: The actual S3 upload (step 2) requires NO authentication headers.

### 1. Generate Upload URL
```json
{
    "action": "upload",
    "filename": "document.pdf",
    "content_type": "application/pdf",
    "project_id": "optional-project-id",
    "expiration": 3600
}
```

**Response:**
```json
{
    "upload_url": "https://bucket.s3.amazonaws.com/...",
    "file_id": "uuid-here",
    "s3_key": "user123/2024/03/20/uuid_document.pdf",
    "expires_in": 3600,
    "method": "PUT",
    "instructions": "Upload your file to the upload_url using PUT method..."
}
```

### 2. Upload to S3
- **Method**: PUT
- **URL**: Use `{{upload_url}}` from step 1
- **Headers**: `Content-Type: application/pdf` (match your file type)
- **Body**: Binary (select your file) or Raw (paste content)
- **No Authorization header needed!**

### 3. Confirm Upload
```json
{
    "action": "confirm",
    "file_id": "{{file_id}}",
    "file_size": 1024000
}
```

### 4. Get File Metadata
```json
{
    "action": "get",
    "file_id": "{{file_id}}"
}
```

### 5. List Files
```json
{
    "action": "list",
    "project_id": "optional-project-filter"
}
```

### 6. Generate Download URL
```json
{
    "action": "download",
    "file_id": "{{file_id}}",
    "expiration": 3600
}
```

## ✅ Expected Responses

### Upload URL Generated
```json
{
    "upload_url": "https://aws-potato-bucket.s3.amazonaws.com/user123/2024/03/20/uuid_document.pdf?X-Amz-...",
    "file_id": "123e4567-e89b-12d3-a456-426614174000",
    "s3_key": "user123/2024/03/20/uuid_document.pdf",
    "expires_in": 3600,
    "method": "PUT",
    "instructions": "Upload your file to the upload_url using PUT method with the correct Content-Type header"
}
```

### Upload Confirmed
```json
{
    "message": "File upload confirmed successfully",
    "file_metadata": {
        "file_id": "123e4567-e89b-12d3-a456-426614174000",
        "original_filename": "document.pdf",
        "s3_key": "user123/2024/03/20/uuid_document.pdf",
        "file_size": 1024000,
        "content_type": "application/pdf",
        "project_id": "test-project",
        "user_id": "user123",
        "user_email": "user@example.com",
        "upload_status": "uploaded",
        "processing_status": "pending",
        "created_at": "2024-03-20T12:00:00.000Z"
    }
}
```

### File List
```json
{
    "files": [
        {
            "file_id": "123e4567-e89b-12d3-a456-426614174000",
            "original_filename": "document.pdf",
            "file_size": 1024000,
            "content_type": "application/pdf",
            "user_email": "user@example.com",
            "upload_status": "uploaded",
            "processing_status": "pending",
            "created_at": "2024-03-20T12:00:00.000Z"
        }
    ]
}
```

### Download URL
```json
{
    "download_url": "https://aws-potato-bucket.s3.amazonaws.com/user123/2024/03/20/uuid_document.pdf?X-Amz-...",
    "file_id": "123e4567-e89b-12d3-a456-426614174000",
    "filename": "document.pdf",
    "expires_in": 3600
}
```

## 🚨 Troubleshooting

### 401 Unauthorized
- ❌ **Problem**: Invalid or expired token
- ✅ **Solution**: 
  1. Get fresh token from your auth flow
  2. Update `id_token` environment variable
  3. Ensure token is valid JWT format

### 400 Bad Request - Invalid Action
- ❌ **Problem**: Using old action names
- ✅ **Solution**: Use new action names:
  - `upload` (not `generate_upload_url`)
  - `confirm` (not `confirm_upload`)
  - `get` (not `get_file`)
  - `list` (not `list_files`)
  - `download` (not `generate_download_url`)

### 400 Bad Request - Missing Fields
- ❌ **Problem**: Missing required fields
- ✅ **Solution**: 
  - `upload` action requires `filename`
  - `confirm` action requires `file_id`
  - `get` action requires `file_id`
  - `download` action requires `file_id`

### 403 Forbidden (S3 Upload)
- ❌ **Problem**: Content-Type mismatch or expired URL
- ✅ **Solution**: 
  1. Ensure Content-Type header matches exactly what was specified in step 1
  2. Generate new presigned URL if expired (default 1 hour)
  3. Check file selection in Body → Binary

### 404 File Not Found
- ❌ **Problem**: Using wrong file_id or file doesn't exist
- ✅ **Solution**: 
  1. Use `list` action to get valid file IDs
  2. Ensure upload was confirmed successfully
  3. Check user ownership (files are user-specific)

### CORS Errors (Browser Only)
- ❌ **Problem**: Should be fixed with current deployment
- ✅ **Solution**: 
  1. Ensure latest deployment completed
  2. Check CloudWatch logs for Lambda errors
  3. Verify API Gateway CORS configuration

## 🔧 Advanced Usage

### File Size Limits
- **Lambda**: No practical limit (using presigned URLs)
- **S3**: Up to 5TB per file
- **API Gateway**: 10MB payload limit (doesn't affect file uploads via presigned URLs)

### Custom File Types
Update Content-Type for different files:
- **Images**: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- **Documents**: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- **Archives**: `application/zip`, `application/x-tar`, `application/gzip`
- **Data**: `application/json`, `text/csv`, `application/xml`
- **Videos**: `video/mp4`, `video/quicktime`, `video/x-msvideo`
- **Audio**: `audio/mpeg`, `audio/wav`, `audio/ogg`

### Project Organization
- Use `project_id` to organize files by project
- Filter file listings by project
- Useful for multi-tenant applications

### Expiration Settings
- **Upload URLs**: Default 1 hour, max 7 days
- **Download URLs**: Default 1 hour, max 7 days
- Set longer expiration for large files: `"expiration": 7200`

## 📊 Performance & Best Practices

### ✅ Do's
1. **Always use presigned URLs** - More scalable and secure
2. **Set appropriate expiration times** - Longer for large files
3. **Include file_size in confirm** - Helps with validation
4. **Use proper Content-Type** - Enables proper browser handling
5. **Check upload_status** - Ensure files are fully uploaded before using

### ❌ Don'ts
1. **Don't hardcode tokens** - Use environment variables
2. **Don't ignore errors** - Check status codes and messages
3. **Don't skip confirmation** - Always confirm uploads
4. **Don't use expired URLs** - Generate fresh ones when needed

## 🎯 Quick Test Commands (cURL)

### Generate Upload URL
```bash
curl -X POST "{{api_url}}/file-upload" \
  -H "Authorization: Bearer {{id_token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "upload",
    "filename": "test.txt",
    "content_type": "text/plain"
  }'
```

### Upload File to S3
```bash
curl -X PUT "{{upload_url}}" \
  -H "Content-Type: text/plain" \
  -d "Hello World! This is test content."
```

### Confirm Upload
```bash
curl -X POST "{{api_url}}/file-upload" \
  -H "Authorization: Bearer {{id_token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "confirm",
    "file_id": "{{file_id}}",
    "file_size": 32
  }'
```

### List Files
```bash
curl -X POST "{{api_url}}/file-upload" \
  -H "Authorization: Bearer {{id_token}}" \
  -H "Content-Type: application/json" \
  -d '{"action": "list"}'
```

## 📝 Collection Features

The Postman collection includes:

### Auto-Variable Management
- `upload_url` - Automatically saved from "Generate Upload URL"
- `file_id` - Automatically saved from "Generate Upload URL"
- `download_url` - Automatically saved from "Generate Download URL"

### Test Scripts
- ✅ Status code validation
- ✅ Response structure validation
- ✅ Automatic variable extraction
- ✅ Console logging for debugging

### Request Examples
- 📁 Complete workflow example
- 📊 Response validation
- 🔧 Error handling examples

## 🔍 Debugging Tips

### CloudWatch Logs
1. Go to **AWS Console** → **CloudWatch** → **Log groups**
2. Find `/aws/lambda/BackendStack-FileUploadFunction-...`
3. View recent log streams for detailed execution info

### Common Issues
- **"User not authenticated"**: Check ID token format and expiration
- **"Invalid action"**: Use new simplified action names
- **"File too large"**: No size limit with presigned URLs
- **"Access denied"**: Check user permissions and file ownership

### Success Indicators
- ✅ Upload URL generated with 200 status
- ✅ S3 upload returns 200 status
- ✅ Confirm returns file metadata
- ✅ File appears in list with "uploaded" status

## 🎉 What's New in Simplified API

### ✨ Improvements
- **Removed base64 complexity** - Only presigned URLs now
- **Cleaner action names** - `upload`, `confirm`, `get`, `list`, `download`
- **Better error messages** - More descriptive and helpful
- **Simplified workflow** - Fewer steps, clearer process
- **No file size limits** - Handle files of any size
- **Better performance** - Direct S3 uploads

### 🔄 Migration from Old API
- Change endpoint: `/files` → `/file-upload`
- Update action names:
  - `generate_upload_url` → `upload`
  - `confirm_upload` → `confirm`
  - `get_file` → `get`
  - `list_files` → `list`
  - `generate_download_url` → `download`
- Remove base64 upload requests (no longer supported)

**Happy Testing with the Simplified API!** 🎉 