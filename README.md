# AWS-Potato 🥔

**Comprehensive Solution for Making Medical Reports Easy and Understandable**

AWS-Potato is a full-stack serverless application built on AWS that transforms complex medical reports into understandable insights using AI. The platform leverages AWS Lambda functions for processing, Amazon Cognito for authentication, S3 for storage, and Google's AI Studio for intelligent document analysis.

## 🏗️ Architecture Overview

### AWS Serverless Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   Next.js App  │────│   API Gateway    │────│   Lambda Functions │
│   (Frontend)    │    │   (REST API)     │    │   (Microservices)   │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
                                ▲                          │
                                │                          ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│  Amazon Cognito │    │     Amazon S3    │    │   Neon PostgreSQL   │
│ (Authentication)│    │  (File Storage)  │    │     (Database)      │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
                                ▲
                                │
                     ┌──────────────────┐
                     │  Google AI Studio│
                     │  (PDF Processing)│
                     └──────────────────┘
```

### Core AWS Services

- **AWS Lambda**: 4 serverless functions handling auth, projects, file upload, and PDF processing
- **Amazon API Gateway**: RESTful API with Cognito authorization
- **Amazon Cognito**: User authentication and authorization
- **Amazon S3**: Secure file storage with presigned URLs
- **AWS CDK**: Infrastructure as Code for deployment
- **AWS IAM**: Fine-grained permissions and security policies

## 🚀 Lambda Functions Architecture

### 1. Authentication Lambda (`/auth`)
- **Runtime**: Python 3.9
- **Timeout**: 30 seconds
- **Purpose**: User signup/signin with Cognito integration
- **Dependencies**: `boto3`, `psycopg2-binary`
- **AWS Services**: Cognito User Pool, RDS/Neon DB
- **Features**:
  - Cognito user pool management
  - Automatic project creation for new users
  - JWT token generation and validation

### 2. Projects Lambda (`/projects`)
- **Runtime**: Python 3.9  
- **Timeout**: 30 seconds
- **Purpose**: Project and user management
- **Dependencies**: `boto3`, `psycopg2-binary`
- **AWS Services**: RDS/Neon DB
- **Features**:
  - Project creation and listing
  - User-project relationship tracking
  - Protected by Cognito authorization

### 3. File Upload Lambda (`/file-upload`)
- **Runtime**: Python 3.9
- **Timeout**: 30 seconds
- **Purpose**: Secure file upload to S3
- **Dependencies**: `boto3`, `psycopg2-binary`
- **AWS Services**: S3, RDS/Neon DB
- **Features**:
  - Presigned URL generation for direct S3 uploads
  - File metadata storage and tracking
  - Base64 upload support (up to 6MB)
  - User-based access control
  - Automatic file organization by date

### 4. PDF Processor Lambda (`/pdf-processor`) ⭐
- **Runtime**: Python 3.9
- **Timeout**: 5 minutes (300 seconds)
- **Memory**: 1024 MB
- **Purpose**: AI-powered PDF analysis using Google's Gemini
- **Dependencies**: `boto3`, `psycopg2-binary`, `requests`
- **AWS Services**: S3, RDS/Neon DB
- **External Services**: Google AI Studio API
- **Features**:
  - **Direct URL Processing**: Sends PDF URLs to Google's Gemini model
  - **Ultra-lightweight**: Only ~14-23MB package size (90% smaller than traditional PDF libraries)
  - **gRPC-free**: Uses REST API calls to avoid AWS Lambda compatibility issues
  - **AI-powered Q&A**: Intelligent document analysis and conversation
  - **Conversation History**: Persistent chat sessions per PDF

## 🔐 Security & IAM Policies

### Lambda IAM Permissions
```yaml
Auth Lambda:
  - cognito-idp:AdminInitiateAuth
  - cognito-idp:AdminCreateUser
  - cognito-idp:AdminSetUserPassword
  - cognito-idp:AdminUpdateUserAttributes
  - cognito-idp:AdminGetUser
  - lambda:InvokeFunction (Projects Lambda)

File Upload Lambda:
  - s3:GetObject
  - s3:PutObject
  - s3:DeleteObject
  - s3:GetObjectVersion
  - s3:PutObjectAcl
  - s3:GetObjectAcl

PDF Processor Lambda:
  - s3:GetObject
  - s3:PutObject
  - s3:DeleteObject
  - s3:GetObjectVersion
```

### S3 Security Features
- **Encryption**: S3-managed encryption (AES256)
- **Versioning**: Enabled for data protection
- **Block Public Access**: All public access blocked
- **CORS**: Configured for secure frontend access
- **Presigned URLs**: Time-limited access (default 1 hour)

### Cognito Security
- **Password Policy**: 8+ chars, uppercase, lowercase, digits, symbols
- **Auto-verification**: Email verification required
- **JWT Tokens**: Short-lived access tokens with refresh capability
- **User Pool**: Isolated user management per environment

## 🛠️ Technology Stack

### Backend (AWS Serverless)
- **Language**: Python 3.9
- **Framework**: AWS Lambda + API Gateway
- **Database**: Neon PostgreSQL (serverless)
- **Storage**: Amazon S3
- **Authentication**: Amazon Cognito
- **Deployment**: AWS CDK (Infrastructure as Code)
- **AI Processing**: Google AI Studio (Gemini 1.5 Flash)

### Frontend (Modern Web)
- **Framework**: Next.js 15 with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **HTTP Client**: Axios with React Query
- **Icons**: Lucide React
- **Forms**: React Hook Form

## 📊 Database Schema

### Core Tables
```sql
-- Users table (managed by auth Lambda)
users (id, username, email, cognito_sub, created_at, updated_at)

