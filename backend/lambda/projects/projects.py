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
    """Get Neon DB connection using DATABASE_URL environment variable"""
    try:
        database_url = os.environ['DATABASE_URL']
        conn = psycopg2.connect(database_url)
        return conn
    except Exception as e:
        print(f"Error connecting to Neon database: {str(e)}")
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
            # First, check if user already has a project
            if cognito_sub:
                cur.execute(
                    "SELECT project_id, user_id, email FROM user_details WHERE cognito_sub = %s",
                    (cognito_sub,)
                )
                existing_user = cur.fetchone()
                
                if existing_user:
                    # Update last login for existing user
                    cur.execute(
                        """
                        UPDATE user_details 
                        SET last_login = NOW(), updated_at = NOW() 
                        WHERE cognito_sub = %s
                        """,
                        (cognito_sub,)
                    )
                    conn.commit()
                    
                    return {
                        'project_id': existing_user[0],
                        'user_id': existing_user[1],
                        'email': existing_user[2]
                    }
            
            # Check if user_id already exists (fallback)
            cur.execute(
                "SELECT project_id, user_id, email FROM user_details WHERE user_id = %s LIMIT 1",
                (user_id,)
            )
            existing_user_by_id = cur.fetchone()
            
            if existing_user_by_id:
                # Update existing user record
                cur.execute(
                    """
                    UPDATE user_details 
                    SET last_login = NOW(), updated_at = NOW(), cognito_sub = %s
                    WHERE user_id = %s
                    """,
                    (cognito_sub, user_id)
                )
                conn.commit()
                
                return {
                    'project_id': existing_user_by_id[0],
                    'user_id': existing_user_by_id[1],
                    'email': existing_user_by_id[2]
                }
            
            # Create new project for new user
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
            
            # Create user details
            cur.execute(
                """
                INSERT INTO user_details (user_id, email, project_id, cognito_sub, last_login)
                VALUES (%s, %s, %s, %s, NOW())
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

def extract_user_info(event):
    """Extract user information from the Lambda event"""
    print(f"Event structure: {json.dumps(event, default=str)}")
    
    user_id = None
    user_email = None
    
    # Try to extract user info from Cognito authorizer
    try:
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        if claims:
            user_id = claims.get('cognito:username') or claims.get('sub')
            user_email = claims.get('email')
            print(f"Extracted from claims - user_id: {user_id}, email: {user_email}")
    except Exception as e:
        print(f"Failed to extract from claims: {e}")
    
    # Fallback: try authorizer directly
    if not user_id:
        try:
            authorizer = event.get('requestContext', {}).get('authorizer', {})
            user_id = authorizer.get('principalId') or authorizer.get('sub')
            user_email = authorizer.get('email')
            print(f"Extracted from authorizer - user_id: {user_id}, email: {user_email}")
        except Exception as e:
            print(f"Failed to extract from authorizer: {e}")
    
    return user_id, user_email

def handler(event, context):
    """Main Lambda handler"""
    try:
        print(f"Received event: {json.dumps(event, default=str)}")
        
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        action = body.get('action')
        
        print(f"Requested action: {action}")
        
        if action == 'create_project':
            # This is called from the auth Lambda, extract user info from body
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
            
            project_data = create_or_update_user_project(user_id, email, cognito_sub)
            
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps(project_data)
            }
            
        elif action == 'get_projects':
            # Extract user info from Cognito authorizer
            user_id, user_email = extract_user_info(event)
            
            if not user_id:
                print("Authentication failed - no user_id found")
                return {
                    'statusCode': 401,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'error': 'Unauthorized',
                        'message': 'User not authenticated - no user ID found'
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
        print(f"Unexpected error in handler: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'error': 'Internal Server Error',
                'message': str(e)
            })
        } 