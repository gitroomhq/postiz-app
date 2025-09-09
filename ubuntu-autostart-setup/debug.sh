#!/bin/bash

echo "=== Postiz Auto-Start Debug Script ==="
echo

echo "1. Checking Node.js and npm paths:"
echo "Node path: $(which node)"
echo "NPM path: $(which npm)"
echo "Node version: $(node --version 2>/dev/null || echo 'Node not found')"
echo "NPM version: $(npm --version 2>/dev/null || echo 'NPM not found')"
echo

echo "2. Checking NVM installation:"
if [ -d "$HOME/.nvm" ]; then
    echo "NVM directory exists at: $HOME/.nvm"
    echo "NVM Node versions installed:"
    ls -la $HOME/.nvm/versions/node/ 2>/dev/null || echo "No versions found"
else
    echo "NVM not found"
fi
echo

echo "3. Checking project directory:"
PROJECT_DIR="/home/$(whoami)/Development/postiz-app"
echo "Expected project dir: $PROJECT_DIR"
if [ -d "$PROJECT_DIR" ]; then
    echo "✓ Project directory exists"
    if [ -f "$PROJECT_DIR/package.json" ]; then
        echo "✓ package.json found"
    else
        echo "✗ package.json NOT found"
    fi
else
    echo "✗ Project directory does NOT exist"
fi
echo

echo "4. Checking service files:"
if [ -f "/opt/postiz/auto-start.sh" ]; then
    echo "✓ Auto-start script exists"
    echo "Permissions: $(ls -la /opt/postiz/auto-start.sh)"
else
    echo "✗ Auto-start script NOT found"
fi

if [ -f "/etc/systemd/system/postiz-autostart.service" ]; then
    echo "✓ Service file exists"
else
    echo "✗ Service file NOT found"
fi
echo

echo "5. Testing npm command as service user:"
sudo -u $(whoami) bash -c 'cd ~/Development/postiz-app && npm --version' 2>&1 || echo "NPM test failed"
echo

echo "6. Checking environment paths in service:"
echo "Current PATH: $PATH"
echo

echo "7. Manual test of start script:"
echo "Try running: sudo -u $(whoami) /bin/bash /opt/postiz/auto-start.sh"
echo "This will show you the actual error"