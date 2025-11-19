"""
Admin-only routes
"""
from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks
import logging
import sys
import os
import importlib
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


@router.get("/alerts")
async def list_alerts(limit: int = 20, current_admin: TokenData = Depends(get_current_admin)):
    """List recent alerts (Admin only)"""
    from app.config.database import get_database
    db = get_database()
    if db is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database not available")
    alerts_col = db.get_collection('alerts')
    docs = list(alerts_col.find().sort('triggered_at', -1).limit(int(limit)))
    # Convert ObjectId to str and datetime to iso
    for d in docs:
        d['_id'] = str(d['_id'])
        if 'triggered_at' in d:
            try:
                d['triggered_at'] = d['triggered_at'].isoformat()
            except Exception:
                pass
    return docs


@router.patch("/alerts/{alert_id}/ack")
async def ack_alert(alert_id: str, current_admin: TokenData = Depends(get_current_admin)):
    """Acknowledge an alert (Admin only)"""
    from app.config.database import get_database
    from bson import ObjectId
    db = get_database()
    if db is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database not available")
    alerts_col = db.get_collection('alerts')
    try:
        res = alerts_col.update_one({"_id": ObjectId(alert_id)}, {"$set": {"status": "acknowledged"}})
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid alert id")
    if res.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    return {"ok": True}


@router.post("/scrape")
async def trigger_scrape(background_tasks: BackgroundTasks, current_admin: TokenData = Depends(get_current_admin)):
    """
    Admin-only endpoint to trigger the scraper. Runs the scraper in the background so the
    request returns immediately. The scraper module is imported dynamically from the
    repository `amazon_scraper` folder to avoid import-time failures when running in other
    environments.
    """
    # Dynamically add the project root -> amazon_scraper to sys.path and import
    try:
        base = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
        scraper_dir = os.path.join(base, 'amazon_scraper')
        if scraper_dir not in sys.path:
            sys.path.insert(0, scraper_dir)

        scraper_mod = importlib.import_module('amazon_price_scraper')
        run_scraper_fn = getattr(scraper_mod, 'run_scraper', None)
        if not callable(run_scraper_fn):
            logging.error('Scraper run_scraper function not found')
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Scraper callable not found')
    except HTTPException:
        raise
    except Exception:
        logging.exception('Failed to import scraper module')
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Failed to load scraper module')

    def _run():
        try:
            run_scraper_fn()
        except Exception:
            logging.exception('Admin-triggered scraper failed')

    background_tasks.add_task(_run)
    return {"message": "Scraper started in background"}


@router.get("/alerts/settings")
async def get_alert_settings(current_admin: TokenData = Depends(get_current_admin)):
    """Get global alert settings (Admin only)"""
    from app.config.database import get_database
    db = get_database()
    if db is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database not available")
    settings_col = db.get_collection('alert_settings')
    doc = settings_col.find_one({'_id': 'global'})
    if not doc:
        # return sensible defaults
        return {
            'enabled': True,
            'notify_channels': {'slack': True, 'email': False},
            'threshold_percent': 20.0,
            'threshold_absolute': 500.0,
            'min_price_for_alert': 100.0,
            'quiet_hours': None
        }
    # remove internal _id if present
    if '_id' in doc:
        del doc['_id']
    return doc


@router.put("/alerts/settings")
async def update_alert_settings(payload: dict, current_admin: TokenData = Depends(get_current_admin)):
    """Update global alert settings (Admin only). Accepts a JSON body with settings."""
    from app.config.database import get_database
    db = get_database()
    if db is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database not available")
    settings_col = db.get_collection('alert_settings')
    # Upsert the global settings document
    try:
        settings_col.update_one({'_id': 'global'}, {'$set': payload}, upsert=True)
    except Exception:
        logging.exception('Failed to update alert settings')
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Failed to update settings')
    return {'ok': True, 'updated': payload}
