import json
import os
import boto3
import psycopg2
from botocore.exceptions import ClientError

# CORS headers for all responses
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
}

def get_db_connection():
    """Get Neon DB connection using DATABASE_URL environment variable"""
    try:
        database_url = os.environ['DATABASE_URL']
        conn = psycopg2.connect(database_url)
        return conn
    except Exception as e:
        print(f"Error connecting to Neon database: {str(e)}")
        raise e

def create_user_in_db(username, email):
    """Create user record in Neon DB"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Check if table exists, if not create it
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(255) UNIQUE NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Insert user
            cur.execute(
                "INSERT INTO users (username, email) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (username, email)
            )
            conn.commit()
    except Exception as e:
        print(f"Error creating user in database: {str(e)}")
        raise e
    finally:
        conn.close()

def create_user_project(user_id, email, cognito_sub=None):
    """Create a project for the user by calling the projects Lambda"""
    try:
        lambda_client = boto3.client('lambda')
        
        payload = {
            'body': json.dumps({
                'action': 'create_project',
                'user_id': user_id,
                'email': email,
                'cognito_sub': cognito_sub
            })
        }
        
        response = lambda_client.invoke(
            FunctionName=os.environ['PROJECTS_LAMBDA_ARN'],
            InvocationType='RequestResponse',
            Payload=json.dumps(payload)
        )
        
        result = json.loads(response['Payload'].read())
        return result
        
    except Exception as e:
        print(f"Error creating user project: {str(e)}")
        # Return a default response if project creation fails
        return {
            'statusCode': 200,
            'body': json.dumps({
                'project_id': 'default',
                'user_id': user_id,
                'email': email
            })
        }

def handler(event, context):
    """Main Lambda handler"""
    try:
        # Get Cognito client
        cognito = boto3.client('cognito-idp')
        
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        action = body.get('action')
        
        if action == 'signup':
            username = body.get('username')
            email = body.get('email')
            password = body.get('password')
            
            # Validate required fields
            if not username or not email or not password:
                return {
                    'statusCode': 400,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'error': 'Missing required fields',
                        'message': 'Username, email, and password are required'
                    })
                }
            
            # Basic validation
            if len(username.strip()) == 0 or len(email.strip()) == 0 or len(password.strip()) == 0:
                return {
                    'statusCode': 400,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'error': 'Invalid input',
                        'message': 'Username, email, and password cannot be empty'
                    })
                }
            
            # Create user in Cognito
            response = cognito.admin_create_user(
                UserPoolId=os.environ['USER_POOL_ID'],
                Username=username,
                UserAttributes=[
                    {'Name': 'email', 'Value': email},
                    {'Name': 'email_verified', 'Value': 'true'}
                ],
                MessageAction='SUPPRESS'
            )
            
            # Set password
            cognito.admin_set_user_password(
                UserPoolId=os.environ['USER_POOL_ID'],
                Username=username,
                Password=password,
                Permanent=True
            )
            
            # Create user record in Neon DB
            try:
                create_user_in_db(username, email)
            except Exception as db_error:
                print(f"Database user creation error (non-critical): {str(db_error)}")
                # Continue even if DB user creation fails
            
            # Get Cognito user details
            user_details = cognito.admin_get_user(
                UserPoolId=os.environ['USER_POOL_ID'],
                Username=username
            )
            cognito_sub = next((attr['Value'] for attr in user_details['UserAttributes'] if attr['Name'] == 'sub'), None)
            
            # Create user project
            try:
                project_response = create_user_project(username, email, cognito_sub)
                project_data = json.loads(project_response.get('body', '{}'))
            except Exception as project_error:
                print(f"Project creation error (non-critical): {str(project_error)}")
                project_data = {
                    'project_id': 'default',
                    'user_id': username,
                    'email': email,
                    'note': 'Project creation encountered an issue but user was created successfully'
                }
            
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'message': 'User created successfully',
                    'username': username,
                    'project': project_data
                })
            }
            
        elif action == 'signin':
            username = body.get('username')
            password = body.get('password')
            
            # Validate required fields
            if not username or not password:
                return {
                    'statusCode': 400,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'error': 'Missing required fields',
                        'message': 'Username and password are required'
                    })
                }
            
            # Basic validation
            if len(username.strip()) == 0 or len(password.strip()) == 0:
                return {
                    'statusCode': 400,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'error': 'Invalid input',
                        'message': 'Username and password cannot be empty'
                    })
                }
            
            # Authenticate with Cognito
            response = cognito.admin_initiate_auth(
                UserPoolId=os.environ['USER_POOL_ID'],
                ClientId=os.environ['CLIENT_ID'],
                AuthFlow='ADMIN_NO_SRP_AUTH',
                AuthParameters={
                    'USERNAME': username,
                    'PASSWORD': password
                }
            )
            
            # Get user details from Cognito
            user_details = cognito.admin_get_user(
                UserPoolId=os.environ['USER_POOL_ID'],
                Username=username
            )
            email = next((attr['Value'] for attr in user_details['UserAttributes'] if attr['Name'] == 'email'), None)
            cognito_sub = next((attr['Value'] for attr in user_details['UserAttributes'] if attr['Name'] == 'sub'), None)
            
            # Create or update user project (in case it's a returning user)
            try:
                project_response = create_user_project(username, email, cognito_sub)
                project_data = json.loads(project_response.get('body', '{}'))
            except Exception as project_error:
                print(f"Project update error during signin (non-critical): {str(project_error)}")
                project_data = {
                    'project_id': 'default',
                    'user_id': username,
                    'email': email,
                    'note': 'Project update encountered an issue but signin was successful'
                }
            
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'message': 'Authentication successful',
                    'tokens': response['AuthenticationResult'],
                    'project': project_data
                })
            }
        
        else:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'error': 'Invalid action',
                    'message': 'Supported actions: signup, signin'
                })
            }
            
    except cognito.exceptions.UsernameExistsException:
        return {
            'statusCode': 400,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'error': 'Username already exists',
                'message': 'Please choose a different username'
            })
        }
    except cognito.exceptions.NotAuthorizedException:
        return {
            'statusCode': 401,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'error': 'Authentication failed',
                'message': 'Invalid username or password'
            })
        }
    except cognito.exceptions.InvalidPasswordException as e:
        return {
            'statusCode': 400,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'error': 'Invalid password',
                'message': 'Password must be at least 8 characters with uppercase, lowercase, numbers, and symbols'
            })
        }
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        
        if 'InvalidPasswordException' in error_code or 'Password does not conform to policy' in error_message:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'error': 'Invalid password',
                    'message': 'Password must be at least 8 characters with uppercase, lowercase, numbers, and symbols'
                })
            }
        elif 'ValidationException' in error_code or 'Parameter validation failed' in error_message:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'error': 'Validation error',
                    'message': 'Please ensure all required fields are filled correctly'
                })
            }
        else:
            print(f"AWS ClientError: {error_code} - {error_message}")
            return {
                'statusCode': 500,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'error': 'Service Error',
                    'message': 'Unable to process request. Please try again.'
                })
            }
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'error': 'Internal Server Error',
                'message': str(e)
            })
        } 