@echo off
echo ========================================
echo  Advanced Workflow Automation Platform
echo  Enhanced Setup Script
echo ========================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not installed or not in PATH
    pause
    exit /b 1
)

echo ✓ Node.js and npm are installed
echo.

:: Create necessary directories
echo Creating project directories...
if not exist "uploads" mkdir uploads
if not exist "logs" mkdir logs
if not exist "backups" mkdir backups
if not exist "temp" mkdir temp
echo ✓ Directories created
echo.

:: Install server dependencies
echo Installing server dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install server dependencies
    pause
    exit /b 1
)
echo ✓ Server dependencies installed
echo.

:: Install client dependencies
echo Installing client dependencies...
cd client
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install client dependencies
    cd ..
    pause
    exit /b 1
)
cd ..
echo ✓ Client dependencies installed
echo.

:: Create environment file if it doesn't exist
if not exist ".env" (
    echo Creating environment configuration...
    (
        echo # Server Configuration
        echo PORT=3001
        echo NODE_ENV=development
        echo DATABASE_URL=sqlite:./workflow.db
        echo.
        echo # Security
        echo JWT_SECRET=your-jwt-secret-change-in-production
        echo ENCRYPTION_KEY=your-encryption-key-change-in-production
        echo.
        echo # External Services ^(Optional^)
        echo # OPENAI_API_KEY=your-openai-api-key
        echo # CLAUDE_API_KEY=your-claude-api-key
        echo # SMTP_HOST=smtp.gmail.com
        echo # SMTP_USER=your-email@gmail.com
        echo # SMTP_PASS=your-app-password
        echo.
        echo # Redis ^(Optional^)
        echo # REDIS_URL=redis://localhost:6379
        echo.
        echo # File Storage
        echo UPLOAD_PATH=./uploads
        echo MAX_FILE_SIZE=10485760
        echo.
        echo # Logging
        echo LOG_LEVEL=info
        echo LOG_FILE=./logs/app.log
    ) > .env
    echo ✓ Environment file created (.env)
    echo   Please update the configuration values as needed
    echo.
)

:: Build TypeScript
echo Building TypeScript...
call npm run build:server
if %errorlevel% neq 0 (
    echo WARNING: TypeScript build failed, but continuing...
    echo You may need to fix TypeScript errors before running
    echo.
)

:: Initialize database
echo Initializing database...
if exist "src\database\migrations.ts" (
    call npm run migrate
    if %errorlevel% neq 0 (
        echo WARNING: Database migration failed
        echo.
    )
)

if exist "src\database\seeds.ts" (
    call npm run seed
    if %errorlevel% neq 0 (
        echo WARNING: Database seeding failed
        echo.
    )
)

:: Create startup scripts
echo Creating startup scripts...

:: Enhanced start script
(
    echo @echo off
    echo echo ========================================
    echo echo  Starting Workflow Automation Platform
    echo echo ========================================
    echo echo.
    echo echo Starting servers...
    echo echo Frontend: http://localhost:3000
    echo echo Backend:  http://localhost:3001
    echo echo API Docs: http://localhost:3001/api-docs
    echo echo.
    echo echo Press Ctrl+C to stop both servers
    echo echo.
    echo call npm run dev
) > enhanced-start.bat

:: Production start script
(
    echo @echo off
    echo echo ========================================
    echo echo  Starting Production Server
    echo echo ========================================
    echo echo.
    echo echo Building application...
    echo call npm run build
    echo if %%errorlevel%% neq 0 ^(
    echo     echo ERROR: Build failed
    echo     pause
    echo     exit /b 1
    echo ^)
    echo echo.
    echo echo Starting production server...
    echo echo Server: http://localhost:3001
    echo echo.
    echo call npm run start:prod
) > production-start.bat

:: Development tools script
(
    echo @echo off
    echo echo ========================================
    echo echo  Development Tools
    echo echo ========================================
    echo echo.
    echo echo 1. Run tests
    echo echo 2. Lint code
    echo echo 3. Format code
    echo echo 4. Type check
    echo echo 5. View logs
    echo echo 6. Clear cache
    echo echo 7. Reset database
    echo echo 8. Exit
    echo echo.
    echo set /p choice="Select option (1-8): "
    echo.
    echo if "%%choice%%"=="1" call npm test
    echo if "%%choice%%"=="2" call npm run lint
    echo if "%%choice%%"=="3" call npm run format
    echo if "%%choice%%"=="4" call npm run type-check
    echo if "%%choice%%"=="5" type logs\app.log 2^>nul ^|^| echo No logs found
    echo if "%%choice%%"=="6" ^(
    echo     rmdir /s /q node_modules 2^>nul
    echo     rmdir /s /q client\node_modules 2^>nul
    echo     rmdir /s /q dist 2^>nul
    echo     echo Cache cleared
    echo ^)
    echo if "%%choice%%"=="7" ^(
    echo     del workflow.db 2^>nul
    echo     call npm run migrate
    echo     call npm run seed
    echo     echo Database reset
    echo ^)
    echo if "%%choice%%"=="8" exit /b 0
    echo.
    echo pause
    echo goto :eof
) > dev-tools.bat

