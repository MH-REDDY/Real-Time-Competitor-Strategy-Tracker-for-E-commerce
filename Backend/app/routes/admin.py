"""
Admin-only routes
"""
from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from app.models.user import UserResponse, TokenData
from app.config.database import get_users_collection
from app.utils.security import get_current_admin
from bson import ObjectId

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/users", response_model=List[dict])
async def get_all_users(current_admin: TokenData = Depends(get_current_admin)):
    """
    Get all user accounts (Admin only)
    """
    users_collection = get_users_collection()
    users = list(users_collection.find({}, {"password": 0}))  # Exclude password field
    
    # Convert ObjectId to string
    for user in users:
        user["_id"] = str(user["_id"])
    
    return users

@router.get("/users/{user_id}")
async def get_user(user_id: str, current_admin: TokenData = Depends(get_current_admin)):
    """
    Get specific user by ID (Admin only)
    """
    users_collection = get_users_collection()
    
    try:
        user = users_collection.find_one({"_id": ObjectId(user_id)}, {"password": 0})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format"
        )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user["_id"] = str(user["_id"])
    return user

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_admin: TokenData = Depends(get_current_admin)):
    """
    Delete a user account (Admin only)
    """
    users_collection = get_users_collection()
    
    try:
        result = users_collection.delete_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format"
        )
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {"message": "User deleted successfully"}

@router.patch("/users/{user_id}/toggle-active")
async def toggle_user_active(user_id: str, current_admin: TokenData = Depends(get_current_admin)):
    """
    Toggle user active status (Admin only)
    """
    users_collection = get_users_collection()
    
    try:
        user = users_collection.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format"
        )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    new_status = not user.get("is_active", True)
    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_active": new_status}}
    )
    
    return {
        "message": f"User {'activated' if new_status else 'deactivated'} successfully",
        "is_active": new_status
    }

@router.get("/stats")
async def get_admin_stats(current_admin: TokenData = Depends(get_current_admin)):
    """
    Get admin dashboard statistics (Admin only)
    """
    users_collection = get_users_collection()
    
    total_users = users_collection.count_documents({})
    active_users = users_collection.count_documents({"is_active": True})
    inactive_users = users_collection.count_documents({"is_active": False})
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": inactive_users
    }
