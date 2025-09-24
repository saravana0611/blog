"""
Comment routes
"""

from fastapi import APIRouter

router = APIRouter()

# Placeholder - implement comment routes here
@router.get("/")
async def get_comments():
    return {"message": "Comment routes - to be implemented"}



