#!/usr/bin/env python3
"""
Startup script for Python backend
"""

import uvicorn
from app.main import socket_app
from app.config import settings

if __name__ == "__main__":
    print("🚀 Starting Tech Blog Platform - Python Backend")
    print(f"📡 Server will run on: http://localhost:{settings.PORT}")
    print(f"🔧 Environment: {'Development' if settings.DEBUG else 'Production'}")
    print(f"📚 API Documentation: http://localhost:{settings.PORT}/docs")
    print("=" * 50)
    
    uvicorn.run(
        "app.main:socket_app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )



