#!/bin/bash
set -e

cd /home/ec2-user/home-service-app/backend

echo "Pulling latest code..."
git pull

echo "Installing dependencies..."
npm install

echo "Stopping old app..."
pm2 stop all || true

echo "Starting app..."
pm2 start server.js --name backend

echo "Saving PM2..."
pm2 save

echo "Deployment done!"