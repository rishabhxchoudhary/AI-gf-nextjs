# DynamoDB Single Table Design Setup Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Table Structure](#table-structure)
3. [Global Secondary Indexes (GSIs)](#global-secondary-indexes-gsis)
4. [Access Patterns](#access-patterns)
5. [AWS Console Setup](#aws-console-setup)
6. [AWS CLI Setup](#aws-cli-setup)
7. [Terraform Setup](#terraform-setup)
8. [Data Model Examples](#data-model-examples)
9. [Cost Optimization](#cost-optimization)

## Overview

This application uses a **single table design** pattern for DynamoDB, which provides:
- ✅ **Lower costs** - Single table instead of 5+ tables
- ✅ **Better performance** - Fewer requests, atomic transactions
- ✅ **Simplified operations** - One table to manage, backup, and monitor
- ✅ **Flexible queries** - Multiple access patterns via GSIs

## Table Structure

### Primary Table
- **Table Name**: `ai-girlfriend-table`
- **Partition Key (PK)**: `pk` (String)
- **Sort Key (SK)**: `sk` (String)

### Global Secondary Indexes (GSIs)

#### GSI1 - Entity Type Queries
- **Name**: `gsi1`
- **Partition Key**: `gsi1pk` (String)
- **Sort Key**: `gsi1sk` (String)
- **Purpose**: Query by entity type (all users, all sessions, etc.)
- **Projection**: ALL

#### GSI2 - User-Centric Queries
- **Name**: `gsi2`
- **Partition Key**: `gsi2pk` (String)
- **Sort Key**: `gsi2sk` (String)
- **Purpose**: Query user-specific data across time
- **Projection**: ALL

## Access Patterns

### Primary Key Patterns

| Entity | PK | SK | Description |
|--------|----|----|-------------|
| User Metadata | `USER#{userId}` | `METADATA` | User profile information |
| User Credits | `USER#{userId}` | `CREDITS` | User credit balance |
| User Personality | `USER#{userId}` | `PERSONALITY` | AI personality state |
| Session | `USER#{userId}` | `SESSION#{sessionId}` | Chat session |
| Message | `SESSION#{sessionId}` | `MSG#{timestamp}#{messageId}` | Individual message |
| Analytics | `ANALYTICS#{date}` | `EVENT#{timestamp}#{eventId}` | Analytics event |
| Daily Stats | `STATS#{date}` | `TYPE#{eventType}` | Aggregated daily stats |

### GSI1 Access Patterns

| Query | GSI1-PK | GSI1-SK | Use Case |
|-------|---------|---------|----------|
| All Users | `USERS` | `USER#{timestamp}#{userId}` | List all users |
| All Sessions | `SESSIONS` | `SESSION#{timestamp}#{sessionId}` | List all sessions |
| Events by Type | `EVENT_TYPE#{type}` | `{timestamp}#{eventId}` | Filter analytics by event |
| User Messages | `USER_MESSAGES#{userId}` | `{timestamp}#{messageId}` | User's message history |

### GSI2 Access Patterns

| Query | GSI2-PK | GSI2-SK | Use Case |
|-------|---------|---------|----------|
| Active Users | `ACTIVE_USERS` | `{lastActiveTimestamp}` | Recently active users |
| User Sessions | `USER_SESSIONS#{userId}` | `{timestamp}` | User's sessions by time |
| User Analytics | `USER_ANALYTICS#{userId}` | `{timestamp}` | User's analytics events |
| All Messages | `ALL_MESSAGES` | `{timestamp}` | Global message timeline |

## AWS Console Setup

### Step 1: Create Table

1. Go to AWS DynamoDB Console
2. Click "Create table"
3. Enter the following:
   - **Table name**: `ai-girlfriend-table`
   - **Partition key**: `pk` (String)
   - **Sort key**: `sk` (String)
4. Under **Settings**:
   - Choose "Customize settings"
   - **Read/write capacity**: On-Demand (recommended for starting)
   - OR Provisioned: 5 RCU / 5 WCU (for predictable workload)

### Step 2: Add Global Secondary Indexes

After table creation:

1. Go to the **Indexes** tab
2. Click **Create index**

#### GSI1:
- **Partition key**: `gsi1pk` (String)
- **Sort key**: `gsi1sk` (String)
- **Index name**: `gsi1`
- **Projected attributes**: All
- **Capacity**: Use same as base table

#### GSI2:
- **Partition key**: `gsi2pk` (String)
- **Sort key**: `gsi2sk` (String)
- **Index name**: `gsi2`
- **Projected attributes**: All
- **Capacity**: Use same as base table

### Step 3: Configure Backups (Optional but Recommended)

1. Go to **Backups** tab
2. Enable **Point-in-time recovery**
3. Consider setting up **On-demand backups** for critical points

## AWS CLI Setup

### Create Table with GSIs in One Command

```bash
aws dynamodb create-table \
  --table-name ai-girlfriend-table \
  --attribute-definitions \
    AttributeName=pk,AttributeType=S \
    AttributeName=sk,AttributeType=S \
    AttributeName=gsi1pk,AttributeType=S \
    AttributeName=gsi1sk,AttributeType=S \
    AttributeName=gsi2pk,AttributeType=S \
    AttributeName=gsi2sk,AttributeType=S \
  --key-schema \
    AttributeName=pk,KeyType=HASH \
    AttributeName=sk,KeyType=RANGE \
  --global-secondary-indexes \
    '[
      {
        "IndexName": "gsi1",
        "Keys": [
          {"AttributeName": "gsi1pk", "KeyType": "HASH"},
          {"AttributeName": "gsi1sk", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"},
        "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
      },
      {
        "IndexName": "gsi2",
        "Keys": [
          {"AttributeName": "gsi2pk", "KeyType": "HASH"},
          {"AttributeName": "gsi2sk", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"},
        "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
      }
    ]' \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### Enable Point-in-Time Recovery

```bash
aws dynamodb update-continuous-backups \
  --table-name ai-girlfriend-table \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true \
  --region us-east-1
```

## Terraform Setup

```hcl
resource "aws_dynamodb_table" "ai_girlfriend" {
  name           = "ai-girlfriend-table"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "pk"
  range_key      = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  attribute {
    name = "gsi1pk"
    type = "S"
  }

  attribute {
    name = "gsi1sk"
    type = "S"
  }

  attribute {
    name = "gsi2pk"
    type = "S"
  }

  attribute {
    name = "gsi2sk"
    type = "S"
  }

  global_secondary_index {
    name            = "gsi1"
    hash_key        = "gsi1pk"
    range_key       = "gsi1sk"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "gsi2"
    hash_key        = "gsi2pk"
    range_key       = "gsi2sk"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name        = "ai-girlfriend-table"
    Environment = "production"
    Application = "ai-girlfriend"
  }
}
```

## Data Model Examples

### User Record
```json
{
  "pk": "USER#user123",
  "sk": "METADATA",
  "entityType": "USER",
  "userId": "user123",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2024-01-15T10:00:00Z",
  "lastActiveAt": "2024-01-15T15:30:00Z",
  "messageCount": 50,
  "sessionCount": 3,
  "subscriptionStatus": "free",
  "gsi1pk": "USERS",
  "gsi1sk": "USER#2024-01-15T10:00:00Z#user123",
  "gsi2pk": "ACTIVE_USERS",
  "gsi2sk": "2024-01-15T15:30:00Z"
}
```

### Credits Record
```json
{
  "pk": "USER#user123",
  "sk": "CREDITS",
  "entityType": "CREDITS",
  "credits": 85,
  "totalCreditsUsed": 15,
  "lastUpdated": "2024-01-15T15:30:00Z"
}
```

### Session Record
```json
{
  "pk": "USER#user123",
  "sk": "SESSION#session456",
  "entityType": "SESSION",
  "sessionId": "session456",
  "userId": "user123",
  "startedAt": "2024-01-15T14:00:00Z",
  "lastMessageAt": "2024-01-15T15:30:00Z",
  "messageCount": 25,
  "relationshipStage": "comfortable",
  "gsi1pk": "SESSIONS",
  "gsi1sk": "SESSION#2024-01-15T14:00:00Z#session456",
  "gsi2pk": "USER_SESSIONS#user123",
  "gsi2sk": "2024-01-15T14:00:00Z"
}
```

### Message Record
```json
{
  "pk": "SESSION#session456",
  "sk": "MSG#2024-01-15T14:05:30Z#msg789",
  "entityType": "MESSAGE",
  "messageId": "msg789",
  "sessionId": "session456",
  "userId": "user123",
  "role": "user",
  "content": "Hello, how are you today?",
  "timestamp": "2024-01-15T14:05:30Z",
  "metadata": {
    "emotion": "happy",
    "topics": ["greeting", "wellbeing"]
  },
  "gsi1pk": "USER_MESSAGES#user123",
  "gsi1sk": "2024-01-15T14:05:30Z#msg789",
  "gsi2pk": "ALL_MESSAGES",
  "gsi2sk": "2024-01-15T14:05:30Z"
}
```

### Analytics Event
```json
{
  "pk": "ANALYTICS#2024-01-15",
  "sk": "EVENT#2024-01-15T14:05:30Z#evt123",
  "entityType": "ANALYTICS",
  "eventId": "evt123",
  "userId": "user123",
  "eventType": "message_sent",
  "eventData": {
    "sessionId": "session456",
    "messageLength": 25,
    "creditsUsed": 1
  },
  "timestamp": "2024-01-15T14:05:30Z",
  "date": "2024-01-15",
  "gsi1pk": "EVENT_TYPE#message_sent",
  "gsi1sk": "2024-01-15T14:05:30Z#evt123",
  "gsi2pk": "USER_ANALYTICS#user123",
  "gsi2sk": "2024-01-15T14:05:30Z"
}
```

## Cost Optimization

### 1. On-Demand vs Provisioned
- **Start with On-Demand**: No upfront capacity planning, scales automatically
- **Switch to Provisioned**: When you have predictable traffic patterns (can save 50-70%)

### 2. Index Projections
- Current setup uses `ALL` projection for flexibility
- Consider `KEYS_ONLY` or `INCLUDE` specific attributes if you don't need all data

### 3. TTL for Old Data
Consider adding TTL (Time to Live) for old analytics data:

```bash
aws dynamodb update-time-to-live \
  --table-name ai-girlfriend-table \
  --time-to-live-specification Enabled=true,AttributeName=ttl
```

Then set `ttl` attribute on records you want to expire:
```json
{
  "pk": "ANALYTICS#2024-01-01",
  "sk": "EVENT#...",
  "ttl": 1735689600  // Unix timestamp for expiration
}
```

### 4. Monitoring Costs
Set up CloudWatch alarms for:
- Consumed Read/Write Capacity Units
- User errors (throttling)
- System errors

## Environment Variables

Add to your `.env.local`:

```env
# DynamoDB Configuration
DYNAMODB_TABLE_NAME=ai-girlfriend-table
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
```

## IAM Permissions

Your AWS IAM user/role needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:BatchGetItem",
        "dynamodb:BatchWriteItem",
        "dynamodb:TransactWriteItems",
        "dynamodb:TransactGetItems"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:YOUR_ACCOUNT_ID:table/ai-girlfriend-table",
        "arn:aws:dynamodb:us-east-1:YOUR_ACCOUNT_ID:table/ai-girlfriend-table/index/*"
      ]
    }
  ]
}
```

## Testing the Setup

Test your table with AWS CLI:

```bash
# Put a test user
aws dynamodb put-item \
  --table-name ai-girlfriend-table \
  --item '{
    "pk": {"S": "USER#test123"},
    "sk": {"S": "METADATA"},
    "entityType": {"S": "USER"},
    "email": {"S": "test@example.com"},
    "gsi1pk": {"S": "USERS"},
    "gsi1sk": {"S": "USER#2024-01-15T10:00:00Z#test123"}
  }'

# Query the user
aws dynamodb get-item \
  --table-name ai-girlfriend-table \
  --key '{"pk": {"S": "USER#test123"}, "sk": {"S": "METADATA"}}'

# Query all users via GSI1
aws dynamodb query \
  --table-name ai-girlfriend-table \
  --index-name gsi1 \
  --key-condition-expression "gsi1pk = :pk" \
  --expression-attribute-values '{":pk": {"S": "USERS"}}'
```

## Migration from Multi-Table

If migrating from multiple tables, use this pattern:

1. **Export old data** using DynamoDB export or custom scripts
2. **Transform data** to single table format
3. **Import to new table** using batch writes
4. **Verify data** integrity
5. **Update application** to use new table
6. **Monitor** for issues
7. **Cleanup old tables** after verification period

## Support

For issues or questions:
1. Check CloudWatch logs for errors
2. Verify IAM permissions
3. Ensure GSIs are active (check AWS Console)
4. Monitor throttling metrics

---

This single table design provides a scalable, cost-effective solution for the AI Girlfriend application while maintaining query flexibility and performance.