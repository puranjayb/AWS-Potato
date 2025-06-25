from aws_cdk import (
    Stack,
    Duration,
    RemovalPolicy,
    aws_lambda as _lambda,
    aws_cognito as cognito,
    aws_rds as rds,
    aws_ec2 as ec2,
    aws_iam as iam,
    aws_apigateway as apigw,
    aws_s3 as s3,
    CfnOutput,
    SecretValue,
)
from constructs import Construct

class BackendStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Create VPC for RDS
        vpc = ec2.Vpc(self, "AuthVPC",
            max_azs=2,
            nat_gateways=1,
            subnet_configuration=[
                ec2.SubnetConfiguration(
                    name="Public",
                    subnet_type=ec2.SubnetType.PUBLIC,
                    cidr_mask=24
                ),
                ec2.SubnetConfiguration(
                    name="Private",
                    subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    cidr_mask=24
                )
            ]
        )

        # Create S3 bucket for file storage
        file_storage_bucket = s3.Bucket(
            self, "FileStorageBucket",
            bucket_name=None,  # CDK will generate a unique name
            versioned=True,
            encryption=s3.BucketEncryption.S3_MANAGED,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True
        )

        # Create RDS instance
        db_security_group = ec2.SecurityGroup(
            self, "DBSecurityGroup",
            vpc=vpc,
            description="Security group for RDS instance",
            allow_all_outbound=True
        )
        
        db_security_group.add_ingress_rule(
            peer=ec2.Peer.ipv4(vpc.vpc_cidr_block),
            connection=ec2.Port.tcp(5432),
            description="Allow PostgreSQL access from within VPC"
        )

        database = rds.DatabaseInstance(
            self, "AuthDatabase",
            engine=rds.DatabaseInstanceEngine.postgres(
                version=rds.PostgresEngineVersion.VER_15
            ),
            instance_type=ec2.InstanceType.of(
                ec2.InstanceClass.BURSTABLE3,
                ec2.InstanceSize.MICRO
            ),
            vpc=vpc,
            security_groups=[db_security_group],
            vpc_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS
            ),
            allocated_storage=20,
            max_allocated_storage=100,
            removal_policy=RemovalPolicy.DESTROY,
            deletion_protection=False,
            database_name="authdb",
            credentials=rds.Credentials.from_generated_secret("postgres")
        )

        # Create Cognito User Pool
        user_pool = cognito.UserPool(
            self, "AuthUserPool",
            user_pool_name="auth-user-pool",
            self_sign_up_enabled=True,
            sign_in_aliases=cognito.SignInAliases(
                email=True,
                username=True
            ),
            standard_attributes=cognito.StandardAttributes(
                email=cognito.StandardAttribute(required=True, mutable=True)
            ),
            password_policy=cognito.PasswordPolicy(
                min_length=8,
                require_lowercase=True,
                require_uppercase=True,
                require_digits=True,
                require_symbols=True
            ),
            account_recovery=cognito.AccountRecovery.EMAIL_ONLY
        )

        # Create User Pool Client
        client = user_pool.add_client("auth-app-client",
            auth_flows=cognito.AuthFlow(
                admin_user_password=True,  # Enables ADMIN_NO_SRP_AUTH flow
                custom=True,
                user_password=True,
                user_srp=True
            ),
            o_auth=cognito.OAuthSettings(
                flows=cognito.OAuthFlows(
                    authorization_code_grant=True
                ),
                scopes=[cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
                callback_urls=["http://localhost:3000"]  # Update with your frontend URL
            )
        )

        # Create Lambda layer for psycopg2
        psycopg2_layer = _lambda.LayerVersion.from_layer_version_arn(
            self, "Psycopg2Layer",
            layer_version_arn="arn:aws:lambda:us-east-1:898466741470:layer:psycopg2-py39:2"
        )

        # Create Lambda function for authentication
        auth_handler = _lambda.Function(
            self, "AuthHandler",
            runtime=_lambda.Runtime.PYTHON_3_9,
            handler="auth.handler",
            code=_lambda.Code.from_asset("lambda/auth"),
            timeout=Duration.seconds(30),
            layers=[psycopg2_layer],
            environment={
                "USER_POOL_ID": user_pool.user_pool_id,
                "CLIENT_ID": client.user_pool_client_id,
                "DB_SECRET_ARN": database.secret.secret_arn,
                "DB_NAME": "authdb"
            },
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS
            )
        )

        # Create Lambda function for project management
        projects_handler = _lambda.Function(
            self, "ProjectsHandler",
            runtime=_lambda.Runtime.PYTHON_3_9,
            handler="projects.handler",
            code=_lambda.Code.from_asset("lambda/projects"),
            timeout=Duration.seconds(30),
            layers=[psycopg2_layer],
            environment={
                "DB_SECRET_ARN": database.secret.secret_arn,
                "DB_NAME": "authdb"
            },
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS
            )
        )

        # Create Lambda function for file upload
        file_upload_handler = _lambda.Function(
            self, "FileUploadHandler",
            runtime=_lambda.Runtime.PYTHON_3_9,
            handler="file_upload.handler",
            code=_lambda.Code.from_asset("lambda/file-upload"),
            timeout=Duration.seconds(60),
            memory_size=512,
            layers=[psycopg2_layer],
            environment={
                "DB_SECRET_ARN": database.secret.secret_arn,
                "DB_NAME": "authdb",
                "S3_BUCKET_NAME": file_storage_bucket.bucket_name
            },
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS
            )
        )

        # Update auth handler environment with projects Lambda ARN
        auth_handler.add_environment("PROJECTS_LAMBDA_ARN", projects_handler.function_arn)

        # Grant auth Lambda permission to invoke projects Lambda
        projects_handler.grant_invoke(auth_handler)

        # Grant Lambda access to RDS secret
        database.secret.grant_read(auth_handler)
        database.secret.grant_read(projects_handler)
        database.secret.grant_read(file_upload_handler)

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
        files_api = api.root.add_resource("files")

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
            self, "DatabaseEndpoint", 
            value=database.instance_endpoint.hostname,
            description="RDS Database endpoint (private)"
        )
