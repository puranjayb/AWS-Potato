import json
import os
import boto3
import psycopg2
import uuid
from datetime import datetime
from botocore.exceptions import ClientError

# CORS headers for all responses
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
}

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

def create_tables(conn):
    """Create necessary tables if they don't exist"""
    try:
        with conn.cursor() as cur:
            # Create projects table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS projects (
                    id SERIAL PRIMARY KEY,
                    project_id VARCHAR(36) UNIQUE NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create user_details table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS user_details (
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
            """)
            
            conn.commit()
    except Exception as e:
        print(f"Error creating tables: {str(e)}")
        raise e

def create_or_update_user_project(user_id, email, cognito_sub=None):
    """Create or update user project and details"""
    conn = get_db_connection()
    try:
        create_tables(conn)
        
        with conn.cursor() as cur:
            # Generate a new project_id
            project_id = str(uuid.uuid4())
            
            # Create new project
            cur.execute(
                """
                INSERT INTO projects (project_id, name)
                VALUES (%s, %s)
                RETURNING project_id
                """,
                (project_id, f"Project-{project_id[:8]}")
            )
            
            # Create or update user details
            cur.execute(
                """
                INSERT INTO user_details (user_id, email, project_id, cognito_sub, last_login)
                VALUES (%s, %s, %s, %s, NOW())
                ON CONFLICT (user_id, project_id)
                DO UPDATE SET
                    last_login = NOW(),
                    updated_at = NOW()
                RETURNING id
                """,
                (user_id, email, project_id, cognito_sub)
            )
            
            conn.commit()
            
            return {
                'project_id': project_id,
                'user_id': user_id,
                'email': email
            }
            
    except Exception as e:
        print(f"Error creating/updating user project: {str(e)}")
        raise e
    finally:
        conn.close()

def get_user_projects(user_id):
    """Get all projects associated with a user"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT p.project_id, p.name, p.created_at, ud.last_login
                FROM projects p
                JOIN user_details ud ON p.project_id = ud.project_id
                WHERE ud.user_id = %s
                ORDER BY ud.last_login DESC
                """,
                (user_id,)
            )
            
            projects = []
            for row in cur.fetchall():
                projects.append({
                    'project_id': row[0],
                    'name': row[1],
                    'created_at': row[2].isoformat(),
                    'last_login': row[3].isoformat() if row[3] else None
                })
                
            return projects
            
    except Exception as e:
        print(f"Error fetching user projects: {str(e)}")
        raise e
    finally:
        conn.close()

def handler(event, context):
    """Main Lambda handler"""
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        action = body.get('action')
        
        if action == 'create_project':
            user_id = body.get('user_id')
            email = body.get('email')
            cognito_sub = body.get('cognito_sub')
            
            if not user_id or not email:
                return {
                    'statusCode': 400,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'error': 'Missing required fields',
                        'message': 'user_id and email are required'
                    })
                }
            
            result = create_or_update_user_project(user_id, email, cognito_sub)
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps(result)
            }
            
        elif action == 'get_projects':
            user_id = body.get('user_id')
            
            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'error': 'Missing required fields',
                        'message': 'user_id is required'
                    })
                }
            
            projects = get_user_projects(user_id)
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'projects': projects
                })
            }
            
        else:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'error': 'Invalid action',
                    'message': 'Supported actions: create_project, get_projects'
                })
            }
            
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'error': 'Internal Server Error',
                'message': str(e)
            })
        } 