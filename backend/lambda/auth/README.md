# Authentication Lambda Function

This Lambda function handles user authentication using Amazon Cognito and stores user data in Amazon RDS (PostgreSQL).

## Features

- User signup with email and username
- User signin with username/password
- Automatic user table creation in RDS
- Integration with Cognito User Pool
- Error handling and logging

## Environment Variables

The function expects the following environment variables:

- `USER_POOL_ID`: Cognito User Pool ID
- `CLIENT_ID`: Cognito App Client ID
- `DB_SECRET_ARN`: ARN of the RDS database secret in AWS Secrets Manager
- `DB_NAME`: Name of the PostgreSQL database

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
```

### Signin
```json
POST /auth
{
    "action": "signin",
    "username": "user123",
    "password": "YourSecurePassword123!"
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

All errors are returned with appropriate HTTP status codes and error messages. 