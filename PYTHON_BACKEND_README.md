# Tech Blog Platform - Python Backend

This is a Python version of the Tech Blog Platform backend using **FastAPI** instead of Node.js/Express.

## 🐍 Python Tech Stack

### **Core Framework**
- **FastAPI** - Modern, fast web framework with automatic API documentation
- **Uvicorn** - ASGI server for running FastAPI
- **Pydantic** - Data validation and serialization

### **Database**
- **SQLAlchemy** - Python SQL toolkit and ORM
- **PostgreSQL** - Database (same as original)
- **Alembic** - Database migration tool

### **Authentication & Security**
- **python-jose** - JWT token handling
- **bcrypt** - Password hashing
- **python-multipart** - File upload support

### **Real-time Communication**
- **python-socketio** - WebSocket support

### **Content Processing**
- **markdown** - Markdown parsing
- **bleach** - HTML sanitization
- **Pillow** - Image processing

### **Development Tools**
- **pytest** - Testing framework
- **black** - Code formatting
- **isort** - Import sorting
- **loguru** - Logging

## 🚀 Quick Start

### 1. Install Python Dependencies

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Set Up Environment

Copy and update the `.env` file:
```bash
cp env.example .env
```

Update the `.env` file with your database credentials:
```env
DB_PASSWORD=your_actual_password_here
JWT_SECRET=your_actual_jwt_secret_here
```

### 3. Set Up Database

Make sure PostgreSQL is running and create the database:
```sql
CREATE DATABASE tech_blog_db;
```

### 4. Run Database Migrations

```bash
# Create tables (you'll need to implement this)
python -c "from app.database import Base, engine; Base.metadata.create_all(bind=engine)"
```

### 5. Start the Server

```bash
python start_python_backend.py
```

The server will start on `http://localhost:5000`

## 📚 API Documentation

FastAPI automatically generates interactive API documentation:

- **Swagger UI**: http://localhost:5000/docs
- **ReDoc**: http://localhost:5000/redoc

## 🔄 Migration from Node.js

### Key Differences:

1. **Framework**: Express.js → FastAPI
2. **Validation**: express-validator → Pydantic
3. **ORM**: Raw SQL → SQLAlchemy
4. **Authentication**: Manual JWT → python-jose
5. **File Upload**: multer → python-multipart
6. **Real-time**: socket.io → python-socketio

### Benefits of Python Version:

- ✅ **Automatic API Documentation** (Swagger/OpenAPI)
- ✅ **Type Safety** with Pydantic models
- ✅ **Better Error Handling** with FastAPI
- ✅ **Async Support** built-in
- ✅ **Data Validation** automatic
- ✅ **Python Ecosystem** (ML/AI libraries)

## 🏗️ Project Structure

```
app/
├── main.py              # FastAPI application entry point
├── config.py            # Configuration settings
├── database.py          # Database connection and session
├── middleware.py        # Custom middleware
├── models/              # SQLAlchemy models
│   ├── user.py
│   ├── post.py
│   ├── comment.py
│   └── ...
├── routes/              # API routes
│   ├── auth.py
│   ├── posts.py
│   ├── users.py
│   └── ...
└── __init__.py
```

## 🔧 Development

### Running Tests
```bash
pytest
```

### Code Formatting
```bash
black app/
isort app/
```

### Database Operations
```bash
# Create migration
alembic revision --autogenerate -m "Initial migration"

# Apply migration
alembic upgrade head
```

## 🌐 Frontend Compatibility

The Python backend maintains the same API endpoints as the Node.js version, so your existing React frontend will work without changes!

## 📝 Next Steps

1. **Complete Route Implementation** - Finish all API endpoints
2. **Add Database Migrations** - Set up Alembic properly
3. **Add Tests** - Write comprehensive test suite
4. **Add Logging** - Implement proper logging
5. **Add Caching** - Redis integration
6. **Add Background Tasks** - Celery for async tasks

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

**Ready to start coding in Python! 🐍**



