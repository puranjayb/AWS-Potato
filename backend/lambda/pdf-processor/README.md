# PDF Processor Lambda

This Lambda function processes PDFs using Google's AI Studio Gemini model with multimodal capabilities. Instead of extracting text locally, it sends PDF URLs directly to Gemini for analysis, significantly reducing package size and leveraging superior AI capabilities.

## Features

- **Direct PDF Processing**: Sends PDF URLs directly to Google's Gemini model
- **AI-Powered Q&A**: Uses Google's AI Studio Gemini 1.5 Flash for intelligent document analysis
- **Conversation History**: Stores and retrieves conversation history for each PDF
- **Lightweight Architecture**: No local PDF processing libraries needed
- **Secure Access**: User authentication and authorization using Cognito

## API Endpoints

### Process PDF
```
POST /pdf-processor
{
  "action": "process_pdf",
  "file_id": "uuid-of-file",
  "signed_url": "https://s3-signed-url-or-s3-key"
}
```

**Response:**
```json
{
  "message": "PDF processed successfully",
  "processing_id": "uuid-of-processing-session",
  "summary": "AI-generated summary of PDF content...",
  "status": "completed"
}
```

### Ask Question
```
POST /pdf-processor
{
  "action": "ask_question",
  "processing_id": "uuid-of-processing-session",
  "question": "What is the main topic of this document?"
}
```

**Response:**
```json
{
  "processing_id": "uuid-of-processing-session",
  "question": "What is the main topic of this document?",
  "answer": "Based on the PDF content, the main topic is...",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Get Conversation History
```
POST /pdf-processor
{
  "action": "get_conversations",
  "processing_id": "uuid-of-processing-session"
}
```

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string for Neon DB
- `S3_BUCKET_NAME`: S3 bucket name for file storage
- `GOOGLE_AI_STUDIO_API_KEY`: Google AI Studio API key (get from https://aistudio.google.com)

## Dependencies

- `boto3`: AWS SDK for Python
- `psycopg2-binary`: PostgreSQL adapter
- `google-generativeai`: Google AI Studio client library
- `requests`: HTTP library

**Package Size**: ~20-30MB (vs 150-200MB with local PDF processing)

## Database Tables

### pdf_processing
- `processing_id`: Unique identifier for processing session
- `file_id`: Reference to file in file storage
- `user_id`: User who owns the processing session
- `pdf_url`: S3 URL for PDF access by Gemini
- `pdf_summary`: AI-generated summary of PDF content
- `processing_status`: Status of processing (pending, completed, failed)

### pdf_conversations
- `processing_id`: Reference to processing session
- `question`: User's question
- `answer`: AI-generated answer
- `timestamp`: When the conversation occurred

## Usage Flow

1. User uploads a PDF file (handled by file-upload lambda)
2. User calls `process_pdf` with file_id and signed_url
3. Lambda generates accessible S3 URL and sends to Gemini for analysis
4. Gemini analyzes PDF and returns summary
5. Lambda stores PDF URL and summary in database
6. User can ask questions using `ask_question` action
7. Lambda sends question and PDF URL to Gemini for direct analysis
8. Conversation history is maintained and can be retrieved

## Architecture Benefits

### Reduced Package Size
- No heavy PDF processing libraries (PyMuPDF, pdfplumber, etc.)
- Package size reduced from ~150-200MB to ~20-30MB
- Faster cold starts and deployment

### Superior Processing
- Leverages Gemini's multimodal capabilities
- Better understanding of document structure, images, tables
- More accurate text extraction and analysis

### Simplified Maintenance
- No local PDF processing code to maintain
- Relies on Google's continuously improving AI models
- Reduced error handling for text extraction edge cases

## Error Handling

The lambda includes comprehensive error handling for:
- Missing or invalid parameters
- PDF URL generation failures
- Database connection issues
- Google AI Studio API errors
- Authentication/authorization failures
- Gemini file upload/processing errors

## Security

- User authentication via Cognito
- Access control ensures users can only access their own processing sessions
- Database queries use parameterized statements to prevent SQL injection
- Google AI Studio API key securely stored as environment variable
- PDF URLs are time-limited presigned URLs

## Testing

Run the test suite:
```bash
python test_pdf_processor.py
```

See `test_pdf_processor.py` for comprehensive unit tests covering all endpoints and error scenarios. 