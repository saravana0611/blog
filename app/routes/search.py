"""
Search routes
"""

from fastapi import APIRouter

router = APIRouter()

# Placeholder - implement search routes here
@router.get("/")
async def search():
    return {"message": "Search routes - to be implemented"}



