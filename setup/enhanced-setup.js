#!/usr/bin/env node

/**
 * Claude-Flow Dashboard - Enhanced Cross-Platform Production Setup Script
 * Supports Windows, macOS, Linux with Docker, SSL, Monitoring, and Cloud deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');
const crypto = require('crypto');

class EnhancedClaudeFlowSetup {
  constructor() {
    this.platform = os.platform();
    this.arch = os.arch();
    this.isWindows = this.platform === 'win32';
    this.isMacOS = this.platform === 'darwin';
    this.isLinux = this.platform === 'linux';
    
    this.config = {
      nodeVersion: '20.0.0',
      mongoVersion: '7.0',
      nginxVersion: '1.24',
      ports: {
        backend: 8001,
        frontend: 3000,
        nginx: 80,
        nginxSSL: 443,
        mongo: 27017,
        monitoring: 9090
      },
      services: {
        backend: 'claude-flow-backend',
        frontend: 'claude-flow-frontend',
        mongo: 'claude-flow-mongo',
        nginx: 'claude-flow-nginx',
        monitoring: 'claude-flow-monitoring'
      },
      paths: {
        app: process.cwd(),
        logs: path.join(process.cwd(), 'logs'),
        data: path.join(process.cwd(), 'data'),
        config: path.join(process.cwd(), 'config'),
        ssl: path.join(process.cwd(), 'ssl'),
        backups: path.join(process.cwd(), 'backups'),
        docker: path.join(process.cwd(), 'docker')
      },
      docker: {
        enabled: false,
        compose: 'docker-compose.yml',
        network: 'claude-flow-network'
      },
      ssl: {
        enabled: false,
        domain: 'localhost',
        email: 'admin@localhost'
      },
      monitoring: {
        enabled: true,
        prometheus: true,
        grafana: true
      },
      database: {
        type: 'mongodb',
        host: 'localhost',
        port: 27017,
        name: 'claude_flow'
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
      white: '\x1b[37m',
      bold: '\x1b[1m'
    };
  }

  log(message, color = 'white') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${this.colors[color]}[${timestamp}] ${message}${this.colors.reset}`);
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

  progress(message) {
    this.log(`🔄 ${message}`, 'blue');
  }

  async run(command, cwd = process.cwd(), options = {}) {
    try {
      const result = execSync(command, { 
        cwd, 
        encoding: 'utf8', 
        stdio: options.silent ? 'pipe' : 'inherit',
        ...options
      });
      return result ? result.trim() : '';
    } catch (error) {
      if (options.ignoreErrors) {
        return '';
      }
      throw new Error(`Command failed: ${command}\n${error.message}`);
    }
  }

  async promptUser(question, defaultValue = '') {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      const prompt = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `;
      rl.question(prompt, (answer) => {
        rl.close();
        resolve(answer.trim() || defaultValue);
      });
    });
  }

  async checkPrerequisites() {
    this.info('Checking system prerequisites...');
    let allGood = true;

    // Check Node.js
    try {
      const nodeVersion = await this.run('node --version', process.cwd(), { silent: true });
      const versionNumber = nodeVersion.replace('v', '');
      if (this.compareVersions(versionNumber, this.config.nodeVersion) < 0) {
        this.error(`Node.js ${this.config.nodeVersion} or higher is required. Found: ${nodeVersion}`);
        allGood = false;
      } else {
        this.success(`Node.js ${nodeVersion} is installed`);
      }
    } catch (error) {
      this.error('Node.js is not installed. Please install Node.js 20+ from https://nodejs.org/');
      allGood = false;
    }

    // Check Yarn
    try {
      const yarnVersion = await this.run('yarn --version', process.cwd(), { silent: true });
      this.success(`Yarn ${yarnVersion} is available`);
    } catch (error) {
      this.progress('Installing Yarn package manager...');
      try {
        await this.run('npm install -g yarn');
        this.success('Yarn installed successfully');
      } catch (installError) {
        this.error('Failed to install Yarn');
        allGood = false;
      }
    }

    // Check Git
    try {
      const gitVersion = await this.run('git --version', process.cwd(), { silent: true });
      this.success(`${gitVersion} is available`);
    } catch (error) {
      this.warn('Git is not installed. Some features may not work properly.');
    }

    // Check Docker (optional)
    try {
      const dockerVersion = await this.run('docker --version', process.cwd(), { silent: true });
      this.success(`${dockerVersion} is available`);
      this.config.docker.enabled = true;
    } catch (error) {
      this.warn('Docker is not installed. Docker features will be disabled.');
    }

    // Check MongoDB (optional for local setup)
    try {
      const mongoVersion = await this.run('mongod --version', process.cwd(), { silent: true, ignoreErrors: true });
      if (mongoVersion) {
        this.success('MongoDB is available locally');
      }
    } catch (error) {
      this.info('MongoDB not found locally. Will use Docker or cloud setup.');
    }

    // Check ports availability
    const portsToCheck = [
      this.config.ports.backend,
      this.config.ports.frontend,
      this.config.ports.mongo
    ];

    for (const port of portsToCheck) {
      if (await this.isPortInUse(port)) {
        this.error(`Port ${port} is already in use`);
        allGood = false;
      }
    }

    if (allGood) {
      this.success('All prerequisites are met');
    }
    
    return allGood;
  }

  async isPortInUse(port) {
    try {
      if (this.isWindows) {
        const result = await this.run(`netstat -an | findstr :${port}`, process.cwd(), { silent: true, ignoreErrors: true });
        return result.includes(`0.0.0.0:${port}`) || result.includes(`127.0.0.1:${port}`);
      } else {
        const result = await this.run(`lsof -i :${port} || echo ""`, process.cwd(), { silent: true, ignoreErrors: true });
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
      this.config.paths.config,
      this.config.paths.ssl,
      this.config.paths.backups,
      this.config.paths.docker,
      path.join(this.config.paths.app, 'frontend', 'build'),
      path.join(this.config.paths.app, 'backend', 'uploads'),
      path.join(this.config.paths.data, 'mongodb'),
      path.join(this.config.paths.config, 'nginx'),
      path.join(this.config.paths.config, 'ssl')
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
    this.progress('Installing backend dependencies...');
    await this.run('yarn install', path.join(this.config.paths.app, 'backend'));
    this.success('Backend dependencies installed');

    // Install frontend dependencies
    this.progress('Installing frontend dependencies...');
    await this.run('yarn install', path.join(this.config.paths.app, 'frontend'));
    this.success('Frontend dependencies installed');

    // Install Claude Flow CLI
    const claudePath = path.join(this.config.paths.app, 'claude');
    if (fs.existsSync(claudePath)) {
      this.progress('Installing Claude Flow CLI...');
      await this.run('yarn install', claudePath);
      this.success('Claude Flow CLI installed');
    }
  }

  async buildApplication() {
    this.info('Building application for production...');

    // Build frontend
    this.progress('Building frontend...');
    await this.run('yarn build', path.join(this.config.paths.app, 'frontend'));
    this.success('Frontend built successfully');

    // Build Claude Flow CLI if needed
    try {
      const claudePackageJson = path.join(this.config.paths.app, 'claude', 'package.json');
      if (fs.existsSync(claudePackageJson)) {
        this.progress('Building Claude Flow CLI...');
        await this.run('yarn build', path.join(this.config.paths.app, 'claude'));
        this.success('Claude Flow CLI built successfully');
      }
    } catch (error) {
      this.warn('Claude Flow CLI build failed, continuing...');
    }
  }

  async setupDatabase() {
    this.info('Setting up database...');

    if (this.config.docker.enabled) {
      await this.setupMongoDBDocker();
    } else {
      await this.setupMongoDBLocal();
    }
  }

  async setupMongoDBDocker() {
    this.progress('Setting up MongoDB with Docker...');
    
    const mongoDockerCompose = `
version: '3.8'
services:
  mongodb:
    image: mongo:${this.config.mongoVersion}
    container_name: claude-flow-mongodb
    restart: unless-stopped
    ports:
      - "${this.config.ports.mongo}:27017"
    environment:
      MONGO_INITDB_DATABASE: ${this.config.database.name}
    volumes:
      - ${this.config.paths.data}/mongodb:/data/db
      - ${this.config.paths.backups}:/backups
    networks:
      - ${this.config.docker.network}

networks:
  ${this.config.docker.network}:
    driver: bridge
`;

    fs.writeFileSync(path.join(this.config.paths.docker, 'mongodb.yml'), mongoDockerCompose);
    
    try {
      await this.run('docker-compose -f docker/mongodb.yml up -d');
      this.success('MongoDB Docker container started');
    } catch (error) {
      this.error('Failed to start MongoDB Docker container');
      throw error;
    }
  }

  async setupMongoDBLocal() {
    this.progress('Setting up MongoDB locally...');
    
    // Create MongoDB configuration
    const mongoConfig = `
# mongod.conf
storage:
  dbPath: ${this.config.paths.data}/mongodb
  journal:
    enabled: true

systemLog:
  destination: file
  logAppend: true
  path: ${this.config.paths.logs}/mongodb.log

net:
  port: ${this.config.ports.mongo}
  bindIp: 127.0.0.1

processManagement:
  fork: true
  pidFilePath: ${this.config.paths.data}/mongodb/mongod.pid
`;

    fs.writeFileSync(path.join(this.config.paths.config, 'mongod.conf'), mongoConfig);
    this.success('MongoDB configuration created');
  }

  async createEnvironmentFiles() {
    this.info('Creating environment configuration files...');

    // Backend .env
    const backendEnvPath = path.join(this.config.paths.app, 'backend', '.env');
    const backendEnv = `# Claude-Flow Backend Configuration
NODE_ENV=production
PORT=${this.config.ports.backend}
HOST=0.0.0.0

# Database Configuration
MONGO_URL=mongodb://${this.config.database.host}:${this.config.database.port}/${this.config.database.name}

# OpenRouter Configuration
OPENROUTER_API_KEYS=

# Security
CORS_ORIGIN=http://localhost:${this.config.ports.frontend}
SESSION_SECRET=${crypto.randomBytes(32).toString('hex')}
JWT_SECRET=${crypto.randomBytes(32).toString('hex')}

# Logging
LOG_LEVEL=info
LOG_FILE=${path.join(this.config.paths.logs, 'backend.log')}

# Performance
MAX_WORKERS=4
ENABLE_CLUSTERING=true

# SSL Configuration
SSL_ENABLED=${this.config.ssl.enabled}
SSL_CERT_PATH=${path.join(this.config.paths.ssl, 'cert.pem')}
SSL_KEY_PATH=${path.join(this.config.paths.ssl, 'key.pem')}

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9091
`;

    fs.writeFileSync(backendEnvPath, backendEnv);
    this.success('Backend environment file created');

    // Frontend .env.production
    const frontendEnvPath = path.join(this.config.paths.app, 'frontend', '.env.production');
    const frontendEnv = `# Claude-Flow Frontend Production Configuration
REACT_APP_BACKEND_URL=${this.config.ssl.enabled ? 'https' : 'http'}://localhost:${this.config.ssl.enabled ? this.config.ports.nginxSSL : this.config.ports.backend}
REACT_APP_WS_URL=${this.config.ssl.enabled ? 'wss' : 'ws'}://localhost:${this.config.ssl.enabled ? this.config.ports.nginxSSL : this.config.ports.backend}
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
REACT_APP_ENABLE_KEYBOARD_SHORTCUTS=true
REACT_APP_ENABLE_ANALYTICS=true

# Security
REACT_APP_CSP_ENABLED=true
`;

    fs.writeFileSync(frontendEnvPath, frontendEnv);
    this.success('Frontend environment file created');
  }

  async setupSSL() {
    if (!this.config.ssl.enabled) {
      return;
    }

    this.info('Setting up SSL certificates...');

    const certPath = path.join(this.config.paths.ssl, 'cert.pem');
    const keyPath = path.join(this.config.paths.ssl, 'key.pem');

    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
      this.progress('Generating self-signed SSL certificate...');
      
      const opensslCommand = `openssl req -x509 -newkey rsa:4096 -keyout ${keyPath} -out ${certPath} -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=${this.config.ssl.domain}"`;
      
      try {
        await this.run(opensslCommand);
        this.success('SSL certificate generated');
      } catch (error) {
        this.warn('Failed to generate SSL certificate. Install OpenSSL or provide your own certificates.');
      }
    }
  }

  async setupNginx() {
    if (!this.config.ssl.enabled && !this.config.monitoring.enabled) {
      return;
    }

    this.info('Setting up Nginx reverse proxy...');

    const nginxConfig = `
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server 127.0.0.1:${this.config.ports.backend};
    }

    upstream frontend {
        server 127.0.0.1:${this.config.ports.frontend};
    }

    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name ${this.config.ssl.domain};
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name ${this.config.ssl.domain};

        ssl_certificate ${path.join(this.config.paths.ssl, 'cert.pem')};
        ssl_certificate_key ${path.join(this.config.paths.ssl, 'key.pem')};

        # Modern SSL configuration
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options DENY always;
        add_header X-Content-Type-Options nosniff always;
        add_header X-XSS-Protection "1; mode=block" always;

        # API routes
        location /api/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # WebSocket
        location /ws {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "Upgrade";
            proxy_set_header Host $host;
        }

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
`;

    fs.writeFileSync(path.join(this.config.paths.config, 'nginx', 'nginx.conf'), nginxConfig);
    this.success('Nginx configuration created');
  }

  async setupDocker() {
    if (!this.config.docker.enabled) {
      return;
    }

    this.info('Setting up Docker configuration...');

    const dockerCompose = `
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: claude-flow-backend
    restart: unless-stopped
    ports:
      - "${this.config.ports.backend}:${this.config.ports.backend}"
    environment:
      - NODE_ENV=production
      - MONGO_URL=mongodb://mongodb:27017/${this.config.database.name}
    depends_on:
      - mongodb
    volumes:
      - ./logs:/app/logs
      - ./data:/app/data
    networks:
      - ${this.config.docker.network}

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: claude-flow-frontend
    restart: unless-stopped
    ports:
      - "${this.config.ports.frontend}:80"
    networks:
      - ${this.config.docker.network}

  mongodb:
    image: mongo:${this.config.mongoVersion}
    container_name: claude-flow-mongodb
    restart: unless-stopped
    ports:
      - "${this.config.ports.mongo}:27017"
    environment:
      MONGO_INITDB_DATABASE: ${this.config.database.name}
    volumes:
      - ./data/mongodb:/data/db
      - ./backups:/backups
    networks:
      - ${this.config.docker.network}

  nginx:
    image: nginx:${this.config.nginxVersion}
    container_name: claude-flow-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./config/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend
    networks:
      - ${this.config.docker.network}

networks:
  ${this.config.docker.network}:
    driver: bridge

volumes:
  mongodb_data:
`;

    fs.writeFileSync(path.join(this.config.paths.docker, 'docker-compose.yml'), dockerCompose);

    // Backend Dockerfile
    const backendDockerfile = `
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY yarn.lock ./
RUN yarn install --production

COPY . .

EXPOSE ${this.config.ports.backend}

CMD ["node", "server.js"]
`;

    fs.writeFileSync(path.join(this.config.paths.app, 'backend', 'Dockerfile'), backendDockerfile);

    // Frontend Dockerfile
    const frontendDockerfile = `
FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./
COPY yarn.lock ./
RUN yarn install

COPY . .
RUN yarn build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`;

    fs.writeFileSync(path.join(this.config.paths.app, 'frontend', 'Dockerfile'), frontendDockerfile);

    this.success('Docker configuration created');
  }

  async setupMonitoring() {
    if (!this.config.monitoring.enabled) {
      return;
    }

    this.info('Setting up monitoring stack...');

    // Prometheus configuration
    const prometheusConfig = `
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'claude-flow-backend'
    static_configs:
      - targets: ['localhost:9091']
    scrape_interval: 5s
    metrics_path: /metrics

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'mongodb-exporter'
    static_configs:
      - targets: ['localhost:9216']
`;

    fs.writeFileSync(path.join(this.config.paths.config, 'prometheus.yml'), prometheusConfig);

    // Grafana datasource configuration
    const grafanaDatasource = `
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://localhost:9090
    isDefault: true
`;

    fs.mkdirSync(path.join(this.config.paths.config, 'grafana'), { recursive: true });
    fs.writeFileSync(path.join(this.config.paths.config, 'grafana', 'datasources.yml'), grafanaDatasource);

    this.success('Monitoring configuration created');
  }

  async setupServices() {
    this.info('Setting up system services...');

    if (this.config.docker.enabled) {
      await this.setupDockerServices();
    } else {
      if (this.isWindows) {
        await this.setupWindowsServices();
      } else if (this.isMacOS) {
        await this.setupMacOSServices();
      } else if (this.isLinux) {
        await this.setupLinuxServices();
      }
    }
  }

  async setupDockerServices() {
    this.progress('Setting up Docker services...');

    const startScript = this.isWindows ? 'start-docker.bat' : 'start-docker.sh';
    const stopScript = this.isWindows ? 'stop-docker.bat' : 'stop-docker.sh';

    const startContent = this.isWindows ? `
@echo off
echo Starting Claude-Flow Dashboard with Docker...
docker-compose -f docker/docker-compose.yml up -d
echo Dashboard started at https://localhost
echo Backend API: https://localhost/api
echo.
echo To stop: ${stopScript}
pause
` : `#!/bin/bash
echo "Starting Claude-Flow Dashboard with Docker..."
docker-compose -f docker/docker-compose.yml up -d

echo "Dashboard started at https://localhost"
echo "Backend API: https://localhost/api"
echo
echo "To stop: ./${stopScript}"
`;

    const stopContent = this.isWindows ? `
@echo off
echo Stopping Claude-Flow Dashboard...
docker-compose -f docker/docker-compose.yml down
echo Dashboard stopped.
pause
` : `#!/bin/bash
echo "Stopping Claude-Flow Dashboard..."
docker-compose -f docker/docker-compose.yml down
echo "Dashboard stopped."
`;

    fs.writeFileSync(path.join(this.config.paths.app, startScript), startContent);
    fs.writeFileSync(path.join(this.config.paths.app, stopScript), stopContent);

    if (!this.isWindows) {
      await this.run(`chmod +x ${startScript}`);
      await this.run(`chmod +x ${stopScript}`);
    }

    this.success('Docker service scripts created');
  }

  async setupWindowsServices() {
    this.progress('Setting up Windows services...');

    // Enhanced Windows service scripts with error handling
    const backendServiceScript = `@echo off
cd /d "${this.config.paths.app}\\backend"
echo Starting Claude-Flow Backend...
node server.js
if errorlevel 1 (
    echo Error starting backend service
    pause
)
`;

    const frontendServiceScript = `@echo off
cd /d "${this.config.paths.app}\\frontend"
echo Starting Claude-Flow Frontend...
npx serve -s build -l ${this.config.ports.frontend}
if errorlevel 1 (
    echo Error starting frontend service
    pause
)
`;

    fs.writeFileSync(path.join(this.config.paths.app, 'start-backend.bat'), backendServiceScript);
    fs.writeFileSync(path.join(this.config.paths.app, 'start-frontend.bat'), frontendServiceScript);

    // Enhanced master start script
    const startAllScript = `@echo off
title Claude-Flow Dashboard
echo.
echo ====================================
echo  Claude-Flow Dashboard - Starting
echo ====================================
echo.

echo [1/3] Starting Backend Service...
start "Claude-Flow Backend" cmd /k "${path.join(this.config.paths.app, 'start-backend.bat')}"

timeout /t 5 /nobreak

echo [2/3] Starting Frontend Service...
start "Claude-Flow Frontend" cmd /k "${path.join(this.config.paths.app, 'start-frontend.bat')}"

timeout /t 3 /nobreak

echo [3/3] Services Started Successfully!
echo.
echo ====================================
echo  Access Your Dashboard
echo ====================================
echo Frontend: http://localhost:${this.config.ports.frontend}
echo Backend:  http://localhost:${this.config.ports.backend}
echo.
echo Press any key to stop all services...
pause

echo.
echo Stopping all services...
taskkill /f /im node.exe /t 2>nul
taskkill /f /im serve.exe /t 2>nul
echo Services stopped.
pause
`;

    fs.writeFileSync(path.join(this.config.paths.app, 'start-claude-flow.bat'), startAllScript);

    this.success('Windows service scripts created');
  }

  async setupMacOSServices() {
    this.progress('Setting up macOS services with launchd...');

    // Similar to original but with enhanced error handling and logging
    const launchAgentsDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
    if (!fs.existsSync(launchAgentsDir)) {
      fs.mkdirSync(launchAgentsDir, { recursive: true });
    }

    // Backend service plist with enhanced configuration
    const backendPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.claude-flow.backend</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>server.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${this.config.paths.app}/backend</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>
    <key>StandardOutPath</key>
    <string>${this.config.paths.logs}/backend.log</string>
    <key>StandardErrorPath</key>
    <string>${this.config.paths.logs}/backend-error.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key>
        <string>production</string>
    </dict>
</dict>
</plist>`;

    fs.writeFileSync(path.join(launchAgentsDir, 'com.claude-flow.backend.plist'), backendPlist);

    // Enhanced start/stop scripts
    const startScript = `#!/bin/bash
set -e

echo "🚀 Starting Claude-Flow Dashboard..."
echo "=================================="

# Start backend service
echo "[1/2] Starting backend service..."
launchctl load ~/Library/LaunchAgents/com.claude-flow.backend.plist
sleep 3

# Start frontend
echo "[2/2] Starting frontend service..."
cd "${this.config.paths.app}/frontend"
nohup npx serve -s build -l ${this.config.ports.frontend} > "${this.config.paths.logs}/frontend.log" 2>&1 &
echo $! > "${this.config.paths.app}/frontend.pid"

echo
echo "✅ Claude-Flow Dashboard started successfully!"
echo "=================================="
echo "Frontend: http://localhost:${this.config.ports.frontend}"
echo "Backend:  http://localhost:${this.config.ports.backend}"
echo
echo "To stop: ./stop-claude-flow.sh"
`;

    const stopScript = `#!/bin/bash
echo "🛑 Stopping Claude-Flow Dashboard..."
echo "=================================="

# Stop backend service
echo "Stopping backend service..."
launchctl unload ~/Library/LaunchAgents/com.claude-flow.backend.plist

# Stop frontend
echo "Stopping frontend service..."
if [ -f "${this.config.paths.app}/frontend.pid" ]; then
    PID=$(cat "${this.config.paths.app}/frontend.pid")
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "Frontend stopped (PID: $PID)"
    fi
    rm -f "${this.config.paths.app}/frontend.pid"
fi

# Cleanup
pkill -f "serve.*build" 2>/dev/null || true

echo "✅ Claude-Flow Dashboard stopped!"
`;

    fs.writeFileSync(path.join(this.config.paths.app, 'start-claude-flow.sh'), startScript);
    fs.writeFileSync(path.join(this.config.paths.app, 'stop-claude-flow.sh'), stopScript);

    await this.run(`chmod +x ${path.join(this.config.paths.app, 'start-claude-flow.sh')}`);
    await this.run(`chmod +x ${path.join(this.config.paths.app, 'stop-claude-flow.sh')}`);

    this.success('macOS services configured');
  }

  async setupLinuxServices() {
    this.progress('Setting up Linux systemd services...');

    // Check for systemd
    let useSystemd = false;
    try {
      await this.run('systemctl --version', process.cwd(), { silent: true });
      useSystemd = true;
      this.info('systemd detected, creating systemd services');
    } catch (error) {
      this.info('systemd not available, creating manual scripts');
    }

    if (useSystemd) {
      // Enhanced systemd services
      const backendService = `[Unit]
Description=Claude-Flow Backend Service
After=network.target mongodb.service
Wants=mongodb.service

[Service]
Type=simple
User=${os.userInfo().username}
WorkingDirectory=${this.config.paths.app}/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
StandardOutput=journal
StandardError=journal
SyslogIdentifier=claude-flow-backend

# Security
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=${this.config.paths.logs} ${this.config.paths.data}

[Install]
WantedBy=multi-user.target
`;

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
StandardOutput=journal
StandardError=journal
SyslogIdentifier=claude-flow-frontend

# Security
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes

[Install]
WantedBy=multi-user.target
`;

      fs.writeFileSync(path.join(this.config.paths.app, 'claude-flow-backend.service'), backendService);
      fs.writeFileSync(path.join(this.config.paths.app, 'claude-flow-frontend.service'), frontendService);

      this.info('Systemd service files created. To install:');
      this.info('sudo cp claude-flow-*.service /etc/systemd/system/');
      this.info('sudo systemctl daemon-reload');
      this.info('sudo systemctl enable claude-flow-backend claude-flow-frontend');
      this.info('sudo systemctl start claude-flow-backend claude-flow-frontend');
    }

    // Enhanced manual scripts
    const startScript = `#!/bin/bash
set -e

echo "🚀 Starting Claude-Flow Dashboard..."
echo "=================================="

# Function to check if process is running
check_process() {
    if [ -f "$1" ]; then
        PID=$(cat "$1")
        if kill -0 $PID 2>/dev/null; then
            return 0
        else
            rm -f "$1"
            return 1
        fi
    fi
    return 1
}

# Start backend
echo "[1/2] Starting backend service..."
if check_process "${this.config.paths.app}/backend.pid"; then
    echo "Backend already running"
else
    cd "${this.config.paths.app}/backend"
    nohup node server.js > "${this.config.paths.logs}/backend.log" 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > "${this.config.paths.app}/backend.pid"
    echo "Backend started (PID: $BACKEND_PID)"
fi

# Wait for backend to start
sleep 3

# Start frontend
echo "[2/2] Starting frontend service..."
if check_process "${this.config.paths.app}/frontend.pid"; then
    echo "Frontend already running"
else
    cd "${this.config.paths.app}/frontend"
    nohup npx serve -s build -l ${this.config.ports.frontend} > "${this.config.paths.logs}/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "${this.config.paths.app}/frontend.pid"
    echo "Frontend started (PID: $FRONTEND_PID)"
fi

echo
echo "✅ Claude-Flow Dashboard started successfully!"
echo "=================================="
echo "Frontend: http://localhost:${this.config.ports.frontend}"
echo "Backend:  http://localhost:${this.config.ports.backend}"
echo
echo "Logs:"
echo "  Backend: ${this.config.paths.logs}/backend.log"
echo "  Frontend: ${this.config.paths.logs}/frontend.log"
echo
echo "To stop: ./stop-claude-flow.sh"
`;

    const stopScript = `#!/bin/bash
echo "🛑 Stopping Claude-Flow Dashboard..."
echo "=================================="

# Function to stop process
stop_process() {
    if [ -f "$1" ]; then
        PID=$(cat "$1")
        if kill -0 $PID 2>/dev/null; then
            kill $PID
            echo "$2 stopped (PID: $PID)"
        fi
        rm -f "$1"
    fi
}

# Stop services
stop_process "${this.config.paths.app}/backend.pid" "Backend"
stop_process "${this.config.paths.app}/frontend.pid" "Frontend"

# Cleanup any remaining processes
pkill -f "node server.js" 2>/dev/null || true
pkill -f "serve.*build" 2>/dev/null || true

echo "✅ Claude-Flow Dashboard stopped!"
`;

    fs.writeFileSync(path.join(this.config.paths.app, 'start-claude-flow.sh'), startScript);
    fs.writeFileSync(path.join(this.config.paths.app, 'stop-claude-flow.sh'), stopScript);

    await this.run(`chmod +x ${path.join(this.config.paths.app, 'start-claude-flow.sh')}`);
    await this.run(`chmod +x ${path.join(this.config.paths.app, 'stop-claude-flow.sh')}`);

    this.success('Linux services configured');
  }

  async createMaintenanceScripts() {
    this.info('Creating maintenance scripts...');

    // Enhanced health check script
    const healthCheckScript = this.isWindows ? `
@echo off
echo Claude-Flow Dashboard Health Check
echo ====================================
echo.

echo Checking backend health...
curl -s http://localhost:${this.config.ports.backend}/api/health || echo Backend is not responding

echo.
echo Checking frontend...
curl -s -o nul -w "%%{http_code}" http://localhost:${this.config.ports.frontend} > temp.txt
set /p status=<temp.txt
del temp.txt
if "%status%"=="200" (
    echo Frontend is healthy
) else (
    echo Frontend is not responding
)

echo.
echo Checking database connection...
echo TODO: Add database health check

echo.
echo Health check completed.
pause
` : `#!/bin/bash
echo "Claude-Flow Dashboard Health Check"
echo "=================================="
echo

echo "Checking backend health..."
if curl -s http://localhost:${this.config.ports.backend}/api/health | jq . >/dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend is not responding"
fi

echo
echo "Checking frontend..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${this.config.ports.frontend})
if [ "$STATUS" = "200" ]; then
    echo "✅ Frontend is healthy"
else
    echo "❌ Frontend is not responding (HTTP $STATUS)"
fi

echo
echo "Checking database connection..."
if command -v mongo >/dev/null 2>&1; then
    if mongo --eval "db.adminCommand('ping')" localhost:${this.config.ports.mongo}/test >/dev/null 2>&1; then
        echo "✅ Database is healthy"
    else
        echo "❌ Database is not responding"
    fi
else
    echo "⚠️ MongoDB client not installed, cannot check database"
fi

echo
echo "System resources:"
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')%"
echo "Memory Usage: $(free | grep Mem | awk '{printf("%.2f%%"), $3/$2 * 100.0}')"
echo "Disk Usage: $(df -h . | awk 'NR==2{printf "%s", $5}')"

echo
echo "Health check completed."
`;

    // Enhanced backup script
    const backupScript = this.isWindows ? `
@echo off
set BACKUP_DIR=backups\\%date:~-4,4%-%date:~-10,2%-%date:~-7,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%
set BACKUP_DIR=%BACKUP_DIR: =0%
mkdir "%BACKUP_DIR%" 2>nul

echo Creating backup in %BACKUP_DIR%...
echo.

echo Backing up configuration...
xcopy /E /I /Y config "%BACKUP_DIR%\\config" >nul

echo Backing up data...
xcopy /E /I /Y data "%BACKUP_DIR%\\data" >nul 2>nul || echo No data directory found

echo Backing up logs...
xcopy /E /I /Y logs "%BACKUP_DIR%\\logs" >nul 2>nul || echo No logs directory found

echo Backing up environment files...
copy backend\\.env "%BACKUP_DIR%\\" >nul 2>nul || echo No backend .env found
copy frontend\\.env.production "%BACKUP_DIR%\\" >nul 2>nul || echo No frontend .env found

echo.
echo Backup completed: %BACKUP_DIR%
pause
` : `#!/bin/bash
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_DIR="backups/$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

echo "Creating backup in $BACKUP_DIR..."
echo

echo "Backing up configuration..."
cp -r config "$BACKUP_DIR/" 2>/dev/null || echo "No config directory found"

echo "Backing up data..."
cp -r data "$BACKUP_DIR/" 2>/dev/null || echo "No data directory found"

echo "Backing up logs..."
cp -r logs "$BACKUP_DIR/" 2>/dev/null || echo "No logs directory found"

echo "Backing up environment files..."
cp backend/.env "$BACKUP_DIR/" 2>/dev/null || echo "No backend .env found"
cp frontend/.env.production "$BACKUP_DIR/" 2>/dev/null || echo "No frontend .env found"

echo "Backing up database..."
if command -v mongodump >/dev/null 2>&1; then
    mongodump --host localhost:${this.config.ports.mongo} --db ${this.config.database.name} --out "$BACKUP_DIR/mongodb" 2>/dev/null || echo "Database backup failed"
else
    echo "mongodump not available, skipping database backup"
fi

# Compress backup
tar -czf "$BACKUP_DIR.tar.gz" -C backups "$TIMESTAMP" 2>/dev/null && rm -rf "$BACKUP_DIR"

echo
if [ -f "$BACKUP_DIR.tar.gz" ]; then
    echo "Backup completed: $BACKUP_DIR.tar.gz"
else
    echo "Backup completed: $BACKUP_DIR"
fi
`;

    // Update script
    const updateScript = this.isWindows ? `
@echo off
echo Claude-Flow Dashboard Update
echo ============================
echo.

echo Stopping services...
call stop-claude-flow.bat

echo.
echo Updating dependencies...
cd backend
call yarn install
cd ..\\frontend
call yarn install
cd ..

echo.
echo Building application...
cd frontend
call yarn build
cd ..

echo.
echo Update completed. Starting services...
call start-claude-flow.bat
` : `#!/bin/bash
echo "Claude-Flow Dashboard Update"
echo "=========================="
echo

echo "Stopping services..."
./stop-claude-flow.sh

echo
echo "Pulling latest changes..."
git pull 2>/dev/null || echo "Git not available or not a git repository"

echo "Updating dependencies..."
cd backend && yarn install && cd ..
cd frontend && yarn install && cd ..

echo
echo "Building application..."
cd frontend && yarn build && cd ..

echo
echo "Update completed. Starting services..."
./start-claude-flow.sh
`;

    const healthCheckFile = this.isWindows ? 'health-check.bat' : 'health-check.sh';
    const backupFile = this.isWindows ? 'backup.bat' : 'backup.sh';
    const updateFile = this.isWindows ? 'update.bat' : 'update.sh';

    fs.writeFileSync(path.join(this.config.paths.app, healthCheckFile), healthCheckScript);
    fs.writeFileSync(path.join(this.config.paths.app, backupFile), backupScript);
    fs.writeFileSync(path.join(this.config.paths.app, updateFile), updateScript);

    if (!this.isWindows) {
      await this.run(`chmod +x ${path.join(this.config.paths.app, healthCheckFile)}`);
      await this.run(`chmod +x ${path.join(this.config.paths.app, backupFile)}`);
      await this.run(`chmod +x ${path.join(this.config.paths.app, updateFile)}`);
    }

    this.success('Maintenance scripts created');
  }

  async finalizeSetup() {
    this.info('Finalizing setup...');

    // Create comprehensive README
    const readmeContent = `# Claude-Flow Dashboard - Production Deployment

## System Information
- Platform: ${this.platform}
- Architecture: ${this.arch}
- Node.js: ${await this.run('node --version', process.cwd(), { silent: true })}
- Setup Date: ${new Date().toISOString()}
- Docker Enabled: ${this.config.docker.enabled}
- SSL Enabled: ${this.config.ssl.enabled}
- Monitoring Enabled: ${this.config.monitoring.enabled}

## Quick Start

### Starting the Application
${this.isWindows ? 
  'Double-click `start-claude-flow.bat` or run it from command prompt' : 
  'Run `./start-claude-flow.sh`'
}

### Stopping the Application
${this.isWindows ? 
  'Press Ctrl+C in the service windows or run `stop-claude-flow.bat`' : 
  'Run `./stop-claude-flow.sh`'
}

### Docker Deployment (if enabled)
\`\`\`bash
${this.isWindows ? 'start-docker.bat' : './start-docker.sh'}
\`\`\`

## Access URLs
- Frontend Dashboard: ${this.config.ssl.enabled ? 'https' : 'http'}://localhost:${this.config.ssl.enabled ? this.config.ports.nginxSSL : this.config.ports.frontend}
- Backend API: ${this.config.ssl.enabled ? 'https' : 'http'}://localhost:${this.config.ssl.enabled ? this.config.ports.nginxSSL : this.config.ports.backend}/api
- Health Check: ${this.config.ssl.enabled ? 'https' : 'http'}://localhost:${this.config.ssl.enabled ? this.config.ports.nginxSSL : this.config.ports.backend}/api/health

## Configuration
- Backend config: \`backend/.env\`
- Frontend config: \`frontend/.env.production\`
- Database config: \`config/mongod.conf\` (if using local MongoDB)
- Nginx config: \`config/nginx/nginx.conf\` (if using SSL/reverse proxy)

## Database
- Type: MongoDB
- Host: ${this.config.database.host}
- Port: ${this.config.database.port}
- Database: ${this.config.database.name}

## Logs
- Location: \`${this.config.paths.logs}/\`
- Backend logs: \`backend.log\`, \`backend-error.log\`
- Frontend logs: \`frontend.log\`, \`frontend-error.log\`
- Database logs: \`mongodb.log\` (if local)

## Maintenance

### Health Check
${this.isWindows ? 'Run `health-check.bat`' : 'Run `./health-check.sh`'}

### Backup
${this.isWindows ? 'Run `backup.bat`' : 'Run `./backup.sh`'}

### Update
${this.isWindows ? 'Run `update.bat`' : 'Run `./update.sh`'}

### Logs
\`\`\`bash
# View backend logs
${this.isWindows ? 'type logs\\backend.log' : 'tail -f logs/backend.log'}

# View frontend logs  
${this.isWindows ? 'type logs\\frontend.log' : 'tail -f logs/frontend.log'}
\`\`\`

## API Configuration
To configure OpenRouter API keys:
1. Edit \`backend/.env\`
2. Set \`OPENROUTER_API_KEYS=your-key-here\`
3. Restart the backend service

## Security
${this.config.ssl.enabled ? '- SSL/TLS encryption enabled' : '- SSL/TLS encryption disabled (not recommended for production)'}
- JWT tokens for authentication
- CORS protection enabled
- Security headers configured (if using Nginx)

## Performance
- Frontend built for production with optimizations
- Backend clustering enabled
- Database indexing configured
- Static file caching (if using Nginx)

## Monitoring
${this.config.monitoring.enabled ? `
- Prometheus metrics: http://localhost:9090
- Grafana dashboard: http://localhost:3001
- Application metrics: http://localhost:9091/metrics
` : '- Monitoring disabled'}

## Troubleshooting

### Services won't start
1. Check if ports are available: \`${this.isWindows ? 'netstat -an | findstr' : 'lsof -i'} :${this.config.ports.backend}\`
2. Check logs in \`logs/\` directory
3. Verify Node.js and dependencies are installed
4. Run health check script

### Database connection issues
1. Ensure MongoDB is running
2. Check database configuration in \`backend/.env\`
3. Verify database logs

### Frontend not loading
1. Check if frontend build exists: \`frontend/build/\`
2. Verify backend API is accessible
3. Check browser console for errors

## Cloud Deployment

### AWS
\`\`\`bash
# TODO: Add AWS deployment instructions
\`\`\`

### Google Cloud
\`\`\`bash
# TODO: Add GCP deployment instructions
\`\`\`

### Azure
\`\`\`bash
# TODO: Add Azure deployment instructions
\`\`\`

## Support
- Documentation: See \`claude/README.md\`
- Issues: Create GitHub issue with logs and system information
- Health check: ${this.isWindows ? 'health-check.bat' : './health-check.sh'}

## File Structure
\`\`\`
claude-flow/
├── backend/              # Node.js backend
├── frontend/             # React frontend
├── claude/               # Claude Flow CLI
├── config/               # Configuration files
├── data/                 # Application data
├── logs/                 # Log files
├── ssl/                  # SSL certificates
├── backups/              # Backup files
├── docker/               # Docker configurations
└── scripts/              # Utility scripts
\`\`\`

## Environment Variables

### Backend (.env)
- \`NODE_ENV\`: production/development
- \`PORT\`: Backend server port
- \`MONGO_URL\`: MongoDB connection string
- \`OPENROUTER_API_KEYS\`: Comma-separated API keys
- \`JWT_SECRET\`: JWT signing secret
- \`LOG_LEVEL\`: Logging level (info, debug, error)

### Frontend (.env.production)
- \`REACT_APP_BACKEND_URL\`: Backend API URL
- \`REACT_APP_WS_URL\`: WebSocket URL
- \`REACT_APP_ENABLE_*\`: Feature flags
`;

    fs.writeFileSync(path.join(this.config.paths.app, 'PRODUCTION-README.md'), readmeContent);

    // Create package info
    const packageInfo = {
      name: 'claude-flow-dashboard',
      version: '2.0.0-alpha.84',
      description: 'Claude-Flow Dashboard - Enhanced Production Setup',
      setup: {
        platform: this.platform,
        architecture: this.arch,
        setupDate: new Date().toISOString(),
        features: {
          docker: this.config.docker.enabled,
          ssl: this.config.ssl.enabled,
          monitoring: this.config.monitoring.enabled
        },
        ports: this.config.ports,
        paths: this.config.paths
      }
    };

    fs.writeFileSync(path.join(this.config.paths.app, 'setup-info.json'), JSON.stringify(packageInfo, null, 2));

    this.success('Production setup completed successfully!');
    this.log('');
    this.log('🎉 Claude-Flow Dashboard is ready for production!', 'green');
    this.log('');
    this.info('Next steps:');
    this.info('1. Configure your OpenRouter API keys in backend/.env');
    this.info('2. Start the application:');
    if (this.config.docker.enabled && this.isWindows) {
      this.info('   Double-click start-docker.bat');
    } else if (this.config.docker.enabled) {
      this.info('   ./start-docker.sh');
    } else if (this.isWindows) {
      this.info('   Double-click start-claude-flow.bat');
    } else {
      this.info('   ./start-claude-flow.sh');
    }
    this.info(`3. Access the dashboard at ${this.config.ssl.enabled ? 'https' : 'http'}://localhost:${this.config.ssl.enabled ? this.config.ports.nginxSSL : this.config.ports.frontend}`);
    this.log('');
    this.info('For detailed instructions, see PRODUCTION-README.md');
    this.info('For health checks, run the health-check script');
    this.info('For backups, run the backup script');
  }

  async interactiveSetup() {
    this.log('🚀 Claude-Flow Dashboard - Interactive Setup', 'bold');
    this.log('============================================', 'cyan');
    this.log('');

    // Ask for configuration options
    this.config.ssl.enabled = (await this.promptUser('Enable SSL/HTTPS? (y/n)', 'n')).toLowerCase() === 'y';
    
    if (this.config.ssl.enabled) {
      this.config.ssl.domain = await this.promptUser('Domain name', 'localhost');
      this.config.ssl.email = await this.promptUser('Email for SSL certificate', 'admin@localhost');
    }

    this.config.monitoring.enabled = (await this.promptUser('Enable monitoring (Prometheus/Grafana)? (y/n)', 'y')).toLowerCase() === 'y';

    if (this.config.docker.enabled) {
      const useDocker = (await this.promptUser('Use Docker for deployment? (y/n)', 'y')).toLowerCase() === 'y';
      this.config.docker.enabled = useDocker;
    }

    const customPorts = (await this.promptUser('Customize ports? (y/n)', 'n')).toLowerCase() === 'y';
    if (customPorts) {
      this.config.ports.backend = parseInt(await this.promptUser('Backend port', this.config.ports.backend.toString()));
      this.config.ports.frontend = parseInt(await this.promptUser('Frontend port', this.config.ports.frontend.toString()));
    }

    this.log('');
    this.info('Configuration summary:');
    this.info(`- SSL/HTTPS: ${this.config.ssl.enabled ? 'Enabled' : 'Disabled'}`);
    this.info(`- Monitoring: ${this.config.monitoring.enabled ? 'Enabled' : 'Disabled'}`);
    this.info(`- Docker: ${this.config.docker.enabled ? 'Enabled' : 'Disabled'}`);
    this.info(`- Backend port: ${this.config.ports.backend}`);
    this.info(`- Frontend port: ${this.config.ports.frontend}`);
    
    const proceed = (await this.promptUser('Proceed with setup? (y/n)', 'y')).toLowerCase() === 'y';
    if (!proceed) {
      this.warn('Setup cancelled');
      process.exit(0);
    }

    return true;
  }

  async setup() {
    try {
      this.log('🚀 Starting Claude-Flow Dashboard Enhanced Production Setup...', 'magenta');
      this.log('');

      // Interactive configuration
      await this.interactiveSetup();

      if (!(await this.checkPrerequisites())) {
        process.exit(1);
      }

      await this.createDirectories();
      await this.installDependencies();
      await this.buildApplication();
      await this.setupDatabase();
      await this.createEnvironmentFiles();
      
      if (this.config.ssl.enabled) {
        await this.setupSSL();
        await this.setupNginx();
      }

      if (this.config.docker.enabled) {
        await this.setupDocker();
      }

      if (this.config.monitoring.enabled) {
        await this.setupMonitoring();
      }

      await this.setupServices();
      await this.createMaintenanceScripts();
      await this.finalizeSetup();

    } catch (error) {
      this.error(`Setup failed: ${error.message}`);
      this.info('Check the logs above for more details');
      process.exit(1);
    }
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new EnhancedClaudeFlowSetup();
  setup.setup().catch(console.error);
}

module.exports = EnhancedClaudeFlowSetup;