echo ✓ Startup scripts created
echo.

:: Create Docker files if Docker is available
docker --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Creating Docker configuration...
    
    :: Dockerfile
    if not exist "Dockerfile" (
        (
            echo # Multi-stage build for production
            echo FROM node:18-alpine AS builder
            echo.
            echo WORKDIR /app
            echo.
            echo # Copy package files
            echo COPY package*.json ./
            echo COPY client/package*.json ./client/
            echo.
            echo # Install dependencies
            echo RUN npm ci --only=production
            echo RUN cd client ^&^& npm ci --only=production
            echo.
            echo # Copy source code
            echo COPY . .
            echo.
            echo # Build application
            echo RUN npm run build
            echo.
            echo # Production stage
            echo FROM node:18-alpine AS production
            echo.
            echo WORKDIR /app
            echo.
            echo # Install production dependencies only
            echo COPY package*.json ./
            echo RUN npm ci --only=production ^&^& npm cache clean --force
            echo.
            echo # Copy built application
            echo COPY --from=builder /app/dist ./dist
            echo COPY --from=builder /app/client/build ./client/build
            echo.
            echo # Create non-root user
            echo RUN addgroup -g 1001 -S nodejs
            echo RUN adduser -S workflow -u 1001
            echo.
            echo # Create necessary directories
            echo RUN mkdir -p uploads logs backups temp
            echo RUN chown -R workflow:nodejs /app
            echo.
            echo USER workflow
            echo.
            echo EXPOSE 3001
            echo.
            echo HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
            echo   CMD node healthcheck.js
            echo.
            echo CMD ["npm", "run", "start:prod"]
        ) > Dockerfile
    )
    
    :: Docker Compose
    if not exist "docker-compose.yml" (
        (
            echo version: '3.8'
            echo.
            echo services:
            echo   app:
            echo     build: .
            echo     ports:
            echo       - "3001:3001"
            echo     environment:
            echo       - NODE_ENV=production
            echo       - DATABASE_URL=sqlite:./workflow.db
            echo       - REDIS_URL=redis://redis:6379
            echo     volumes:
            echo       - ./uploads:/app/uploads
            echo       - ./logs:/app/logs
            echo       - ./backups:/app/backups
            echo     depends_on:
            echo       - redis
            echo     restart: unless-stopped
            echo.
            echo   redis:
            echo     image: redis:7-alpine
            echo     ports:
            echo       - "6379:6379"
            echo     volumes:
            echo       - redis_data:/data
            echo     restart: unless-stopped
            echo.
            echo   nginx:
            echo     image: nginx:alpine
            echo     ports:
            echo       - "80:80"
            echo       - "443:443"
            echo     volumes:
            echo       - ./nginx.conf:/etc/nginx/nginx.conf
            echo       - ./ssl:/etc/nginx/ssl
            echo     depends_on:
            echo       - app
            echo     restart: unless-stopped
            echo.
            echo volumes:
            echo   redis_data:
        ) > docker-compose.yml
    )
    
    :: Docker start script
    (
        echo @echo off
        echo echo Building and starting with Docker...
        echo docker-compose up --build -d
        echo echo.
        echo echo Services started:
        echo echo - Application: http://localhost:3001
        echo echo - Redis: localhost:6379
        echo echo.
        echo echo To stop: docker-compose down
        echo echo To view logs: docker-compose logs -f
    ) > docker-start.bat
    
    echo ✓ Docker configuration created
    echo.
)

:: Check for common issues and provide solutions
echo Checking for potential issues...

:: Check available ports
netstat -an | findstr ":3000 " >nul 2>&1
if %errorlevel% equ 0 (
    echo WARNING: Port 3000 is already in use
    echo You may need to stop other applications or change the port
    echo.
)

netstat -an | findstr ":3001 " >nul 2>&1
if %errorlevel% equ 0 (
    echo WARNING: Port 3001 is already in use
    echo You may need to stop other applications or change the port
    echo.
)

:: Check disk space (simplified)
for /f "tokens=3" %%a in ('dir /-c ^| findstr "bytes free"') do set freespace=%%a
if defined freespace (
    echo ✓ Disk space check completed
) else (
    echo WARNING: Could not check disk space
)

echo.
echo ========================================
echo  Setup Complete!
echo ========================================
echo.
echo Available commands:
echo   enhanced-start.bat     - Start development servers
echo   production-start.bat   - Start production server
echo   dev-tools.bat         - Development utilities
echo   docker-start.bat      - Start with Docker (if available)
echo.
echo Next steps:
echo 1. Review and update .env configuration
echo 2. Run 'enhanced-start.bat' to start development
echo 3. Open http://localhost:3000 in your browser
echo 4. Check http://localhost:3001/api-docs for API documentation
echo.
echo For help and documentation:
echo - README.md - Complete documentation
echo - docs/ - Additional guides
echo - GitHub Issues - Report problems
echo.
echo Happy workflow automation! 🚀
echo.
pause