# 📦 Postman Testing Guide for AWS-Potato File Upload API

## 🚀 Quick Setup

### 1. Import the Collection
1. Open Postman
2. Click **"Import"** (top-left)
3. Drag and drop `AWS-Potato-FileUpload.postman_collection.json`
4. Click **"Import"**

### 2. Configure Variables
After importing, click on the collection name and go to the **"Variables"** tab:

| Variable | Value | Description |
|----------|-------|-------------|
| `api_url` | `https://your-api-gateway-url.execute-api.us-west-2.amazonaws.com/prod` | Your API Gateway URL |
| `id_token` | `your-cognito-id-token` | Your authentication token |
| `project_id` | `test-project-123` | Optional project ID |

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

## 🧪 Testing Workflows

### Workflow 1: Small File Upload (≤4.5MB)
**Perfect for testing and small files**

1. **"Test Authentication"** - Verify your setup
2. **"Base64 Upload"** - Upload a small test file
3. **"List All Files"** - Verify file appears
4. **"Get File Metadata"** - Check file details
5. **"Generate Download URL"** - Get download link

### Workflow 2: Large File Upload (>4.5MB)
**Recommended for production and large files**

1. **"Test Authentication"** - Verify your setup
2. **"Generate Presigned Upload URL"** - Get S3 upload URL
3. **"Upload to S3"** - Upload your file directly to S3
   - ⚠️ **Important**: Select file in Body → Binary
   - ⚠️ **Important**: Content-Type must match step 2
4. **"Confirm Upload"** - Mark upload as complete
5. **"List All Files"** - Verify file appears
6. **"Generate Download URL"** - Get download link

## 📋 Request Details

### Authentication
All requests except "Upload to S3" require:
```
Authorization: Bearer {{id_token}}
Content-Type: application/json
```

### Base64 Upload
```json
{
    "action": "upload",
    "file_content": "SGVsbG8gV29ybGQ=",  // base64 encoded content
    "filename": "test.txt",
    "content_type": "text/plain",
    "project_id": "optional"
}
```

**To encode your file:**
```bash
# Mac/Linux
base64 -i yourfile.txt

# Or use online base64 encoder
```

### Generate Presigned URL
```json
{
    "action": "generate_upload_url",
    "filename": "document.pdf",
    "content_type": "application/pdf",
    "project_id": "optional",
    "expiration": 3600
}
```

### Upload to S3
- **Method**: PUT
- **URL**: Use `{{upload_url}}` from previous step
- **Headers**: `Content-Type: application/pdf` (match your file type)
- **Body**: Binary (select your file)
- **No Authorization header needed!**

### Confirm Upload
```json
{
    "action": "confirm_upload",
    "file_id": "{{file_id}}",
    "file_size": 1024000  // optional but recommended
}
```

## ✅ Expected Responses

### Successful Upload
```json
{
    "message": "File uploaded successfully",
    "file_id": "uuid-here",
    "original_filename": "test.txt",
    "file_size": 43,
    "s3_key": "user123/2024/03/20/uuid_test.txt",
    "user_email": "user@example.com"
}
```

### File List
```json
{
    "files": [
        {
            "file_id": "uuid",
            "original_filename": "test.txt",
            "file_size": 43,
            "content_type": "text/plain",
            "upload_status": "uploaded",
            "created_at": "2024-03-20T12:00:00Z"
        }
    ]
}
```

### Download URL
```json
{
    "download_url": "https://bucket.s3.amazonaws.com/path/file?X-Amz-...",
    "file_id": "uuid",
    "filename": "test.txt",
    "expires_in": 3600
}
```

## 🚨 Troubleshooting

### 401 Unauthorized
- ❌ **Problem**: Invalid or expired token
- ✅ **Solution**: 
  1. Get fresh token from your auth flow
  2. Update `id_token` variable
  3. Run "Test Authentication" first

### 403 Forbidden (S3 Upload)
- ❌ **Problem**: Content-Type mismatch or expired URL
- ✅ **Solution**: 
  1. Ensure Content-Type header matches exactly
  2. Generate new presigned URL if expired
  3. Check file selection in Body → Binary

### 400 Bad Request
- ❌ **Problem**: Missing required fields or invalid data
- ✅ **Solution**: 
  1. Check request body matches examples
  2. Verify all required fields are present
  3. Check file_content is valid base64

### CORS Errors
- ❌ **Problem**: Should be fixed now
- ✅ **Solution**: 
  1. Ensure deployment completed
  2. Check CloudWatch logs for errors
  3. Verify API Gateway CORS configuration

### File Not Found
- ❌ **Problem**: Using wrong file_id or file doesn't exist
- ✅ **Solution**: 
  1. Use "List All Files" to get valid file IDs
  2. Ensure upload completed successfully
  3. Check user ownership

## 🔧 Advanced Testing

### Custom File Types
Update the Content-Type for different files:
- **Images**: `image/jpeg`, `image/png`, `image/gif`
- **Documents**: `application/pdf`, `application/msword`
- **Archives**: `application/zip`, `application/x-tar`
- **Data**: `application/json`, `text/csv`

### Large File Testing
1. Use "Generate Presigned Upload URL"
2. Set longer expiration: `"expiration": 7200` (2 hours)
3. Upload files up to 5GB (S3 limit)

### Project Organization
- Set different `project_id` values to organize files
- Use "List Files by Project" (custom request)

## 📊 Performance Tips

1. **For files ≤4.5MB**: Use Base64 upload (simpler)
2. **For files >4.5MB**: Use Presigned URL (required)
3. **For production**: Always use Presigned URL (better performance)
4. **Monitoring**: Check CloudWatch logs for detailed execution info

## 🎯 Quick Test Commands

### Test Authentication
```bash
curl -X POST "{{api_url}}/files" \
  -H "Authorization: Bearer {{id_token}}" \
  -H "Content-Type: application/json" \
  -d '{"action": "list_files"}'
```

### Test Base64 Upload
```bash
curl -X POST "{{api_url}}/files" \
  -H "Authorization: Bearer {{id_token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "upload",
    "file_content": "SGVsbG8gV29ybGQ=",
    "filename": "test.txt",
    "content_type": "text/plain"
  }'
```

## 📝 Notes

- The collection automatically saves `file_id` and `upload_url` variables
- Files are organized by user and date in S3: `user123/2024/03/20/uuid_filename.ext`
- All responses include CORS headers for browser compatibility
- File metadata includes upload status, processing status, and timestamps
- Download URLs expire after specified time (default 1 hour)

**Happy Testing!** 🎉 