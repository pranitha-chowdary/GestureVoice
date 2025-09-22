#!/bin/bash

# GestureVoice Development Server Stop Script

echo "🛑 Stopping GestureVoice Development Servers..."

# Check if processes file exists
if [ -f "logs/processes.pid" ]; then
    source logs/processes.pid
    
    # Stop backend server
    if [ ! -z "$BACKEND_PID" ]; then
        if ps -p $BACKEND_PID > /dev/null; then
            echo "🔄 Stopping backend server (PID: $BACKEND_PID)..."
            kill $BACKEND_PID
            echo "✅ Backend server stopped"
        else
            echo "ℹ️  Backend server was not running"
        fi
    fi
    
    # Stop frontend server
    if [ ! -z "$FRONTEND_PID" ]; then
        if ps -p $FRONTEND_PID > /dev/null; then
            echo "🔄 Stopping frontend server (PID: $FRONTEND_PID)..."
            kill $FRONTEND_PID
            echo "✅ Frontend server stopped"
        else
            echo "ℹ️  Frontend server was not running"
        fi
    fi
    
    # Clean up process file
    rm logs/processes.pid
else
    echo "ℹ️  No active servers found to stop"
    
    # Try to find and kill any remaining processes
    echo "🔍 Checking for any remaining GestureVoice processes..."
    
    # Kill any node processes running on our ports
    BACKEND_PROC=$(lsof -t -i:3001 2>/dev/null)
    if [ ! -z "$BACKEND_PROC" ]; then
        echo "🔄 Found process on port 3001, stopping..."
        kill $BACKEND_PROC
        echo "✅ Process on port 3001 stopped"
    fi
    
    FRONTEND_PROC=$(lsof -t -i:5173 2>/dev/null)
    if [ ! -z "$FRONTEND_PROC" ]; then
        echo "🔄 Found process on port 5173, stopping..."
        kill $FRONTEND_PROC
        echo "✅ Process on port 5173 stopped"
    fi
fi

# Wait a moment for processes to terminate
sleep 2

# Force kill if necessary
echo "🔍 Checking for any stubborn processes..."
REMAINING_3001=$(lsof -t -i:3001 2>/dev/null)
if [ ! -z "$REMAINING_3001" ]; then
    echo "⚠️  Force stopping process on port 3001..."
    kill -9 $REMAINING_3001
fi

REMAINING_5173=$(lsof -t -i:5173 2>/dev/null)
if [ ! -z "$REMAINING_5173" ]; then
    echo "⚠️  Force stopping process on port 5173..."
    kill -9 $REMAINING_5173
fi

echo ""
echo "✅ All GestureVoice servers have been stopped"
echo "📍 Ports 3001 and 5173 are now available"
echo ""