-- Projects table (managed by projects Lambda)  
projects (id, project_id, name, created_at, updated_at)
user_details (id, user_id, project_id, email, cognito_sub, last_login)

-- Files table (managed by file-upload Lambda)
files (id, file_id, original_filename, s3_key, file_size, content_type, 
       project_id, user_id, user_email, upload_status, processing_status, 
       created_at, updated_at)

-- PDF Processing tables (managed by pdf-processor Lambda)
pdf_processing (id, processing_id, file_id, user_id, pdf_url, pdf_summary, 
                processing_status, created_at, updated_at)
pdf_conversations (id, processing_id, user_id, question, answer, created_at)
```

## 🚀 Getting Started

### Prerequisites
- AWS Account with appropriate permissions
- AWS CDK v2 installed
- Node.js 18+ and Python 3.9+
- Google AI Studio API key

### Backend Deployment

1. **Install dependencies**:
```bash
cd backend
pip install -r requirements.txt
```

2. **Configure environment**:
   - Set up Neon PostgreSQL database
   - Get Google AI Studio API key from https://aistudio.google.com
   - Update `backend_stack.py` with your API key

3. **Deploy infrastructure**:
```bash
cdk bootstrap  # First time only
cdk deploy
```

4. **Note the outputs**:
   - API Gateway URL
   - Cognito User Pool ID & Client ID
   - S3 Bucket name

### Frontend Setup

1. **Install dependencies**:
```bash
cd client
npm install
```

2. **Configure environment**:
   Create `.env.local` with your backend URLs and Cognito details

3. **Run development server**:
```bash
npm run dev
```

## 📝 API Documentation

### Authentication Endpoints
```bash
# Signup
POST /auth {"action": "signup", "username": "...", "email": "...", "password": "..."}

# Signin  
POST /auth {"action": "signin", "username": "...", "password": "..."}
```

### File Management Endpoints
```bash
# Generate upload URL
POST /file-upload {"action": "upload", "filename": "...", "content_type": "..."}

# Get file metadata
POST /file-upload {"action": "get", "file_id": "..."}

# List user files
POST /file-upload {"action": "list", "project_id": "..."}
```

### PDF Processing Endpoints ⭐
```bash
# Process PDF with AI
POST /pdf-processor {"action": "process_pdf", "file_id": "...", "signed_url": "..."}

# Ask questions about PDF
POST /pdf-processor {"action": "ask_question", "processing_id": "...", "question": "..."}

# Get conversation history
POST /pdf-processor {"action": "get_conversations", "processing_id": "..."}
```

## 🧪 Testing

### Postman Collection
Import `resources/AWS Potato API.postman_collection.json` for comprehensive API testing including:
- Authentication flows
- File upload workflows  
- PDF processing and Q&A
- Error handling scenarios

### Unit Tests
```bash
# Test PDF processor
cd backend/lambda/pdf-processor
python test_pdf_processor.py

# Test other lambdas individually
cd backend/lambda/{function-name}
python test_{function-name}.py
```

## 💡 Key Innovations

### 1. Ultra-Lightweight PDF Processing
- **Problem**: Traditional PDF libraries (PyMuPDF) exceed 250MB AWS Lambda limit
- **Solution**: Direct URL-based processing with Google's Gemini API
- **Result**: 90% size reduction (14-23MB vs 150-200MB)

### 2. gRPC-Free AI Integration
- **Problem**: Google's AI SDK uses gRPC which has compatibility issues in Lambda
- **Solution**: Direct REST API calls to Google AI Studio
- **Result**: Reliable, compatible AI processing without dependency issues

### 3. Serverless-First Architecture
- **Cost Optimization**: Pay-per-request Lambda pricing
- **Auto-scaling**: Automatic scaling based on demand
- **Zero Maintenance**: No server management required

### 4. Security-by-Design
- **Zero Trust**: Every request authenticated and authorized
- **Principle of Least Privilege**: Minimal IAM permissions
- **Data Isolation**: User data completely segregated

## 🔧 Configuration

### Environment Variables
```bash
# Auth Lambda
USER_POOL_ID=your-cognito-pool-id
CLIENT_ID=your-cognito-client-id
DATABASE_URL=your-neon-db-url
PROJECTS_LAMBDA_ARN=arn:aws:lambda:region:account:function:projects

# File Upload Lambda  
S3_BUCKET_NAME=your-s3-bucket
DATABASE_URL=your-neon-db-url

# PDF Processor Lambda
S3_BUCKET_NAME=your-s3-bucket
DATABASE_URL=your-neon-db-url
GOOGLE_AI_STUDIO_API_KEY=your-google-ai-key
```

## 📈 Performance & Scaling

### Lambda Performance
- **Cold Start**: ~1-2 seconds for most functions
- **PDF Processing**: Up to 5 minutes for large documents
- **Concurrent Executions**: AWS default limits (1000 per region)
- **Memory Optimization**: Right-sized for each function's workload

### Cost Optimization
- **Lambda**: Pay per 100ms execution time
- **S3**: Pay per GB stored + requests
- **API Gateway**: Pay per million API calls
- **Cognito**: First 50,000 MAUs free

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly (especially Lambda functions)
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [Google AI Studio](https://aistudio.google.com/)
- [Neon PostgreSQL](https://neon.tech/)

---

**Built with ❤️ using AWS Serverless Architecture**
