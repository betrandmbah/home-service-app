#!/bin/bash

set -euo pipefail

REGION="us-east-1"

echo "Starting DynamoDB table creation..."

table_exists() {
  aws dynamodb describe-table \
    --table-name "$1" \
    --region "$REGION" >/dev/null 2>&1
}

# USERS
if table_exists "Users"; then
  echo "Users table already exists. Skipping..."
else
  echo "Creating Users table..."
  aws dynamodb create-table \
    --region "$REGION" \
    --table-name Users \
    --attribute-definitions \
      AttributeName=userId,AttributeType=S \
      AttributeName=email,AttributeType=S \
    --key-schema \
      AttributeName=userId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --global-secondary-indexes '[
      {
        "IndexName":"email-index",
        "KeySchema":[{"AttributeName":"email","KeyType":"HASH"}],
        "Projection":{"ProjectionType":"ALL"}
      }
    ]'

  aws dynamodb wait table-exists --table-name Users --region "$REGION"
  echo "Users ready"
fi

# PROVIDERS
if table_exists "Providers"; then
  echo "Providers table already exists. Skipping..."
else
  echo "Creating Providers table..."
  aws dynamodb create-table \
    --region "$REGION" \
    --table-name Providers \
    --attribute-definitions \
      AttributeName=providerId,AttributeType=S \
      AttributeName=email,AttributeType=S \
    --key-schema \
      AttributeName=providerId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --global-secondary-indexes '[
      {
        "IndexName":"email-index",
        "KeySchema":[{"AttributeName":"email","KeyType":"HASH"}],
        "Projection":{"ProjectionType":"ALL"}
      }
    ]'

  aws dynamodb wait table-exists --table-name Providers --region "$REGION"
  echo "Providers ready"
fi

# SERVICES
if table_exists "Services"; then
  echo "Services table already exists. Skipping..."
else
  echo "Creating Services table..."
  aws dynamodb create-table \
    --region "$REGION" \
    --table-name Services \
    --attribute-definitions \
      AttributeName=serviceId,AttributeType=S \
      AttributeName=providerId,AttributeType=S \
      AttributeName=category,AttributeType=S \
      AttributeName=city,AttributeType=S \
    --key-schema \
      AttributeName=serviceId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --global-secondary-indexes '[
      {
        "IndexName":"providerId-index",
        "KeySchema":[{"AttributeName":"providerId","KeyType":"HASH"}],
        "Projection":{"ProjectionType":"ALL"}
      },
      {
        "IndexName":"category-city-index",
        "KeySchema":[
          {"AttributeName":"category","KeyType":"HASH"},
          {"AttributeName":"city","KeyType":"RANGE"}
        ],
        "Projection":{"ProjectionType":"ALL"}
      }
    ]'

  aws dynamodb wait table-exists --table-name Services --region "$REGION"
  echo "Services ready"
fi

# BOOKINGS
if table_exists "Bookings"; then
  echo "Bookings table already exists. Skipping..."
else
  echo "Creating Bookings table..."
  aws dynamodb create-table \
    --region "$REGION" \
    --table-name Bookings \
    --attribute-definitions \
      AttributeName=bookingId,AttributeType=S \
      AttributeName=userId,AttributeType=S \
      AttributeName=providerId,AttributeType=S \
    --key-schema \
      AttributeName=bookingId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --global-secondary-indexes '[
      {
        "IndexName":"userId-index",
        "KeySchema":[{"AttributeName":"userId","KeyType":"HASH"}],
        "Projection":{"ProjectionType":"ALL"}
      },
      {
        "IndexName":"providerId-index",
        "KeySchema":[{"AttributeName":"providerId","KeyType":"HASH"}],
        "Projection":{"ProjectionType":"ALL"}
      }
    ]'

  aws dynamodb wait table-exists --table-name Bookings --region "$REGION"
  echo "Bookings ready"
fi

echo "✅ All tables are ready!"