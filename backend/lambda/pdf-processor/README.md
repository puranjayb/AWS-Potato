# PDF Processor Lambda

This Lambda function processes PDFs using Google's Vertex AI Agent Development Kit and allows users to ask questions about the PDF content.

## Features

- **PDF Text Extraction**: Extracts text content from PDF files using PyMuPDF
- **AI-Powered Q&A**: Uses Google's AI Studio Gemini model to answer questions about PDF content
- **Conversation History**: Stores and retrieves conversation history for each PDF
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

### Ask Question
```
POST /pdf-processor
{
  "action": "ask_question",
  "processing_id": "uuid-of-processing-session",
  "question": "What is the main topic of this document?"
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
- `PyMuPDF`: PDF processing library
- `requests`: HTTP library

## Database Tables

### pdf_processing
- `processing_id`: Unique identifier for processing session
- `file_id`: Reference to file in file storage
- `user_id`: User who owns the processing session
- `pdf_text`: Extracted text content from PDF
- `processing_status`: Status of processing (pending, completed, failed)
- `agent_session_id`: Optional agent session identifier

### pdf_conversations
- `processing_id`: Reference to processing session
- `question`: User's question
- `answer`: AI-generated answer
- `timestamp`: When the conversation occurred

## Usage Flow

1. User uploads a PDF file (handled by file-upload lambda)
2. User calls `process_pdf` with file_id and signed_url
3. Lambda downloads PDF from S3, extracts text, and stores in database
4. User can ask questions using `ask_question` action
5. Lambda uses Google AI Studio to generate answers based on PDF content
6. Conversation history is maintained and can be retrieved

## Error Handling

The lambda includes comprehensive error handling for:
- Missing or invalid parameters
- PDF processing failures
- Database connection issues
- Google AI Studio API errors
- Authentication/authorization failures

## Security

- User authentication via Cognito
- Access control ensures users can only access their own processing sessions
- Database queries use parameterized statements to prevent SQL injection
- Google AI Studio API key securely stored as environment variable 