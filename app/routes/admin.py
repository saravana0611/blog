"""
Admin routes
"""

from fastapi import APIRouter

router = APIRouter()

# Placeholder - implement admin routes here
@router.get("/")
async def admin_dashboard():
    return {"message": "Admin routes - to be implemented"}



