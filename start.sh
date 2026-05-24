#!/bin/bash
# AttendX Startup Script
# Run this from the project root: bash start.sh

echo "╔════════════════════════════════╗"
echo "║      AttendX - Starting...     ║"
echo "╚════════════════════════════════╝"
echo ""

# Start backend
echo "▶ Starting Backend on port 5000..."
cd backend
npm install --silent
node server.js &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

sleep 2

# Start frontend
echo ""
echo "▶ Starting Frontend on port 3000..."
cd ../frontend
npm install --silent
npm start &
FRONTEND_PID=$!

echo ""
echo "✅ Both services started!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5000"
echo "   Login:    admin / admin123"
echo ""
echo "Press Ctrl+C to stop both."

wait
