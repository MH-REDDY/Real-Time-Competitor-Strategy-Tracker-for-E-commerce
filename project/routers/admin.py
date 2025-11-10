from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from pymongo import MongoClient
import os
from dotenv import load_dotenv
from pydantic import BaseModel
from auth import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, create_access_token, oauth2_scheme, get_password_hash, verify_password
from jose import JWTError, jwt

load_dotenv()

router = APIRouter(prefix="/api/admin", tags=["Admin"])

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://teamignite:J8L7pSQ29w2mopPW@ecomtracker.sw0pckw.mongodb.net/")
client = MongoClient(MONGO_URI)
db = client['ecom_tracker']
admins_collection = db['admin']
users_collection = db['users']

def verify_admin(username: str, password: str) -> bool:
    try:
        print(f"[DEBUG] Verifying admin: {username}")
        
        # Check if username is provided
        if not username:
            print("[ERROR] Username is required")
            return False
            
        # Find admin by username
        admin = admins_collection.find_one({"username": username})
        
        if not admin:
            print(f"[ERROR] Admin not found with username: {username}")
            return False
        
        print(f"[DEBUG] Found admin: {admin.get('username')}")
        print(f"[DEBUG] Stored password: {admin.get('password')}")
        print(f"[DEBUG] Provided password: {password}")
        
        # Verify password (in production, use proper password hashing)
        stored_password = admin.get("password")
        if not stored_password:
            print("[ERROR] No password found for admin user")
            return False
            
        is_password_valid = stored_password == password
        print(f"[DEBUG] Password valid: {is_password_valid}")
        
        # Also check if the admin is active
        is_active = admin.get("is_active", False)
        print(f"[DEBUG] Admin active status: {is_active}")
        
        return is_password_valid and is_active
        
    except Exception as e:
        print(f"[ERROR] Error verifying admin: {str(e)}")
        return False

class AdminLogin(BaseModel):
    username: str
    password: str

@router.post("/login")
async def admin_login(login_data: AdminLogin):
    print(f"Admin login attempt for user: {login_data.username}")
    
    # Verify admin credentials
    is_valid = verify_admin(login_data.username, login_data.password)
    print(f"Admin verification result: {is_valid}")
    
    if not is_valid:
        print("Admin login failed: Invalid credentials")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": login_data.username, "role": "admin"},
        expires_delta=access_token_expires
    )
    
    print(f"Admin login successful for user: {login_data.username}")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "username": login_data.username,
            "role": "admin"
        }
    }

async def get_current_admin_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate admin credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None or role != "admin":
            raise credentials_exception
        return {"username": username, "role": role}
    except JWTError:
        raise credentials_exception

@router.get("/dashboard")
async def admin_dashboard(current_user: dict = Depends(get_current_admin_user)):
    return {
        "message": "Welcome to Admin Dashboard",
        "user": current_user
    }


# ============================
# Users management (admin only)
# ============================

@router.get("/users")
async def list_users(current_user: dict = Depends(get_current_admin_user)):
    try:
        users = []
        # Exclude admin accounts from listing
        for doc in users_collection.find({"role": {"$ne": "admin"}}, {"hashed_password": 0}).sort([("created_at", -1)]):
            # serialize ObjectId
            doc["_id"] = str(doc["_id"]) if doc.get("_id") else None
            users.append(doc)
        return users
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_admin_user)):
    try:
        from bson import ObjectId
        try:
            oid = ObjectId(user_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid user id")
        res = users_collection.delete_one({"_id": oid, "role": {"$ne": "admin"}})
        if res.deleted_count == 0:
            raise HTTPException(status_code=404, detail="User not found or cannot delete admin")
        return {"status": "deleted", "id": user_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
