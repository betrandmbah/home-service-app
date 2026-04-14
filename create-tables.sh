#!/bin/bash

set -e

echo "Creating Users table..."
aws dynamodb create-table \
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
  ]' || true

aws dynamodb wait table-exists --table-name Users
echo "Users ready"

echo "Creating Providers table..."
aws dynamodb create-table \
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
  ]' || true

aws dynamodb wait table-exists --table-name Providers
echo "Providers ready"

echo "Creating Services table..."
aws dynamodb create-table \
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
  ]' || true

aws dynamodb wait table-exists --table-name Services
echo "Services ready"

echo "Creating Bookings table..."
aws dynamodb create-table \
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
  ]' || true

aws dynamodb wait table-exists --table-name Bookings
echo "Bookings ready"

echo "All 4 tables are ready."