"""
User routes
"""

from fastapi import APIRouter

router = APIRouter()

# Placeholder - implement user routes here
@router.get("/")
async def get_users():
    return {"message": "User routes - to be implemented"}



