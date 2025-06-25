#!/bin/bash

# Database Connection Script using SSH Tunnel
# This script creates an SSH tunnel through the bastion host to connect to RDS

set -e

echo "🔗 Setting up database connection via SSH tunnel..."

# Get AWS CloudFormation outputs
STACK_NAME="BackendStack"

echo "📋 Getting connection details from CloudFormation..."
BASTION_IP=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`BastionHostPublicIP`].OutputValue' \
  --output text)

DB_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
  --output text)

# Get database credentials from Secrets Manager
echo "🔐 Getting database credentials..."
SECRET_ARN=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?contains(OutputKey, `Secret`)].OutputValue' \
  --output text)

if [ -z "$SECRET_ARN" ]; then
  echo "❌ Could not find database secret ARN"
  exit 1
fi

SECRET=$(aws secretsmanager get-secret-value --secret-id $SECRET_ARN --query SecretString --output text)
DB_HOST=$(echo $SECRET | jq -r .host)
DB_PORT=$(echo $SECRET | jq -r .port)
DB_USER=$(echo $SECRET | jq -r .username)
DB_PASS=$(echo $SECRET | jq -r .password)
DB_NAME="authdb"

# Local port for tunnel
LOCAL_PORT=5433

echo "🖥️  Connection Details:"
echo "   Bastion Host: $BASTION_IP"
echo "   Database: $DB_HOST:$DB_PORT"
echo "   Local Port: $LOCAL_PORT"
echo ""

# Create SSH tunnel in background
echo "🔗 Creating SSH tunnel..."
ssh -f -N -L $LOCAL_PORT:$DB_HOST:$DB_PORT ec2-user@$BASTION_IP \
  -o StrictHostKeyChecking=no \
  -o UserKnownHostsFile=/dev/null \
  -o LogLevel=quiet

# Wait a moment for tunnel to establish
sleep 2

echo "✅ SSH tunnel established!"
echo ""
echo "🐘 Connecting to PostgreSQL..."
echo "   (Use Ctrl+C to exit, tunnel will be closed automatically)"
echo ""

# Connect to database through tunnel
PGPASSWORD=$DB_PASS psql -h localhost -p $LOCAL_PORT -U $DB_USER -d $DB_NAME

# Clean up: kill the SSH tunnel when psql exits
echo ""
echo "🧹 Cleaning up SSH tunnel..."
pkill -f "ssh.*$LOCAL_PORT:$DB_HOST:$DB_PORT"
echo "✅ Disconnected and cleaned up!" 