# Authentication Lambda Function

This Lambda function handles user authentication using Amazon Cognito and stores user data in Amazon RDS (PostgreSQL).

## API Endpoint

The function is exposed through API Gateway at:
```
POST /auth
```

No authorization is required for this endpoint as it handles the authentication process.

## Features

- User signup with email and username
- User signin with username/password
- Automatic user table creation in RDS
- Integration with Cognito User Pool
- Error handling and logging
- Automatic project creation for new users

## Environment Variables

The function expects the following environment variables:

- `USER_POOL_ID`: Cognito User Pool ID
- `CLIENT_ID`: Cognito App Client ID
- `DB_SECRET_ARN`: ARN of the RDS database secret in AWS Secrets Manager
- `DB_NAME`: Name of the PostgreSQL database
- `PROJECTS_LAMBDA_ARN`: ARN of the Projects Lambda function

## API Endpoints

### Signup
```json
POST /auth
{
    "action": "signup",
    "username": "user123",
    "email": "user@example.com",
    "password": "YourSecurePassword123!"
}

Response:
{
    "message": "User created successfully",
    "username": "user123",
    "project": {
        "project_id": "uuid",
        "user_id": "user123",
        "email": "user@example.com"
    }
}
```

### Signin
```json
POST /auth
{
    "action": "signin",
    "username": "user123",
    "password": "YourSecurePassword123!"
}

Response:
{
    "message": "Authentication successful",
    "tokens": {
        "AccessToken": "...",
        "IdToken": "...",
        "RefreshToken": "..."
    },
    "project": {
        "project_id": "uuid",
        "user_id": "user123",
        "email": "user@example.com"
    }
}
```

## Dependencies

Required Python packages:
- boto3: AWS SDK for Python
- psycopg2-binary: PostgreSQL database adapter

## Database Schema

The function automatically creates a `users` table with the following schema:

```sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

## Error Handling

The function handles various error scenarios:
- Invalid credentials
- User already exists
- Database connection issues
- Invalid request format
- Project creation failures

All errors are returned with appropriate HTTP status codes and error messages.

## CORS Support

The API endpoint supports CORS with the following configurations:
- Allowed Origins: All
- Allowed Methods: POST
- Allowed Headers: Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token 