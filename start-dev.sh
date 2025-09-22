#!/bin/bash

# GestureVoice Development Server Startup Script

echo "🚀 Starting GestureVoice Development Servers..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js version 18 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'.' -f1 | cut -d'v' -f2)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version check passed: $(node -v)"

# Function to check if port is in use
check_port() {
    if lsof -i :$1 >/dev/null 2>&1; then
        echo "⚠️  Port $1 is already in use. Please stop the service or choose a different port."
        return 1
    fi
    return 0
}

# Check required ports
echo "🔍 Checking port availability..."
if ! check_port 3001; then
    echo "Backend port 3001 is in use. Please stop any running backend services."
    exit 1
fi

if ! check_port 5173; then
    echo "Frontend port 5173 is in use. Please stop any running frontend services."
    exit 1
fi

# Setup backend environment
echo "🔧 Setting up backend environment..."
cd "$(dirname "$0")/backend"

if [ ! -f ".env" ]; then
    echo "📝 Creating backend .env file from template..."
    cp .env.example .env
    echo "✅ Please review and update the .env file with your API keys if needed"
fi

# Install backend dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install backend dependencies"
        exit 1
    fi
fi

# Start backend server in background
echo "🔄 Starting backend server on port 3001..."
npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Check if backend started successfully
if ! ps -p $BACKEND_PID > /dev/null; then
    echo "❌ Backend server failed to start. Check logs/backend.log for details."
    exit 1
fi

echo "✅ Backend server started successfully (PID: $BACKEND_PID)"

# Setup frontend
echo "🔧 Setting up frontend environment..."
cd "../project 6"

# Install frontend dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install frontend dependencies"
        kill $BACKEND_PID
        exit 1
    fi
fi

# Start frontend server in background
echo "🔄 Starting frontend server on port 5173..."
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 5

# Check if frontend started successfully
if ! ps -p $FRONTEND_PID > /dev/null; then
    echo "❌ Frontend server failed to start. Check logs/frontend.log for details."
    kill $BACKEND_PID
    exit 1
fi

echo "✅ Frontend server started successfully (PID: $FRONTEND_PID)"

# Create process info file
cd ..
mkdir -p logs
echo "BACKEND_PID=$BACKEND_PID" > logs/processes.pid
echo "FRONTEND_PID=$FRONTEND_PID" >> logs/processes.pid

echo ""
echo "🎉 GestureVoice servers are now running!"
echo ""
echo "📍 Frontend: http://localhost:5173"
echo "📍 Backend:  http://localhost:3001"
echo "📍 Health:   http://localhost:3001/health"
echo ""
echo "📋 Server Information:"
echo "   - Backend PID: $BACKEND_PID"
echo "   - Frontend PID: $FRONTEND_PID"
echo "   - Logs directory: logs/"
echo ""
echo "🛑 To stop servers, run: ./stop-servers.sh"
echo ""
echo "🌐 Open http://localhost:5173 in your browser to start using GestureVoice!"
echo ""
echo "⚠️  Make sure to allow camera and microphone permissions when prompted."

# Keep the script running and monitor processes
echo "📡 Monitoring servers (Ctrl+C to stop)..."
while true; do
    if ! ps -p $BACKEND_PID > /dev/null; then
        echo "❌ Backend server has stopped unexpectedly"
        break
    fi
    if ! ps -p $FRONTEND_PID > /dev/null; then
        echo "❌ Frontend server has stopped unexpectedly"
        break
    fi
    sleep 5
done

# Cleanup on exit
echo "🧹 Cleaning up processes..."
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
rm -f logs/processes.pid
echo "✅ Cleanup complete"