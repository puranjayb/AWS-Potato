from aws_cdk import (
    Stack,
    Duration,
    RemovalPolicy,
    aws_lambda as _lambda,
    aws_cognito as cognito,
    aws_iam as iam,
    aws_apigateway as apigw,
    aws_s3 as s3,
    CfnOutput,
)
from constructs import Construct

class BackendStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Create S3 bucket for file storage
        file_storage_bucket = s3.Bucket(
            self, "FileStorageBucket",
            bucket_name=None,  # CDK will generate a unique name
            versioned=True,
            encryption=s3.BucketEncryption.S3_MANAGED,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            cors=[
                s3.CorsRule(
                    allowed_methods=[s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST, s3.HttpMethods.DELETE, s3.HttpMethods.HEAD],
                    allowed_origins=["*"],  # In production, specify your frontend domain
                    allowed_headers=["*"],
                    max_age=3600
                )
            ]
        )

        # Create Cognito User Pool
        user_pool = cognito.UserPool(
            self, "PotatoUserPool",
            user_pool_name="potato-user-pool",
            sign_in_aliases=cognito.SignInAliases(username=True, email=True),
            auto_verify=cognito.AutoVerifiedAttrs(email=True),
            password_policy=cognito.PasswordPolicy(
                min_length=8,
                require_lowercase=True,
                require_uppercase=True,
                require_digits=True,
                require_symbols=True
            ),
            removal_policy=RemovalPolicy.DESTROY
        )

        # Create Cognito User Pool Client
        client = cognito.UserPoolClient(
            self, "PotatoUserPoolClient",
            user_pool=user_pool,
            auth_flows=cognito.AuthFlow(
                admin_user_password=True,
                custom=True,
                user_password=True,
                user_srp=True
            ),
            supported_identity_providers=[
                cognito.UserPoolClientIdentityProvider.COGNITO
            ]
        )

        # Neon DB connection details
        neon_database_url = "postgresql://neondb_owner:npg_hNEs9K0fDUCR@ep-broad-term-a6a210d9-pooler.us-west-2.aws.neon.tech/neondb?sslmode=require"

        # Create Auth Lambda
        auth_handler = _lambda.Function(
            self, "AuthFunction",
            runtime=_lambda.Runtime.PYTHON_3_9,
            handler="auth.handler",
            code=_lambda.Code.from_asset("lambda/auth"),
            timeout=Duration.seconds(30),
            environment={
                "USER_POOL_ID": user_pool.user_pool_id,
                "CLIENT_ID": client.user_pool_client_id,
                "DATABASE_URL": neon_database_url
            }
        )

        # Create Projects Lambda
        projects_handler = _lambda.Function(
            self, "ProjectsFunction", 
            runtime=_lambda.Runtime.PYTHON_3_9,
            handler="projects.handler",
            code=_lambda.Code.from_asset("lambda/projects"),
            timeout=Duration.seconds(30),
            environment={
                "DATABASE_URL": neon_database_url
            }
        )

        # Create File Upload Lambda
        file_upload_handler = _lambda.Function(
            self, "FileUploadFunction",
            runtime=_lambda.Runtime.PYTHON_3_9,
            handler="file_upload.handler", 
            code=_lambda.Code.from_asset("lambda/file-upload"),
            timeout=Duration.seconds(30),
            environment={
                "S3_BUCKET_NAME": file_storage_bucket.bucket_name,
                "DATABASE_URL": neon_database_url
            }
        )

        # Update auth handler environment with projects Lambda ARN
        auth_handler.add_environment("PROJECTS_LAMBDA_ARN", projects_handler.function_arn)

        # Grant auth Lambda permission to invoke projects Lambda
        projects_handler.grant_invoke(auth_handler)

        # Grant file upload Lambda access to S3 bucket
        file_storage_bucket.grant_read_write(file_upload_handler)

        # Grant Lambda access to Cognito
        auth_handler.add_to_role_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=[
                    "cognito-idp:AdminInitiateAuth",
                    "cognito-idp:AdminCreateUser",
                    "cognito-idp:AdminSetUserPassword",
                    "cognito-idp:AdminUpdateUserAttributes",
                    "cognito-idp:AdminGetUser"
                ],
                resources=[user_pool.user_pool_arn]
            )
        )

        # Create API Gateway
        api = apigw.RestApi(
            self, "PotatoAPI",
            rest_api_name="potato-api",
            description="API for AWS-Potato application",
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=apigw.Cors.ALL_ORIGINS,
                allow_methods=apigw.Cors.ALL_METHODS,
                allow_headers=["Content-Type", "Authorization", "X-Amz-Date", 
                             "X-Api-Key", "X-Amz-Security-Token"]
            )
        )

        # Create Cognito Authorizer
        auth = apigw.CognitoUserPoolsAuthorizer(
            self, "PotatoAuthorizer",
            cognito_user_pools=[user_pool]
        )

        # Create API resources and methods
        auth_api = api.root.add_resource("auth")
        projects_api = api.root.add_resource("projects")
        files_api = api.root.add_resource("file-upload")

        # Add methods to auth resource
        auth_api.add_method(
            "POST",
            apigw.LambdaIntegration(
                auth_handler,
                proxy=True,
                integration_responses=[{
                    'statusCode': '200',
                    'responseParameters': {
                        'method.response.header.Access-Control-Allow-Origin': "'*'"
                    }
                }]
            ),
            method_responses=[{
                'statusCode': '200',
                'responseParameters': {
                    'method.response.header.Access-Control-Allow-Origin': True
                }
            }]
        )

        # Add methods to projects resource  
        projects_api.add_method(
            "POST",
            apigw.LambdaIntegration(
                projects_handler,
                proxy=True,
                integration_responses=[{
                    'statusCode': '200',
                    'responseParameters': {
                        'method.response.header.Access-Control-Allow-Origin': "'*'"
                    }
                }]
            ),
            authorizer=auth,
            authorization_type=apigw.AuthorizationType.COGNITO,
            method_responses=[{
                'statusCode': '200',
                'responseParameters': {
                    'method.response.header.Access-Control-Allow-Origin': True
                }
            }]
        )

        # Add methods to files resource
        files_api.add_method(
            "POST",
            apigw.LambdaIntegration(
                file_upload_handler,
                proxy=True,
                integration_responses=[{
                    'statusCode': '200',
                    'responseParameters': {
                        'method.response.header.Access-Control-Allow-Origin': "'*'",
                        'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'",
                        'method.response.header.Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'"
                    }
                }]
            ),
            authorizer=auth,
            authorization_type=apigw.AuthorizationType.COGNITO,
            method_responses=[{
                'statusCode': '200',
                'responseParameters': {
                    'method.response.header.Access-Control-Allow-Origin': True,
                    'method.response.header.Access-Control-Allow-Headers': True,
                    'method.response.header.Access-Control-Allow-Methods': True
                }
            }]
        )

        # Add OPTIONS method for CORS preflight
        files_api.add_method(
            "OPTIONS",
            apigw.MockIntegration(
                integration_responses=[{
                    'statusCode': '200',
                    'responseParameters': {
                        'method.response.header.Access-Control-Allow-Origin': "'*'",
                        'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'",
                        'method.response.header.Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'"
                    }
                }],
                request_templates={"application/json": '{"statusCode": 200}'}
            ),
            method_responses=[{
                'statusCode': '200',
                'responseParameters': {
                    'method.response.header.Access-Control-Allow-Origin': True,
                    'method.response.header.Access-Control-Allow-Headers': True,
                    'method.response.header.Access-Control-Allow-Methods': True
                }
            }]
        )

        # Add CloudFormation outputs
        CfnOutput(
            self, "UserPoolId",
            value=user_pool.user_pool_id,
            description="Cognito User Pool ID"
        )

        CfnOutput(
            self, "UserPoolClientId",
            value=client.user_pool_client_id,
            description="Cognito User Pool Client ID"
        )

        CfnOutput(
            self, "ApiUrl",
            value=api.url,
            description="API Gateway URL"
        )

        CfnOutput(
            self, "S3BucketName",
            value=file_storage_bucket.bucket_name,
            description="S3 Bucket for file storage"
        )

        CfnOutput(
            self, "DatabaseInfo", 
            value="Neon DB - neondb (Connected via environment variables)",
            description="Database connection info"
        )
