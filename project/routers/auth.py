from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from auth import (
    SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, 
    users_collection, get_password_hash, verify_password, create_access_token,
    get_current_user, get_current_active_user, authenticate_user, get_user
)

# Import admin functions
from routers.admin import get_current_admin_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

class TokenData:
    def __init__(self, access_token: str, token_type: str):
        self.access_token = access_token
        self.token_type = token_type

class UserBase(BaseModel):
    username: str
    email: str
    full_name: Optional[str] = None
    disabled: Optional[bool] = None

class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    hashed_password: str

@router.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, 
        expires_delta=access_token_expires,
        user=user  # Pass user to include role in token
    )
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role
        }
    }

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate):
    try:
        print(f"Starting registration for user: {user_data.username}")
        
        # Validate password length
        if len(user_data.password) > 72:
            error_msg = "Password must be less than 72 characters"
            print(error_msg)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        
        print("Checking for existing user...")
        # Check if user already exists
        existing_user = users_collection.find_one({
            "$or": [
                {"username": user_data.username},
                {"email": user_data.email}
            ]
        })
        
        if existing_user:
            field = "username" if existing_user.get("username") == user_data.username else "email"
            error_msg = f"{field} already registered"
            print(error_msg)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        
        print("Hashing password...")
        # Create new user document
        try:
            hashed_password = get_password_hash(user_data.password)
            print("Password hashed successfully")
        except Exception as hash_error:
            print(f"Error hashing password: {str(hash_error)}")
            raise
        
        user_doc = {
            "username": user_data.username,
            "email": user_data.email,
            "hashed_password": hashed_password,
            "full_name": user_data.full_name,
            "disabled": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        print("Inserting user into database...")
        # Insert into database
        try:
            result = users_collection.insert_one(user_doc)
            print(f"User inserted with ID: {result.inserted_id}")
        except Exception as db_error:
            print(f"Database error: {str(db_error)}")
            raise
        
        print("Creating access token...")
        # Create token for immediate login
        try:
            access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = create_access_token(
                data={"sub": user_data.username}, 
                expires_delta=access_token_expires
            )
            print("Access token created successfully")
        except Exception as token_error:
            print(f"Error creating access token: {str(token_error)}")
            raise
        
        response = {
            "message": "User created successfully",
            "access_token": access_token,
            "token_type": "bearer"
        }
        print("Registration completed successfully")
        return response
        
    except HTTPException as http_exc:
        # Re-raise HTTP exceptions as they are
        print(f"HTTP Exception: {str(http_exc)}")
        raise
    except Exception as e:
        error_msg = f"Unexpected error during registration: {str(e)}"
        print(error_msg)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg
        )

@router.get("/me")
async def read_users_me(current_user: UserInDB = Depends(get_current_active_user)):
    return {
        "username": current_user.username,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "disabled": current_user.disabled
    }

@router.get("/admin/me")
async def read_admin_me(admin_user: UserInDB = Depends(get_current_admin_user)):
    return {
        "username": admin_user.username,
        "full_name": admin_user.full_name,
        "role": admin_user.role,
        "is_admin": True
    }

@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup_user(user_data: UserCreate):
    try:
        print(f"Starting signup for user: {user_data.username}")
        
        # Validate password length
        if len(user_data.password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters long"
            )
            
        # Check if user already exists
        existing_user = users_collection.find_one({
            "$or": [
                {"username": user_data.username},
                {"email": user_data.email}
            ]
        })
        
        if existing_user:
            field = "username" if existing_user.get("username") == user_data.username else "email"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{field} already registered"
            )
        
        # Create new user
        hashed_password = get_password_hash(user_data.password)
        user_doc = {
            "username": user_data.username,
            "email": user_data.email,
            "hashed_password": hashed_password,
            "full_name": user_data.full_name,
            "disabled": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert user into database
        result = users_collection.insert_one(user_doc)
        user_id = str(result.inserted_id)
        
        # Create token for automatic login after signup
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user_data.username},
            expires_delta=access_token_expires
        )
        
        return {
            "message": "User created successfully",
            "user_id": user_id,
            "access_token": access_token,
            "token_type": "bearer",
            "redirect_to": "/dashboard"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error during signup: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during signup"
        )
