# Google AI Studio Setup Guide

This guide explains how to set up Google AI Studio API key for the PDF processor lambda.

## Step 1: Get Google AI Studio API Key

1. Go to [Google AI Studio](https://aistudio.google.com)
2. Sign in with your Google account
3. Click on "Get API key" in the left sidebar
4. Click "Create API key in new project" or "Create API key" if you have an existing project
5. Copy the generated API key (it starts with `AIza...`)

## Step 2: Configure the API Key

### For Local Development

1. Create a `.env` file in the `lambda/pdf-processor` directory:
```bash
GOOGLE_AI_STUDIO_API_KEY=AIzaSy...your-api-key-here
```

2. Make sure to add `.env` to your `.gitignore` file to avoid committing the API key

### For AWS Lambda Deployment

1. Update the `backend_stack.py` file with your actual API key:
```python
environment={
    "S3_BUCKET_NAME": file_storage_bucket.bucket_name,
    "DATABASE_URL": neon_database_url,
    "GOOGLE_AI_STUDIO_API_KEY": "AIzaSy...your-actual-api-key-here"
}
```

**Note:** For production, consider using AWS Secrets Manager or Parameter Store instead of hardcoding the API key.

### Using AWS Secrets Manager (Recommended for Production)

1. Store the API key in AWS Secrets Manager:
```bash
aws secretsmanager create-secret \
    --name "pdf-processor/google-ai-studio-api-key" \
    --secret-string "AIzaSy...your-api-key-here"
```

2. Update the lambda to retrieve the secret:
```python
import boto3
import json

def get_secret():
    secret_name = "pdf-processor/google-ai-studio-api-key"
    region_name = "us-west-2"  # Replace with your region

    session = boto3.session.Session()
    client = session.client(
        service_name='secretsmanager',
        region_name=region_name
    )

    try:
        get_secret_value_response = client.get_secret_value(
            SecretId=secret_name
        )
    except ClientError as e:
        raise e

    secret = get_secret_value_response['SecretString']
    return secret

# Use in your lambda
api_key = get_secret()
```

3. Grant the lambda permission to access the secret:
```python
pdf_processor_handler.add_to_role_policy(
    iam.PolicyStatement(
        effect=iam.Effect.ALLOW,
        actions=[
            "secretsmanager:GetSecretValue"
        ],
        resources=[
            f"arn:aws:secretsmanager:{region}:{account}:secret:pdf-processor/google-ai-studio-api-key*"
        ]
    )
)
```

## Step 3: Test the API Key

You can test your API key with a simple Python script:

```python
import google.generativeai as genai

# Configure the API key
genai.configure(api_key="AIzaSy...your-api-key-here")

# Test the model
model = genai.GenerativeModel('gemini-1.5-flash')
response = model.generate_content("Hello, world!")
print(response.text)
```

## Step 4: Monitor Usage

1. Go to [Google AI Studio](https://aistudio.google.com)
2. Check your API usage in the "API usage" section
3. Monitor for any rate limits or quota issues

## Important Notes

- **Keep your API key secure**: Never commit it to version control
- **Rate limits**: Google AI Studio has rate limits, check the documentation
- **Quotas**: Free tier has usage quotas, upgrade if needed
- **Billing**: Monitor your usage to avoid unexpected charges

## Troubleshooting

### Common Issues

1. **Invalid API Key Error**
   - Verify the API key is correct
   - Check if the API key has proper permissions
   - Ensure you're using the correct model name

2. **Rate Limit Exceeded**
   - Implement exponential backoff
   - Consider upgrading your plan
   - Monitor your request frequency

3. **Model Not Found**
   - Verify you're using a supported model name
   - Check if the model is available in your region

### Error Messages

- `google.api_core.exceptions.InvalidArgument`: Usually means invalid API key
- `google.api_core.exceptions.ResourceExhausted`: Rate limit exceeded
- `google.api_core.exceptions.PermissionDenied`: API key lacks permissions

## Security Best Practices

1. Use environment variables or secrets management
2. Implement proper error handling
3. Add request logging for debugging
4. Use least privilege access
5. Rotate API keys regularly
6. Monitor for unusual usage patterns 