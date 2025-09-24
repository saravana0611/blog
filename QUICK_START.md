# 🚀 Quick Start Guide

Get your Tech Blog Platform running in 5 minutes!

## ⚡ Super Quick Setup

### 1. Prerequisites
- **Node.js** 16+ ([Download](https://nodejs.org/))
- **PostgreSQL** 12+ ([Download](https://postgresql.org/))
- **Python** 3.8+ (for Python backend option)

### 2. Database Setup
```bash
# Create database
createdb tech_blog_db
```

### 3. Environment Setup
```bash
# Copy and edit environment file
cp env.example .env
# Edit .env with your PostgreSQL password
```

### 4. Install & Start (Node.js Backend)
```bash
# Install everything
npm run setup

# Start development servers
npm run dev
```

### 5. Install & Start (Python Backend)
```bash
# Install Node.js dependencies for frontend
npm run install:all

# Setup Python backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt

# Start Python backend
python start_python_backend.py

# In another terminal, start frontend
cd client && npm start
```

### 6. Access Your App
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000
- **API Docs**: http://localhost:5000/docs (Python) or http://localhost:5000/api-docs (Node.js)

## 🔍 Verify Setup
```bash
# Run verification script
npm run verify
```

## 🆘 Need Help?
- **Detailed Guide**: See `LOCAL_SETUP_GUIDE.md`
- **Troubleshooting**: Check the troubleshooting section in the detailed guide
- **Windows Users**: Use `start-dev.bat` for easy startup

## 🎯 What's Next?
1. Open http://localhost:3000
2. Register a new account
3. Create your first blog post!
4. Explore the social features (likes, comments, follows)

---

**🎉 You're ready to start blogging!**
