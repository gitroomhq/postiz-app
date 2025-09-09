# Postiz Auto-Start Setup for Ubuntu

This directory contains all the files needed to set up automatic startup of your Postiz development server on Ubuntu.

## What This Does

When properly installed, your Postiz project will automatically start every time you boot your Ubuntu system. You'll be able to access:
- Frontend: http://localhost:4200
- Backend API: http://localhost:3000

No manual commands needed - it starts automatically!

## Files Included

1. **auto-start.sh** - The main startup script that runs your project
2. **postiz-autostart.service** - Systemd service configuration
3. **install.sh** - Automated installation script
4. **README.md** - This file with instructions

## Quick Setup (Recommended)

### Step 1: Transfer to Ubuntu
Copy this entire `ubuntu-autostart-setup` folder to your Ubuntu system in your Postiz project directory.

### Step 2: Run the Installation Script
```bash
cd your-postiz-project/ubuntu-autostart-setup
chmod +x install.sh
./install.sh
```

The install script will:
- Check your system requirements
- Update all configuration files with your username and paths
- Install the service files
- Enable auto-start on boot
- Test the installation

### Step 3: Reboot to Test
```bash
sudo reboot
```

After reboot, wait 1-2 minutes and check http://localhost:4200

## Manual Setup (Advanced)

If you prefer to install manually:

### Prerequisites
- Ubuntu/Debian system
- Node.js 20.x installed
- npm installed
- Your Postiz project on the Ubuntu system

### Manual Installation Steps

1. **Update configuration files:**
   ```bash
   # Replace YOUR_USERNAME with your actual username in both files:
   sed -i "s/YOUR_USERNAME/$(whoami)/g" auto-start.sh
   sed -i "s/YOUR_USERNAME/$(whoami)/g" postiz-autostart.service
   
   # Update project path (replace with your actual project path):
   sed -i "s|/home/YOUR_USERNAME/projects/faizan/upstrapp/postiz-app-copy|$(pwd)|g" auto-start.sh
   sed -i "s|/home/YOUR_USERNAME/projects/faizan/upstrapp/postiz-app-copy|$(pwd)|g" postiz-autostart.service
   ```

2. **Install files:**
   ```bash
   sudo mkdir -p /opt/postiz
   sudo cp auto-start.sh /opt/postiz/
   sudo chmod +x /opt/postiz/auto-start.sh
   sudo cp postiz-autostart.service /etc/systemd/system/
   ```

3. **Set up permissions:**
   ```bash
   sudo touch /var/log/postiz-autostart.log
   sudo chown $(whoami):$(whoami) /var/log/postiz-autostart.log
   sudo touch /var/run/postiz.pid
   sudo chown $(whoami):$(whoami) /var/run/postiz.pid
   ```

4. **Enable service:**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable postiz-autostart.service
   sudo systemctl start postiz-autostart.service
   ```

## Management Commands

Once installed, you can manage the auto-start service:

```bash
# Check status
sudo systemctl status postiz-autostart.service

# Start service
sudo systemctl start postiz-autostart.service

# Stop service
sudo systemctl stop postiz-autostart.service

# Restart service
sudo systemctl restart postiz-autostart.service

# Disable auto-start (won't start on boot)
sudo systemctl disable postiz-autostart.service

# Re-enable auto-start
sudo systemctl enable postiz-autostart.service

# View real-time logs
sudo journalctl -u postiz-autostart.service -f

# View startup log file
sudo tail -f /var/log/postiz-autostart.log
```

## Troubleshooting

### Service Won't Start
```bash
# Check service status and logs
sudo systemctl status postiz-autostart.service
sudo journalctl -u postiz-autostart.service --no-pager

# Check startup log
cat /var/log/postiz-autostart.log
```

### Node.js Not Found
If you're using NVM (Node Version Manager), uncomment these lines in `auto-start.sh`:
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20
```

### Permission Issues
Make sure all files have correct ownership:
```bash
sudo chown $(whoami):$(whoami) /var/log/postiz-autostart.log
sudo chown $(whoami):$(whoami) /var/run/postiz.pid
```

### Port Already in Use
If ports 3000 or 4200 are already in use:
```bash
# Kill existing processes
sudo pkill -f "npm run dev"
sudo systemctl restart postiz-autostart.service
```

## Uninstalling

To remove the auto-start service:

```bash
# Stop and disable the service
sudo systemctl stop postiz-autostart.service
sudo systemctl disable postiz-autostart.service

# Remove files
sudo rm /etc/systemd/system/postiz-autostart.service
sudo rm -rf /opt/postiz
sudo rm /var/log/postiz-autostart.log
sudo rm /var/run/postiz.pid

# Reload systemd
sudo systemctl daemon-reload
```

## Support

If you encounter issues:
1. Check the logs: `sudo journalctl -u postiz-autostart.service -f`
2. Verify Node.js installation: `node --version && npm --version`
3. Check project path is correct in the configuration files
4. Ensure all file permissions are set correctly

## Security Notes

- The service runs as your user account (not root)
- Log files are created with your user ownership
- The service has restricted file system access
- Only necessary directories are writable