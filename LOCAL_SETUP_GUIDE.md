# 🚀 Local Setup Guide - Tech Blog Platform

This guide will help you set up and run the Tech Blog Platform on your local machine. The project supports both **Node.js** and **Python** backends with a **React** frontend.

## 📋 Prerequisites

### Required Software
- **Node.js** 16+ ([Download](https://nodejs.org/))
- **Python** 3.8+ ([Download](https://python.org/))
- **PostgreSQL** 12+ ([Download](https://postgresql.org/))
- **Git** ([Download](https://git-scm.com/))

### Optional Tools
- **Postman** or **Insomnia** (for API testing)
- **pgAdmin** or **DBeaver** (for database management)

## 🗄️ Database Setup

### 1. Install PostgreSQL
- Download and install PostgreSQL from the official website
- During installation, remember the password you set for the `postgres` user
- Make sure PostgreSQL service is running

### 2. Create Database
Open PostgreSQL command line or pgAdmin and run:
```sql
CREATE DATABASE tech_blog_db;
```

### 3. Verify Database Connection
```bash
# Test connection (replace password with your actual password)
psql -h localhost -U postgres -d tech_blog_db
```

## 🔧 Environment Configuration

### 1. Copy Environment File
```bash
# Copy the example environment file
cp env.example .env
```

### 2. Update Environment Variables
Edit the `.env` file with your actual values:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration (UPDATE THESE!)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tech_blog_db
DB_USER=postgres
DB_PASSWORD=your_actual_postgres_password_here

# JWT Configuration (CHANGE THESE!)
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
JWT_EXPIRES_IN=7d

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Admin Configuration (OPTIONAL)
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=admin_password_here
```

## 🚀 Option 1: Node.js Backend Setup

### 1. Install Dependencies
```bash
# Install all dependencies (backend + frontend)
npm run install:all

# Or install separately:
npm install                    # Backend dependencies
cd client && npm install      # Frontend dependencies
```

### 2. Database Migration
```bash
# Run database migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
```

### 3. Start Development Servers
```bash
# Start both backend and frontend concurrently
npm run dev

# Or start separately:
npm run server:dev    # Backend on port 5000
npm run client:dev    # Frontend on port 3000
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/api-docs (if available)

## 🐍 Option 2: Python Backend Setup

### 1. Create Virtual Environment
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate
```

### 2. Install Python Dependencies
```bash
# Install dependencies
pip install -r requirements.txt
```

### 3. Database Setup
```bash
# Create tables (run this once)
python -c "from app.database import Base, engine; Base.metadata.create_all(bind=engine)"
```

### 4. Start Python Backend
```bash
# Start the Python backend
python start_python_backend.py
```

### 5. Start React Frontend (Separate Terminal)
```bash
# Navigate to client directory
cd client

# Install frontend dependencies
npm install

# Start React development server
npm start
```

### 6. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **FastAPI Documentation**: http://localhost:5000/docs
- **ReDoc Documentation**: http://localhost:5000/redoc

## 🖥️ Windows Quick Start (Batch Script)

If you're on Windows and want to use the Node.js backend:

1. Double-click `start-dev.bat`
2. The script will automatically:
   - Check prerequisites
   - Install dependencies
   - Start both servers

## 🔍 Verification Steps

### 1. Check Backend Health
```bash
# Test backend API
curl http://localhost:5000/api/health
# Or visit in browser: http://localhost:5000/api/health
```

### 2. Check Frontend
- Open http://localhost:3000 in your browser
- You should see the blog homepage

### 3. Test Database Connection
```bash
# Test database connection
psql -h localhost -U postgres -d tech_blog_db -c "SELECT version();"
```

### 4. Test API Endpoints
```bash
# Test posts endpoint
curl http://localhost:5000/api/posts

# Test authentication endpoint
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution**: 
- Make sure PostgreSQL is running
- Check your database credentials in `.env`
- Verify database exists: `psql -U postgres -c "\l"`

#### 2. Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution**:
- Kill the process using the port: `npx kill-port 5000`
- Or change the port in `.env` file

#### 3. Node Modules Issues
```
Error: Cannot find module
```
**Solution**:
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 4. Python Import Errors
```
ModuleNotFoundError: No module named 'fastapi'
```
**Solution**:
```bash
# Make sure virtual environment is activated
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Reinstall dependencies
pip install -r requirements.txt
```

#### 5. Frontend Build Issues
```
Error: Cannot resolve module
```
**Solution**:
```bash
cd client
rm -rf node_modules package-lock.json
npm install
```

### Environment-Specific Issues

#### Windows
- Make sure PowerShell execution policy allows scripts
- Use `venv\Scripts\activate` for Python virtual environment
- Use `start-dev.bat` for easy startup

#### macOS/Linux
- You might need `sudo` for some npm installations
- Use `source venv/bin/activate` for Python virtual environment
- Check file permissions for uploads directory

## 📱 Testing the Application

### 1. User Registration
- Go to http://localhost:3000/register
- Create a new account
- Verify email (if email service is configured)

### 2. Create a Post
- Login with your account
- Navigate to "Create Post"
- Write a blog post with markdown
- Add tags and categories
- Publish the post

### 3. Test Social Features
- Like posts
- Add comments
- Follow other users
- Bookmark posts

### 4. Test Admin Features
- Login as admin (if admin account exists)
- Access admin dashboard
- Moderate posts
- Manage users

## 🔄 Switching Between Backends

### From Node.js to Python
1. Stop Node.js servers (`Ctrl+C`)
2. Activate Python virtual environment
3. Start Python backend: `python start_python_backend.py`
4. Frontend will automatically connect to Python backend

### From Python to Node.js
1. Stop Python server (`Ctrl+C`)
2. Start Node.js servers: `npm run dev`
3. Frontend will automatically connect to Node.js backend

## 📊 Performance Monitoring

### Backend Monitoring
- Check server logs for errors
- Monitor database query performance
- Use browser dev tools for API calls

### Frontend Monitoring
- Use React DevTools extension
- Check browser console for errors
- Monitor network requests

## 🚀 Production Preparation

### Environment Variables
Update `.env` for production:
```env
NODE_ENV=production
DB_PASSWORD=strong_production_password
JWT_SECRET=very_strong_jwt_secret_for_production
```

### Database
- Use production PostgreSQL instance
- Run migrations: `npm run db:migrate`
- Backup database regularly

### Security
- Change default passwords
- Use HTTPS in production
- Set up proper CORS policies
- Enable rate limiting

## 📞 Getting Help

### Check Logs
```bash
# Backend logs
npm run server:dev

# Python logs
python start_python_backend.py

# Frontend logs
npm run client:dev
```

### Common Commands
```bash
# Check Node.js version
node --version

# Check Python version
python --version

# Check PostgreSQL version
psql --version

# Check if PostgreSQL is running
pg_ctl status

# Restart PostgreSQL (Windows)
net stop postgresql-x64-13
net start postgresql-x64-13
```

---

## 🎯 Quick Checklist

- [ ] PostgreSQL installed and running
- [ ] Database `tech_blog_db` created
- [ ] Environment variables configured in `.env`
- [ ] Dependencies installed (`npm run install:all` or `pip install -r requirements.txt`)
- [ ] Database migrations run
- [ ] Backend server started (port 5000)
- [ ] Frontend server started (port 3000)
- [ ] Application accessible at http://localhost:3000
- [ ] API documentation accessible at http://localhost:5000/docs (Python) or http://localhost:5000/api-docs (Node.js)

**🎉 You're all set! Happy coding!**
