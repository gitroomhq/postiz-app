#!/bin/bash

# Postiz Auto-Start Installation Script for Ubuntu
# This script sets up automatic startup of Postiz development server on Ubuntu boot

set -e

echo "========================================="
echo "Postiz Auto-Start Installation Script"
echo "========================================="

# Get current user
CURRENT_USER=$(whoami)
echo "Current user: $CURRENT_USER"

# Check if running as root (we need sudo for some operations)
if [ "$EUID" -eq 0 ]; then
    echo "Please run this script as your regular user (not as root/sudo)"
    echo "The script will ask for sudo password when needed."
    exit 1
fi

# Check if we're on Ubuntu
if ! grep -q "Ubuntu\|Debian" /etc/os-release; then
    echo "Warning: This script is designed for Ubuntu/Debian systems"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo
echo "Step 1: Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "Node.js found: $NODE_VERSION"
else
    echo "ERROR: Node.js is not installed."
    echo "Please install Node.js 20.x before running this script."
    echo "You can install it using: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi

echo
echo "Step 2: Checking npm installation..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "npm found: $NPM_VERSION"
else
    echo "ERROR: npm is not installed."
    exit 1
fi

echo
echo "Step 3: Getting project directory path..."
echo "Current directory: $(pwd)"

# Check if we're in the postiz project directory
if [ ! -f "package.json" ] || ! grep -q "gitroom\|postiz" package.json; then
    echo "ERROR: Please run this script from your Postiz project directory"
    echo "The directory should contain package.json with your Postiz project"
    exit 1
fi

PROJECT_DIR=$(pwd)
echo "Project directory: $PROJECT_DIR"

echo
echo "Step 4: Updating configuration files..."

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Update auto-start.sh with current user and project path
sed -i.bak "s|YOUR_USERNAME|$CURRENT_USER|g" "$SCRIPT_DIR/auto-start.sh"
sed -i.bak "s|/home/YOUR_USERNAME/projects/faizan/upstrapp/postiz-app-copy|$PROJECT_DIR|g" "$SCRIPT_DIR/auto-start.sh"

# Update service file with current user and project path
sed -i.bak "s|YOUR_USERNAME|$CURRENT_USER|g" "$SCRIPT_DIR/postiz-autostart.service"
sed -i.bak "s|/home/YOUR_USERNAME/projects/faizan/upstrapp/postiz-app-copy|$PROJECT_DIR|g" "$SCRIPT_DIR/postiz-autostart.service"

echo "Configuration files updated for user: $CURRENT_USER"
echo "Project path: $PROJECT_DIR"

echo
echo "Step 5: Installing files (requires sudo)..."

# Create directory for script
sudo mkdir -p /opt/postiz

# Copy and install auto-start script
sudo cp "$SCRIPT_DIR/auto-start.sh" /opt/postiz/
sudo chmod +x /opt/postiz/auto-start.sh
sudo chown root:root /opt/postiz/auto-start.sh

# Install systemd service
sudo cp "$SCRIPT_DIR/postiz-autostart.service" /etc/systemd/system/
sudo chown root:root /etc/systemd/system/postiz-autostart.service

echo
echo "Step 6: Setting up log files and permissions..."

# Create log file
sudo touch /var/log/postiz-autostart.log
sudo chown $CURRENT_USER:$CURRENT_USER /var/log/postiz-autostart.log

# Create PID file
sudo touch /var/run/postiz.pid
sudo chown $CURRENT_USER:$CURRENT_USER /var/run/postiz.pid

echo
echo "Step 7: Enabling the service..."

# Reload systemd and enable service
sudo systemctl daemon-reload
sudo systemctl enable postiz-autostart.service

echo
echo "Step 8: Testing the installation..."
echo "Starting the service for testing..."

sudo systemctl start postiz-autostart.service

# Wait a moment for service to start
sleep 5

# Check service status
if sudo systemctl is-active --quiet postiz-autostart.service; then
    echo "✓ Service is running successfully!"
    echo "✓ Your Postiz app should now start automatically on boot"
    echo
    echo "You can check the status with:"
    echo "  sudo systemctl status postiz-autostart.service"
    echo
    echo "Check logs with:"
    echo "  sudo tail -f /var/log/postiz-autostart.log"
    echo "  sudo journalctl -u postiz-autostart.service -f"
    echo
    echo "In about 30-60 seconds, you should be able to access:"
    echo "  Frontend: http://localhost:4200"
    echo "  Backend API: http://localhost:3000"
else
    echo "❌ Service failed to start. Checking logs..."
    sudo systemctl status postiz-autostart.service --no-pager
    echo
    echo "Check the logs for errors:"
    echo "  sudo journalctl -u postiz-autostart.service --no-pager"
    exit 1
fi

echo
echo "========================================="
echo "Installation completed successfully!"
echo "========================================="
echo
echo "Your Postiz development server will now start automatically every time you boot Ubuntu."
echo
echo "To manage the service:"
echo "  Start:   sudo systemctl start postiz-autostart.service"
echo "  Stop:    sudo systemctl stop postiz-autostart.service"
echo "  Restart: sudo systemctl restart postiz-autostart.service"
echo "  Disable: sudo systemctl disable postiz-autostart.service"
echo "  Enable:  sudo systemctl enable postiz-autostart.service"
echo
echo "Reboot your system to test the automatic startup!"