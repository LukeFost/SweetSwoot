#!/bin/bash

# Start the mock backend in the background
echo "Starting mock backend server..."
node /workspace/SweetSwoot/mock-backend.js > backend.log 2>&1 &
BACKEND_PID=$!

# Wait a moment for the backend to start
sleep 2

# Start the frontend
echo "Starting frontend server..."
cd /workspace/SweetSwoot
npm run dev -- --port 54500 --host 0.0.0.0

# When the frontend is stopped, also stop the backend
kill $BACKEND_PID