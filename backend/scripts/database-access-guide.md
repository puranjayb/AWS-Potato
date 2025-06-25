# Database Access Guide

## 🎯 Method: Local PostgreSQL Client via SSH Tunnel

This guide shows how to connect to your private RDS database from your local machine using an SSH tunnel through a bastion host.

## 📋 Prerequisites

1. **Install PostgreSQL client locally:**
   ```bash
   # macOS
   brew install postgresql
   
   # Ubuntu/Debian
   sudo apt-get install postgresql-client
   
   # Windows (use WSL or install PostgreSQL for Windows)
   ```

2. **Install jq for JSON parsing:**
   ```bash
   # macOS
   brew install jq
   
   # Ubuntu/Debian
   sudo apt-get install jq
   ```

3. **Create an EC2 Key Pair (if you don't have one):**
   ```bash
   # Create a new key pair
   aws ec2 create-key-pair --key-name my-bastion-key --query 'KeyMaterial' --output text > ~/.ssh/my-bastion-key.pem
   chmod 400 ~/.ssh/my-bastion-key.pem
   ```

## 🚀 Quick Setup

### Step 1: Update CDK Stack with Your Key Pair

Before deploying, update the bastion host configuration:

```typescript
// In backend/backend/backend_stack.py, update the bastion host:
bastion_host = ec2.Instance(
    self, "BastionHost",
    // ... other config ...
    key_name="my-bastion-key"  // Add your key pair name
)
```

### Step 2: Secure the Bastion Host (Recommended)

Get your public IP and restrict access:

```bash
# Get your public IP
curl ifconfig.me

# Update the security group to only allow your IP:
# Replace ec2.Peer.any_ipv4() with ec2.Peer.ipv4("YOUR_IP/32")
```

### Step 3: Deploy the Stack

```bash
cd backend
cdk deploy
```

## 🔗 Connection Methods

### Method A: Automated Script (Easiest)

```bash
# Make the script executable
chmod +x backend/scripts/connect-to-db.sh

# Run the connection script
./backend/scripts/connect-to-db.sh
```

### Method B: Manual Setup (More Control)

1. **Get connection details:**
   ```bash
   # Get bastion host IP
   BASTION_IP=$(aws cloudformation describe-stacks \
     --stack-name BackendStack \
     --query 'Stacks[0].Outputs[?OutputKey==`BastionHostPublicIP`].OutputValue' \
     --output text)
   
   echo "Bastion Host IP: $BASTION_IP"
   ```

2. **Get database credentials:**
   ```bash
   # Get database secret
   SECRET_ARN=$(aws rds describe-db-instances \
     --db-instance-identifier $(aws cloudformation describe-stacks \
       --stack-name BackendStack \
       --query 'Stacks[0].Resources[?LogicalResourceId==`AuthDatabase`].PhysicalResourceId' \
       --output text) \
     --query 'DBInstances[0].MasterUserSecret.SecretArn' --output text)
   
   # Get credentials
   SECRET=$(aws secretsmanager get-secret-value --secret-id $SECRET_ARN --query SecretString --output text)
   DB_HOST=$(echo $SECRET | jq -r .host)
   DB_USER=$(echo $SECRET | jq -r .username)
   DB_PASS=$(echo $SECRET | jq -r .password)
   
   echo "Database Host: $DB_HOST"
   echo "Database User: $DB_USER"
   ```

3. **Create SSH tunnel:**
   ```bash
   # Create tunnel (replace with your key file)
   ssh -i ~/.ssh/my-bastion-key.pem -f -N -L 5433:$DB_HOST:5432 ec2-user@$BASTION_IP
   ```

4. **Connect to database:**
   ```bash
   # Connect through tunnel
   PGPASSWORD=$DB_PASS psql -h localhost -p 5433 -U $DB_USER -d authdb
   ```

## 🔧 Useful SQL Commands

Once connected, try these commands:

```sql
-- List all databases
\l

-- List all tables
\dt

-- Describe table structure
\d users
\d projects  
\d user_details
\d files

-- Count records in each table
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats 
WHERE schemaname = 'public';

-- View recent files
SELECT 
  original_filename,
  file_size,
  user_email,
  upload_status,
  created_at 
FROM files 
ORDER BY created_at DESC 
LIMIT 10;

-- View user statistics
SELECT 
  COUNT(*) as total_users,
  COUNT(DISTINCT email) as unique_emails
FROM users;

-- View project statistics  
SELECT 
  COUNT(*) as total_projects,
  COUNT(DISTINCT name) as unique_project_names
FROM projects;
```

## 🧹 Cleanup

```bash
# Kill SSH tunnel when done
pkill -f "ssh.*5433"

# Or find and kill specific tunnel
ps aux | grep ssh
kill <tunnel_process_id>
```

## 🔒 Security Best Practices

1. **Restrict bastion host access to your IP only**
2. **Use strong EC2 key pairs**
3. **Regularly rotate database passwords**
4. **Monitor CloudTrail logs for access**
5. **Consider using AWS Session Manager instead of SSH keys**

## 🚨 Troubleshooting

**SSH Connection Fails:**
- Check if your IP is whitelisted in security group
- Verify key pair permissions: `chmod 400 ~/.ssh/your-key.pem`
- Test SSH connection: `ssh -i ~/.ssh/your-key.pem ec2-user@$BASTION_IP`

**Database Connection Fails:**
- Verify SSH tunnel is active: `ps aux | grep ssh`
- Check database credentials are correct
- Ensure RDS instance is running

**Port Already in Use:**
- Change local port: Use `-L 5434:$DB_HOST:5432` instead
- Kill existing connections: `lsof -ti:5433 | xargs kill` 