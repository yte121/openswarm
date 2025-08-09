#!/usr/bin/env node

/**
 * Claude-Flow Dashboard - Cross-Platform Production Setup Script
 * Supports Windows, macOS, and Linux
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');

class ClaudeFlowSetup {
  constructor() {
    this.platform = os.platform();
    this.arch = os.arch();
    this.isWindows = this.platform === 'win32';
    this.isMacOS = this.platform === 'darwin';
    this.isLinux = this.platform === 'linux';
    
    this.config = {
      nodeVersion: '20.0.0',
      ports: {
        backend: 8001,
        frontend: 3000
      },
      services: {
        backend: 'claude-flow-backend',
        frontend: 'claude-flow-frontend'
      },
      paths: {
        app: process.cwd(),
        logs: path.join(process.cwd(), 'logs'),
        data: path.join(process.cwd(), 'data')
      }
    };
    
    this.colors = {
      reset: '\x1b[0m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m'
    };
  }

  log(message, color = 'white') {
    console.log(`${this.colors[color]}${message}${this.colors.reset}`);
  }

  error(message) {
    this.log(`❌ ERROR: ${message}`, 'red');
  }

  success(message) {
    this.log(`✅ SUCCESS: ${message}`, 'green');
  }

  info(message) {
    this.log(`ℹ️  INFO: ${message}`, 'cyan');
  }

  warn(message) {
    this.log(`⚠️  WARNING: ${message}`, 'yellow');
  }

  async run(command, cwd = process.cwd()) {
    try {
      const result = execSync(command, { 
        cwd, 
        encoding: 'utf8', 
        stdio: 'pipe' 
      });
      return result.trim();
    } catch (error) {
      throw new Error(`Command failed: ${command}\n${error.message}`);
    }
  }

  async checkPrerequisites() {
    this.info('Checking system prerequisites...');

    // Check Node.js
    try {
      const nodeVersion = await this.run('node --version');
      const versionNumber = nodeVersion.replace('v', '');
      if (this.compareVersions(versionNumber, this.config.nodeVersion) < 0) {
        this.error(`Node.js ${this.config.nodeVersion} or higher is required. Found: ${nodeVersion}`);
        return false;
      }
      this.success(`Node.js ${nodeVersion} is installed`);
    } catch (error) {
      this.error('Node.js is not installed. Please install Node.js 20+ from https://nodejs.org/');
      return false;
    }

    // Check npm/yarn
    try {
      const npmVersion = await this.run('npm --version');
      this.success(`npm ${npmVersion} is available`);
    } catch (error) {
      this.error('npm is not available');
      return false;
    }

    // Check yarn (install if needed)
    try {
      const yarnVersion = await this.run('yarn --version');
      this.success(`Yarn ${yarnVersion} is available`);
    } catch (error) {
      this.info('Installing Yarn package manager...');
      try {
        await this.run('npm install -g yarn');
        this.success('Yarn installed successfully');
      } catch (installError) {
        this.error('Failed to install Yarn');
        return false;
      }
    }

    // Check Git
    try {
      const gitVersion = await this.run('git --version');
      this.success(`${gitVersion} is available`);
    } catch (error) {
      this.warn('Git is not installed. Some features may not work properly.');
    }

    // Check ports availability
    if (await this.isPortInUse(this.config.ports.backend)) {
      this.error(`Port ${this.config.ports.backend} is already in use`);
      return false;
    }

    if (await this.isPortInUse(this.config.ports.frontend)) {
      this.error(`Port ${this.config.ports.frontend} is already in use`);
      return false;
    }

    this.success('All prerequisites are met');
    return true;
  }

  async isPortInUse(port) {
    try {
      if (this.isWindows) {
        const result = await this.run(`netstat -an | findstr :${port}`);
        return result.includes(`0.0.0.0:${port}`) || result.includes(`127.0.0.1:${port}`);
      } else {
        const result = await this.run(`lsof -i :${port} || echo ""`);
        return result.trim() !== '';
      }
    } catch (error) {
      return false;
    }
  }

  compareVersions(a, b) {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      
      if (aPart > bPart) return 1;
      if (aPart < bPart) return -1;
    }
    
    return 0;
  }

  async createDirectories() {
    this.info('Creating necessary directories...');

    const directories = [
      this.config.paths.logs,
      this.config.paths.data,
      path.join(this.config.paths.app, 'frontend', 'build'),
      path.join(this.config.paths.app, 'backend', 'uploads')
    ];

    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.success(`Created directory: ${dir}`);
      }
    }
  }

  async installDependencies() {
    this.info('Installing dependencies...');

    // Install backend dependencies
    this.info('Installing backend dependencies...');
    await this.run('yarn install', path.join(this.config.paths.app, 'backend'));
    this.success('Backend dependencies installed');

    // Install frontend dependencies
    this.info('Installing frontend dependencies...');
    await this.run('yarn install', path.join(this.config.paths.app, 'frontend'));
    this.success('Frontend dependencies installed');

    // Install Claude Flow CLI
    this.info('Installing Claude Flow CLI...');
    await this.run('yarn install', path.join(this.config.paths.app, 'claude'));
    this.success('Claude Flow CLI installed');
  }

  async buildApplication() {
    this.info('Building application for production...');

    // Build frontend
    this.info('Building frontend...');
    await this.run('yarn build', path.join(this.config.paths.app, 'frontend'));
    this.success('Frontend built successfully');

    // Build Claude Flow CLI if needed
    try {
      const claudePackageJson = path.join(this.config.paths.app, 'claude', 'package.json');
      if (fs.existsSync(claudePackageJson)) {
        this.info('Building Claude Flow CLI...');
        await this.run('yarn build', path.join(this.config.paths.app, 'claude'));
        this.success('Claude Flow CLI built successfully');
      }
    } catch (error) {
      this.warn('Claude Flow CLI build failed, continuing...');
    }
  }

  async createEnvironmentFiles() {
    this.info('Creating environment configuration files...');

    // Backend .env
    const backendEnvPath = path.join(this.config.paths.app, 'backend', '.env');
    if (!fs.existsSync(backendEnvPath)) {
      const backendEnv = `# Claude-Flow Backend Configuration
NODE_ENV=production
PORT=${this.config.ports.backend}
HOST=0.0.0.0

# OpenRouter Configuration
OPENROUTER_API_KEYS=

# Logging
LOG_LEVEL=info
LOG_FILE=${path.join(this.config.paths.logs, 'backend.log')}

# Security
CORS_ORIGIN=http://localhost:${this.config.ports.frontend}

# Performance
MAX_WORKERS=4
ENABLE_CLUSTERING=true

# Database (if applicable)
DATABASE_URL=

# Session
SESSION_SECRET=${require('crypto').randomBytes(32).toString('hex')}
`;
      fs.writeFileSync(backendEnvPath, backendEnv);
      this.success('Backend environment file created');
    }

    // Frontend .env.production
    const frontendEnvPath = path.join(this.config.paths.app, 'frontend', '.env.production');
    const frontendEnv = `# Claude-Flow Frontend Production Configuration
REACT_APP_BACKEND_URL=http://localhost:${this.config.ports.backend}
REACT_APP_WS_URL=ws://localhost:${this.config.ports.backend}
REACT_APP_ENV=production
REACT_APP_VERSION=2.0.0-alpha.84

# Performance Settings
GENERATE_SOURCEMAP=false
INLINE_RUNTIME_CHUNK=false

# PWA Settings
REACT_APP_PWA_ENABLED=true

# Features
REACT_APP_ENABLE_DARK_MODE=true
REACT_APP_ENABLE_NOTIFICATIONS=true
REACT_APP_ENABLE_WEBSOCKETS=true
`;
    fs.writeFileSync(frontendEnvPath, frontendEnv);
    this.success('Frontend environment file created');
  }

  async setupServices() {
    this.info('Setting up system services...');

    if (this.isWindows) {
      await this.setupWindowsServices();
    } else if (this.isMacOS) {
      await this.setupMacOSServices();
    } else if (this.isLinux) {
      await this.setupLinuxServices();
    }
  }

  async setupWindowsServices() {
    this.info('Setting up Windows services...');

    // Create Windows service scripts
    const backendServiceScript = `@echo off
cd /d "${this.config.paths.app}\\backend"
node server.js
`;
    
    const frontendServiceScript = `@echo off
cd /d "${this.config.paths.app}\\frontend"
npx serve -s build -l ${this.config.ports.frontend}
`;

    fs.writeFileSync(path.join(this.config.paths.app, 'start-backend.bat'), backendServiceScript);
    fs.writeFileSync(path.join(this.config.paths.app, 'start-frontend.bat'), frontendServiceScript);

    // Create combined start script
    const startAllScript = `@echo off
echo Starting Claude-Flow Dashboard...

echo Starting Backend Service...
start "Claude-Flow Backend" cmd /k "${path.join(this.config.paths.app, 'start-backend.bat')}"

timeout /t 5 /nobreak

echo Starting Frontend Service...
start "Claude-Flow Frontend" cmd /k "${path.join(this.config.paths.app, 'start-frontend.bat')}"

echo.
echo Claude-Flow Dashboard is starting...
echo Backend: http://localhost:${this.config.ports.backend}
echo Frontend: http://localhost:${this.config.ports.frontend}
echo.
echo Press any key to stop all services...
pause

echo Stopping services...
taskkill /f /im node.exe
taskkill /f /im serve.exe
`;

    fs.writeFileSync(path.join(this.config.paths.app, 'start-claude-flow.bat'), startAllScript);
    
    this.success('Windows service scripts created');
    this.info('Run start-claude-flow.bat to start the application');
  }

  async setupMacOSServices() {
    this.info('Setting up macOS services with launchd...');

    const launchAgentsDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
    if (!fs.existsSync(launchAgentsDir)) {
      fs.mkdirSync(launchAgentsDir, { recursive: true });
    }

    // Backend service plist
    const backendPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.claude-flow.backend</string>
    <key>ProgramArguments</key>
    <array>
        <string>node</string>
        <string>server.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${this.config.paths.app}/backend</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${this.config.paths.logs}/backend.log</string>
    <key>StandardErrorPath</key>
    <string>${this.config.paths.logs}/backend-error.log</string>
</dict>
</plist>`;

    fs.writeFileSync(path.join(launchAgentsDir, 'com.claude-flow.backend.plist'), backendPlist);

    // Create start/stop scripts
    const startScript = `#!/bin/bash
echo "Starting Claude-Flow Dashboard..."

# Start backend service
launchctl load ~/Library/LaunchAgents/com.claude-flow.backend.plist

# Start frontend (serve static files)
cd "${this.config.paths.app}/frontend"
npx serve -s build -l ${this.config.ports.frontend} &

echo "Claude-Flow Dashboard started!"
echo "Backend: http://localhost:${this.config.ports.backend}"
echo "Frontend: http://localhost:${this.config.ports.frontend}"
`;

    const stopScript = `#!/bin/bash
echo "Stopping Claude-Flow Dashboard..."

# Stop backend service
launchctl unload ~/Library/LaunchAgents/com.claude-flow.backend.plist

# Stop frontend
pkill -f "serve.*build"

echo "Claude-Flow Dashboard stopped!"
`;

    fs.writeFileSync(path.join(this.config.paths.app, 'start-claude-flow.sh'), startScript);
    fs.writeFileSync(path.join(this.config.paths.app, 'stop-claude-flow.sh'), stopScript);

    // Make scripts executable
    await this.run(`chmod +x ${path.join(this.config.paths.app, 'start-claude-flow.sh')}`);
    await this.run(`chmod +x ${path.join(this.config.paths.app, 'stop-claude-flow.sh')}`);

    this.success('macOS services configured');
    this.info('Run ./start-claude-flow.sh to start the application');
  }

  async setupLinuxServices() {
    this.info('Setting up Linux systemd services...');

    // Detect if systemd is available
    let useSystemd = false;
    try {
      await this.run('systemctl --version');
      useSystemd = true;
      this.info('systemd detected, creating systemd services');
    } catch (error) {
      this.info('systemd not available, creating manual scripts');
    }

    if (useSystemd) {
      // Backend systemd service
      const backendService = `[Unit]
Description=Claude-Flow Backend Service
After=network.target

[Service]
Type=simple
User=${os.userInfo().username}
WorkingDirectory=${this.config.paths.app}/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
StandardOutput=file:${this.config.paths.logs}/backend.log
StandardError=file:${this.config.paths.logs}/backend-error.log

[Install]
WantedBy=multi-user.target
`;

      // Frontend systemd service
      const frontendService = `[Unit]
Description=Claude-Flow Frontend Service
After=network.target

[Service]
Type=simple
User=${os.userInfo().username}
WorkingDirectory=${this.config.paths.app}/frontend
ExecStart=/usr/bin/npx serve -s build -l ${this.config.ports.frontend}
Restart=always
RestartSec=10
StandardOutput=file:${this.config.paths.logs}/frontend.log
StandardError=file:${this.config.paths.logs}/frontend-error.log

[Install]
WantedBy=multi-user.target
`;

      // Save service files (user will need to copy them to /etc/systemd/system/)
      fs.writeFileSync(path.join(this.config.paths.app, 'claude-flow-backend.service'), backendService);
      fs.writeFileSync(path.join(this.config.paths.app, 'claude-flow-frontend.service'), frontendService);

      this.warn('Service files created. To install them, run:');
      this.info('sudo cp claude-flow-*.service /etc/systemd/system/');
      this.info('sudo systemctl daemon-reload');
      this.info('sudo systemctl enable claude-flow-backend claude-flow-frontend');
      this.info('sudo systemctl start claude-flow-backend claude-flow-frontend');
    }

    // Create manual start/stop scripts regardless
    const startScript = `#!/bin/bash
echo "Starting Claude-Flow Dashboard..."

# Start backend
cd "${this.config.paths.app}/backend"
nohup node server.js > "${this.config.paths.logs}/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "${this.config.paths.app}/backend.pid"

# Wait a moment for backend to start
sleep 3

# Start frontend
cd "${this.config.paths.app}/frontend"
nohup npx serve -s build -l ${this.config.ports.frontend} > "${this.config.paths.logs}/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "${this.config.paths.app}/frontend.pid"

echo "Claude-Flow Dashboard started!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Backend: http://localhost:${this.config.ports.backend}"
echo "Frontend: http://localhost:${this.config.ports.frontend}"

echo "To stop the services, run: ./stop-claude-flow.sh"
`;

    const stopScript = `#!/bin/bash
echo "Stopping Claude-Flow Dashboard..."

# Stop backend
if [ -f "${this.config.paths.app}/backend.pid" ]; then
    BACKEND_PID=$(cat "${this.config.paths.app}/backend.pid")
    if kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
        echo "Backend stopped (PID: $BACKEND_PID)"
    fi
    rm -f "${this.config.paths.app}/backend.pid"
fi

# Stop frontend
if [ -f "${this.config.paths.app}/frontend.pid" ]; then
    FRONTEND_PID=$(cat "${this.config.paths.app}/frontend.pid")
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID
        echo "Frontend stopped (PID: $FRONTEND_PID)"
    fi
    rm -f "${this.config.paths.app}/frontend.pid"
fi

# Cleanup any remaining processes
pkill -f "node server.js"
pkill -f "serve.*build"

echo "Claude-Flow Dashboard stopped!"
`;

    fs.writeFileSync(path.join(this.config.paths.app, 'start-claude-flow.sh'), startScript);
    fs.writeFileSync(path.join(this.config.paths.app, 'stop-claude-flow.sh'), stopScript);

    // Make scripts executable
    await this.run(`chmod +x ${path.join(this.config.paths.app, 'start-claude-flow.sh')}`);
    await this.run(`chmod +x ${path.join(this.config.paths.app, 'stop-claude-flow.sh')}`);

    this.success('Linux services configured');
    this.info('Run ./start-claude-flow.sh to start the application');
  }

  async createMaintenanceScripts() {
    this.info('Creating maintenance scripts...');

    // Health check script
    const healthCheckScript = this.isWindows ? 
      `@echo off
curl -s http://localhost:${this.config.ports.backend}/api/health || echo "Backend is not responding"
curl -s http://localhost:${this.config.ports.frontend} || echo "Frontend is not responding"
` :
      `#!/bin/bash
echo "Checking Claude-Flow Dashboard health..."

echo "Backend Health:"
curl -s http://localhost:${this.config.ports.backend}/api/health | jq . || echo "Backend is not responding"

echo "Frontend Health:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:${this.config.ports.frontend} || echo "Frontend is not responding"
`;

    const healthCheckFile = this.isWindows ? 'health-check.bat' : 'health-check.sh';
    fs.writeFileSync(path.join(this.config.paths.app, healthCheckFile), healthCheckScript);

    if (!this.isWindows) {
      await this.run(`chmod +x ${path.join(this.config.paths.app, healthCheckFile)}`);
    }

    // Backup script
    const backupScript = this.isWindows ?
      `@echo off
set BACKUP_DIR=backups\\%date:~-4,4%-%date:~-10,2%-%date:~-7,2%
mkdir "%BACKUP_DIR%" 2>nul
xcopy /E /I /Y data "%BACKUP_DIR%\\data"
xcopy /E /I /Y logs "%BACKUP_DIR%\\logs"
echo Backup created in %BACKUP_DIR%
` :
      `#!/bin/bash
BACKUP_DIR="backups/$(date +%Y-%m-%d_%H-%M-%S)"
mkdir -p "$BACKUP_DIR"
cp -r data "$BACKUP_DIR/" 2>/dev/null || echo "No data directory to backup"
cp -r logs "$BACKUP_DIR/" 2>/dev/null || echo "No logs directory to backup"
echo "Backup created in $BACKUP_DIR"
`;

    const backupFile = this.isWindows ? 'backup.bat' : 'backup.sh';
    fs.writeFileSync(path.join(this.config.paths.app, backupFile), backupScript);

    if (!this.isWindows) {
      await this.run(`chmod +x ${path.join(this.config.paths.app, backupFile)}`);
    }

    this.success('Maintenance scripts created');
  }

  async finalizeSetup() {
    this.info('Finalizing setup...');

    // Create README for production deployment
    const readmeContent = `# Claude-Flow Dashboard - Production Deployment

## System Information
- Platform: ${this.platform}
- Architecture: ${this.arch}
- Node.js: ${await this.run('node --version')}
- Setup Date: ${new Date().toISOString()}

## Quick Start

### Starting the Application
${this.isWindows ? 
  'Double-click `start-claude-flow.bat` or run it from command prompt' : 
  'Run `./start-claude-flow.sh`'
}

### Stopping the Application
${this.isWindows ? 
  'Press any key in the service windows or close them' : 
  'Run `./stop-claude-flow.sh`'
}

### Health Check
${this.isWindows ? 
  'Run `health-check.bat`' : 
  'Run `./health-check.sh`'
}

## Access URLs
- Frontend Dashboard: http://localhost:${this.config.ports.frontend}
- Backend API: http://localhost:${this.config.ports.backend}
- Health Check: http://localhost:${this.config.ports.backend}/api/health

## Configuration
- Backend config: \`backend/.env\`
- Frontend config: \`frontend/.env.production\`

## Logs
- Location: \`${this.config.paths.logs}/\`
- Backend logs: \`backend.log\`, \`backend-error.log\`
- Frontend logs: \`frontend.log\`, \`frontend-error.log\`

## Maintenance
- Backup: ${this.isWindows ? 'Run `backup.bat`' : 'Run `./backup.sh`'}
- Update: Re-run this setup script
- Troubleshooting: Check logs in the \`logs/\` directory

## API Configuration
To configure OpenRouter API keys:
1. Edit \`backend/.env\`
2. Set \`OPENROUTER_API_KEYS=your-key-here\`
3. Restart the backend service

## Support
- Documentation: See \`claude/README.md\`
- Issues: https://github.com/ruvnet/claude-flow/issues
`;

    fs.writeFileSync(path.join(this.config.paths.app, 'PRODUCTION-README.md'), readmeContent);

    this.success('Production setup completed successfully!');
    this.log('');
    this.log('🎉 Claude-Flow Dashboard is ready for production!', 'green');
    this.log('');
    this.info('Next steps:');
    this.info('1. Configure your OpenRouter API keys in backend/.env');
    this.info('2. Start the application:');
    if (this.isWindows) {
      this.info('   Double-click start-claude-flow.bat');
    } else {
      this.info('   ./start-claude-flow.sh');
    }
    this.info('3. Access the dashboard at http://localhost:3000');
    this.log('');
    this.info('For detailed instructions, see PRODUCTION-README.md');
  }

  async setup() {
    try {
      this.log('🚀 Starting Claude-Flow Dashboard Production Setup...', 'magenta');
      this.log('');

      if (!(await this.checkPrerequisites())) {
        process.exit(1);
      }

      await this.createDirectories();
      await this.installDependencies();
      await this.buildApplication();
      await this.createEnvironmentFiles();
      await this.setupServices();
      await this.createMaintenanceScripts();
      await this.finalizeSetup();

    } catch (error) {
      this.error(`Setup failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new ClaudeFlowSetup();
  setup.setup().catch(console.error);
}

module.exports = ClaudeFlowSetup;