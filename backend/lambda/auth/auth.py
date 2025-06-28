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
            create_user_in_db(username, email)
            
            # Get Cognito user details
            user_details = cognito.admin_get_user(
                UserPoolId=os.environ['USER_POOL_ID'],
                Username=username
            )
            cognito_sub = next((attr['Value'] for attr in user_details['UserAttributes'] if attr['Name'] == 'sub'), None)
            
            # Create user project
            project_response = create_user_project(username, email, cognito_sub)
            
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'message': 'User created successfully',
                    'username': username,
                    'project': json.loads(project_response.get('body', '{}'))
                })
            }
            
        elif action == 'signin':
            username = body.get('username')
            password = body.get('password')
            
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
            project_response = create_user_project(username, email, cognito_sub)
            
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'message': 'Authentication successful',
                    'tokens': response['AuthenticationResult'],
                    'project': json.loads(project_response.get('body', '{}'))
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