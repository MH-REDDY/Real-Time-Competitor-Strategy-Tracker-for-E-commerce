"""
Authentication routes for login and registration
"""
from fastapi import APIRouter, HTTPException, status, Depends
from datetime import timedelta
from app.models.user import UserLogin, UserCreate, Token, UserResponse, TokenData
from app.config.database import get_admins_collection, get_users_collection
from app.utils.security import (
    verify_password, 
    get_password_hash, 
    create_access_token,
    get_current_user
)
from app.config.settings import ACCESS_TOKEN_EXPIRE_MINUTES
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
async def login(user_credentials: UserLogin):
    """
    Login for both admin and users
    Returns JWT token on successful authentication
    """
    admins_collection = get_admins_collection()
    users_collection = get_users_collection()
    
    # Determine lookup based on provided identifier
    user = None
    role = "user"

    # Admins can login via username OR email
    if user_credentials.username:
        user = admins_collection.find_one({"username": user_credentials.username})
        role = "admin" if user else "user"

    # If not found via username, or username not provided, try email
    if not user and user_credentials.email:
        # Try admin by email first
        user = admins_collection.find_one({"email": user_credentials.email})
        role = "admin" if user else "user"
        # If still not found, try user by email
        if not user:
            user = users_collection.find_one({"email": user_credentials.email})
            role = "user" if user else role
    
    # User not found in either collection
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password with safety checks
    if "password" not in user or not user.get("password"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account misconfigured: missing password"
        )
    try:
        valid_pwd = verify_password(user_credentials.password, user["password"])
    except Exception:
        # Unknown hash or invalid stored hash
        valid_pwd = False
    if not valid_pwd:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user account is active (only for users, not admins)
    if role == "user" and not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact administrator."
        )
    
    # Create access token (include both email and username when available)
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    subject = user.get("email") or user.get("username")
    access_token = create_access_token(
        data={
            "sub": subject,
            "role": role,
            "email": user.get("email"),
            "username": user.get("username"),
        },
        expires_delta=access_token_expires,
    )
    
    # Prepare user data for response (exclude password)
    user_data = {
        "_id": str(user["_id"]),
        "email": user.get("email"),
        "username": user.get("username"),
        "full_name": user.get("full_name") or user.get("username") or user.get("email"),
        "role": role,
    }
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": role,
        "user": user_data
    }

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """
    Register a new user account
    Admin accounts cannot be created through this endpoint
    """
    users_collection = get_users_collection()
    admins_collection = get_admins_collection()
    
    # Check if email already exists in either collection
    if users_collection.find_one({"email": user_data.email}) or admins_collection.find_one({"email": user_data.email}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate password strength
    if len(user_data.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )
    
    # Create new user
    new_user = {
        "email": user_data.email,
        "full_name": user_data.full_name,
        "password": get_password_hash(user_data.password),
        "role": "user",
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    
    result = users_collection.insert_one(new_user)
    new_user["_id"] = str(result.inserted_id)
    
    return new_user

@router.get("/me", response_model=dict)
async def get_current_user_info(current_user: TokenData = Depends(get_current_user)):
    """
    Get current authenticated user information
    """
    admins_collection = get_admins_collection()
    users_collection = get_users_collection()
    
    # Find user in appropriate collection
    if current_user.role == "admin":
        query = {}
        if current_user.email:
            query["email"] = current_user.email
        elif current_user.username:
            query["username"] = current_user.username
        user = admins_collection.find_one(query) if query else None
    else:
        user = users_collection.find_one({"email": current_user.email})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    created = user.get("created_at")
    try:
        created_str = created.isoformat() if created else None
    except Exception:
        created_str = str(created) if created is not None else None

    return {
        "_id": str(user["_id"]),
        "email": user.get("email"),
        "username": user.get("username"),
        "full_name": user.get("full_name") or user.get("username") or user.get("email"),
        "role": current_user.role,
        "is_active": user.get("is_active", True) if current_user.role == "user" else True,
        "created_at": created_str,
    }

@router.post("/logout")
async def logout():
    """
    Logout endpoint (client should discard the token)
    """
    return {"message": "Successfully logged out. Please discard your token."}
