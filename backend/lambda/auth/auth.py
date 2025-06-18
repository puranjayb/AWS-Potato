import json
import os
import boto3
import psycopg2
from botocore.exceptions import ClientError

def get_db_connection():
    """Get RDS connection using the secret from Secrets Manager"""
    client = boto3.client('secretsmanager')
    try:
        secret_value = client.get_secret_value(SecretId=os.environ['DB_SECRET_ARN'])
        secret = json.loads(secret_value['SecretString'])
        
        conn = psycopg2.connect(
            host=secret['host'],
            port=secret['port'],
            database=os.environ['DB_NAME'],
            user=secret['username'],
            password=secret['password']
        )
        return conn
    except Exception as e:
        print(f"Error connecting to database: {str(e)}")
        raise e

def create_user_in_db(username, email):
    """Create user record in RDS"""
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

def create_user_project(username, email, cognito_sub):
    """Create a project for the user using the projects Lambda"""
    lambda_client = boto3.client('lambda')
    try:
        payload = {
            'body': json.dumps({
                'action': 'create_project',
                'user_id': username,
                'email': email,
                'cognito_sub': cognito_sub
            })
        }
        
        response = lambda_client.invoke(
            FunctionName=os.environ['PROJECTS_LAMBDA_ARN'],
            InvocationType='RequestResponse',
            Payload=json.dumps(payload)
        )
        
        response_payload = json.loads(response['Payload'].read().decode('utf-8'))
        return response_payload
        
    except Exception as e:
        print(f"Error creating user project: {str(e)}")
        raise e

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
            
            # Create user record in RDS
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
                'body': json.dumps({
                    'message': 'User created successfully',
                    'username': username,
                    'project': json.loads(project_response.get('body', '{}'))
                })
            }
            
        elif action == 'signin':
            username = body.get('username')
            password = body.get('password')
            
            # Authenticate user
            auth_response = cognito.admin_initiate_auth(
                UserPoolId=os.environ['USER_POOL_ID'],
                ClientId=os.environ['CLIENT_ID'],
                AuthFlow='ADMIN_NO_SRP_AUTH',
                AuthParameters={
                    'USERNAME': username,
                    'PASSWORD': password
                }
            )
            
            # Get user details
            user_details = cognito.admin_get_user(
                UserPoolId=os.environ['USER_POOL_ID'],
                Username=username
            )
            
            email = next((attr['Value'] for attr in user_details['UserAttributes'] if attr['Name'] == 'email'), None)
            cognito_sub = next((attr['Value'] for attr in user_details['UserAttributes'] if attr['Name'] == 'sub'), None)
            
            # Create or update user project
            project_response = create_user_project(username, email, cognito_sub)
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'Authentication successful',
                    'tokens': auth_response['AuthenticationResult'],
                    'project': json.loads(project_response.get('body', '{}'))
                })
            }
            
        else:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'message': 'Invalid action'
                })
            }
            
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        
        return {
            'statusCode': 400,
            'body': json.dumps({
                'error': error_code,
                'message': error_message
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Internal Server Error',
                'message': str(e)
            })
        } 