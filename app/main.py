"""
Tech Blog Platform - FastAPI Backend
Main application entry point
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer
import socketio
import uvicorn
import os
from contextlib import asynccontextmanager
from loguru import logger

from app.database import init_db, close_db
from app.routes import auth, users, posts, comments, admin, search, upload
from app.middleware import RateLimitMiddleware
from app.config import settings

# Initialize Socket.IO
sio = socketio.AsyncServer(
    cors_allowed_origins=["http://localhost:3000"] if settings.DEBUG else [],
    logger=True,
    engineio_logger=True
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting Tech Blog Platform...")
    await init_db()
    logger.info("Database initialized successfully")
    yield
    # Shutdown
    logger.info("Shutting down Tech Blog Platform...")
    await close_db()
    logger.info("Database connection closed")

# Create FastAPI app
app = FastAPI(
    title="Tech Blog Platform API",
    description="A complete blog platform focused on technical discussions",
    version="1.0.0",
    lifespan=lifespan
)

# Add Socket.IO to FastAPI
socket_app = socketio.ASGIApp(sio, app)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"] if settings.DEBUG else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(RateLimitMiddleware)

# Static files
if os.path.exists("uploads"):
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(posts.router, prefix="/api/posts", tags=["Posts"])
app.include_router(comments.router, prefix="/api/comments", tags=["Comments"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])

# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "OK",
        "message": "Tech Blog Platform API is running",
        "version": "1.0.0"
    }

# Socket.IO events
@sio.event
async def connect(sid, environ):
    """Handle client connection"""
    logger.info(f"Client {sid} connected")

@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    logger.info(f"Client {sid} disconnected")

@sio.event
async def join_post(sid, data):
    """Join a post room for real-time updates"""
    post_id = data.get('postId')
    if post_id:
        await sio.enter_room(sid, f"post-{post_id}")
        logger.info(f"Client {sid} joined post room: post-{post_id}")

@sio.event
async def leave_post(sid, data):
    """Leave a post room"""
    post_id = data.get('postId')
    if post_id:
        await sio.leave_room(sid, f"post-{post_id}")
        logger.info(f"Client {sid} left post room: post-{post_id}")

# Global exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions"""
    return {
        "error": exc.detail,
        "status_code": exc.status_code
    }

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {exc}")
    return {
        "error": "Internal server error",
        "message": str(exc) if settings.DEBUG else "Something went wrong"
    }

if __name__ == "__main__":
    uvicorn.run(
        "app.main:socket_app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )



