# Projects Lambda Function

This Lambda function handles project creation and user details management. It automatically creates a new project for users upon signin and manages user-project relationships.

## API Endpoint

The function is exposed through API Gateway at:
```
POST /projects
```

This endpoint requires Cognito authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <IdToken>
```

## Features

- Automatic project creation for new users
- User details management
- Project-user relationship tracking
- Last login tracking
- Project listing for users
- Protected by Cognito authentication

## Environment Variables

The function expects the following environment variables:

- `DB_SECRET_ARN`: ARN of the RDS database secret in AWS Secrets Manager
- `DB_NAME`: Name of the PostgreSQL database

## API Endpoints

### Create Project
```json
POST /projects
Authorization: Bearer <IdToken>
{
    "action": "create_project",
    "user_id": "user123",
    "email": "user@example.com",
    "cognito_sub": "cognito-sub-id"  // optional
}

Response:
{
    "project_id": "uuid",
    "user_id": "user123",
    "email": "user@example.com"
}
```

### Get User Projects
```json
POST /projects
Authorization: Bearer <IdToken>
{
    "action": "get_projects",
    "user_id": "user123"
}

Response:
{
    "projects": [
        {
            "project_id": "uuid",
            "name": "Project-uuid",
            "created_at": "2024-03-20T12:00:00Z",
            "last_login": "2024-03-20T14:30:00Z"
        }
    ]
}
```

## Dependencies

Required Python packages:
- boto3: AWS SDK for Python
- psycopg2-binary: PostgreSQL database adapter

## Database Schema

### Projects Table
```sql
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(36) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### User Details Table
```sql
CREATE TABLE user_details (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    project_id VARCHAR(36) REFERENCES projects(project_id),
    cognito_sub VARCHAR(255) UNIQUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, project_id)
)
```

## Error Handling

The function handles various error scenarios:
- Missing required fields
- Database connection issues
- Invalid request format
- Database constraints violations
- Authentication/Authorization failures

All errors are returned with appropriate HTTP status codes and error messages.

## CORS Support

The API endpoint supports CORS with the following configurations:
- Allowed Origins: All
- Allowed Methods: POST
- Allowed Headers: Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token

## Authentication

This endpoint is protected by Cognito User Pool authentication. Clients must:
1. Obtain a JWT token through the /auth endpoint
2. Include the token in the Authorization header
3. Ensure the token is valid and not expired 