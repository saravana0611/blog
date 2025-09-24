"""
Configuration settings for the Tech Blog Platform
"""

import os
from typing import Optional
from pydantic import BaseSettings, validator

class Settings(BaseSettings):
    """Application settings"""
    
    # Server Configuration
    PORT: int = 5000
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    
    # Database Configuration
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "tech_blog_db"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "password123"
    
    # JWT Configuration
    JWT_SECRET: str = "your_super_secret_jwt_key_here_change_in_production"
    JWT_EXPIRES_IN: str = "7d"
    JWT_ALGORITHM: str = "HS256"
    
    # File Upload Configuration
    UPLOAD_PATH: str = "./uploads"
    MAX_FILE_SIZE: int = 5242880  # 5MB
    ALLOWED_EXTENSIONS: set = {"jpg", "jpeg", "png", "gif", "webp"}
    
    # Rate Limiting
    RATE_LIMIT_WINDOW_MS: int = 900000  # 15 minutes
    RATE_LIMIT_MAX_REQUESTS: int = 100
    
    # Admin Configuration
    ADMIN_EMAIL: str = "admin@yourdomain.com"
    ADMIN_PASSWORD: str = "admin_password_here"
    
    # Security
    CORS_ORIGINS: list = ["http://localhost:3000"]
    
    # External Services (optional)
    CLOUDINARY_URL: Optional[str] = None
    REDIS_URL: Optional[str] = None
    
    @validator('DB_PASSWORD')
    def validate_db_password(cls, v):
        if v == "your_password_here":
            raise ValueError("Please set a proper database password in your .env file")
        return v
    
    @validator('JWT_SECRET')
    def validate_jwt_secret(cls, v):
        if v == "your_super_secret_jwt_key_here_change_in_production":
            raise ValueError("Please set a proper JWT secret in your .env file")
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Create settings instance
settings = Settings()

# Database URL
DATABASE_URL = f"postgresql://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"



