#!/bin/bash

# Fixed auto-start script with better error handling and path detection

# Configuration - These will be updated by installer
PROJECT_DIR="/home/YOUR_USERNAME/Development/postiz-app"
LOG_FILE="/var/log/postiz-autostart.log"
USER_NAME="YOUR_USERNAME"

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" | tee -a $LOG_FILE
}

# Start logging
log_message "============================================"
log_message "Starting Postiz auto-start process..."
log_message "User: $USER_NAME"
log_message "Project: $PROJECT_DIR"

# Wait for system to be ready
log_message "Waiting for system to be ready..."
sleep 20

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    log_message "ERROR: Project directory does not exist: $PROJECT_DIR"
    exit 1
fi

# Change to project directory
cd "$PROJECT_DIR" || exit 1
log_message "Changed to directory: $(pwd)"

# Set up environment
export NODE_ENV=development
export HOME="/home/$USER_NAME"

# Try to find Node.js and npm in common locations
# First, try system installation
if command -v node &> /dev/null; then
    NODE_BIN=$(which node)
    NPM_BIN=$(which npm)
    log_message "Found system Node.js at: $NODE_BIN"
else
    # Try NVM installation
    export NVM_DIR="$HOME/.nvm"
    if [ -s "$NVM_DIR/nvm.sh" ]; then
        log_message "Loading NVM..."
        . "$NVM_DIR/nvm.sh"
        
        # Try to use Node 20
        nvm use 20 &>> $LOG_FILE || nvm use default &>> $LOG_FILE
        
        NODE_BIN=$(which node)
        NPM_BIN=$(which npm)
        log_message "Found NVM Node.js at: $NODE_BIN"
    else
        # Try common Node paths
        for node_path in \
            "/usr/bin/node" \
            "/usr/local/bin/node" \
            "$HOME/.nvm/versions/node/v20.19.4/bin/node" \
            "$HOME/.nvm/versions/node/v20.17.0/bin/node"; do
            if [ -f "$node_path" ]; then
                NODE_BIN="$node_path"
                NPM_BIN="$(dirname $node_path)/npm"
                log_message "Found Node.js at: $NODE_BIN"
                break
            fi
        done
    fi
fi

# Check if we found Node.js and npm
if [ -z "$NODE_BIN" ] || [ ! -f "$NODE_BIN" ]; then
    log_message "ERROR: Node.js not found! Please ensure Node.js is installed."
    log_message "Searched paths: $PATH"
    exit 1
fi

if [ -z "$NPM_BIN" ] || [ ! -f "$NPM_BIN" ]; then
    log_message "ERROR: npm not found! Please ensure npm is installed."
    exit 1
fi

# Set PATH to include node and npm
export PATH="$(dirname $NODE_BIN):$PATH"

# Log versions
log_message "Node version: $($NODE_BIN --version)"
log_message "NPM version: $($NPM_BIN --version)"
log_message "PATH: $PATH"

# Check if node_modules exists, install if not
if [ ! -d "node_modules" ]; then
    log_message "Installing npm dependencies..."
    $NPM_BIN install &>> $LOG_FILE
    if [ $? -ne 0 ]; then
        log_message "ERROR: npm install failed"
        exit 1
    fi
    log_message "Dependencies installed successfully"
fi

# Start the development server
log_message "Starting development server with: $NPM_BIN run dev"
$NPM_BIN run dev >> $LOG_FILE 2>&1 &

# Get the process ID
PID=$!
log_message "Postiz started with PID: $PID"

# Save PID for service management
echo $PID > /var/run/postiz.pid

# Give it a moment to start
sleep 5

# Check if process is still running
if kill -0 $PID 2>/dev/null; then
    log_message "SUCCESS: Postiz is running on PID $PID"
    log_message "Frontend should be available at: http://localhost:4200"
    log_message "Backend should be available at: http://localhost:3000"
else
    log_message "ERROR: Process died immediately. Check the logs above for errors."
    exit 1
fi

log_message "Auto-start process completed successfully"
log_message "============================================"