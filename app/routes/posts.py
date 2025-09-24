"""
Post routes
"""

from fastapi import APIRouter

router = APIRouter()

# Placeholder - implement post routes here
@router.get("/")
async def get_posts():
    return {"message": "Post routes - to be implemented"}



