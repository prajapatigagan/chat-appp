#!/bin/sh

echo "Starting Spring Boot backend on port 8080..."
export PORT=8080
java -jar /app/backend.jar &

echo "Waiting for backend to start..."
sleep 10

echo "Starting Next.js frontend on port 7860..."
export PORT=7860
export HOSTNAME="0.0.0.0"
cd /app/web
node apps/web/server.js