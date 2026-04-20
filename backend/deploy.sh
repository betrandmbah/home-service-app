#!/bin/bash

set -e

cd /home/ec2-user/home-service-app

git pull origin main

cd backend

npm install

pm2 restart home-service-api || pm2 start ecosystem.config.js
pm2 save