# Lambda Functions

This directory contains all Lambda functions used in the AWS-Potato project. Each function is organized in its own directory with its dependencies and documentation.

## Directory Structure

```
lambda/
├── README.md              # This file
├── auth/                  # Authentication Lambda function
│   ├── README.md         # Auth function documentation
│   ├── auth.py           # Auth function code
│   └── requirements.txt   # Auth function dependencies
├── projects/              # Project management Lambda function
│   ├── README.md         # Projects function documentation
│   ├── projects.py       # Projects function code
│   └── requirements.txt   # Projects function dependencies
├── file-upload/           # File upload Lambda function
│   ├── README.md         # File upload function documentation
│   ├── file_upload.py    # File upload function code
│   └── requirements.txt   # File upload function dependencies
└── [future_lambdas]/     # Additional Lambda functions will be added here
```

## Available Functions

### 1. Authentication Lambda (`/auth`)
- Handles user authentication and registration
- Integrates with Amazon Cognito and RDS
- See `auth/README.md` for detailed documentation

### 2. Projects Lambda (`/projects`)
- Manages user projects and details
- Tracks user-project relationships
- Protected by Cognito authentication
- See `projects/README.md` for detailed documentation

### 3. File Upload Lambda (`/files`)
- Handles file uploads to S3
- Stores file metadata in RDS
- User-based access control
- Project-based file organization
- Protected by Cognito authentication
- See `file-upload/README.md` for detailed documentation

## Development Guidelines

When adding a new Lambda function:

1. Create a new directory for the function
2. Include a README.md with:
   - Function purpose and features
   - Required environment variables
   - API endpoints (if applicable)
   - Dependencies
   - Usage examples
3. Add a requirements.txt for Python dependencies
4. Follow the project's coding standards
5. Update this main README.md with the new function

## Deployment

All Lambda functions are deployed using AWS CDK. See the main project README for deployment instructions. 