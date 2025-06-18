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
└── [future_lambdas]/     # Additional Lambda functions will be added here
```

## Available Functions

### 1. Authentication Lambda (`/auth`)
- Handles user authentication and registration
- Integrates with Amazon Cognito and RDS
- See `auth/README.md` for detailed documentation

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