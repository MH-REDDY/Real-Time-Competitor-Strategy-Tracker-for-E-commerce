from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pymongo import MongoClient
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://teamignite:J8L7pSQ29w2mopPW@ecomtracker.sw0pckw.mongodb.net/?appName=ecomtracker")
client = MongoClient(MONGO_URI)
db = client['ecom_tracker']

# Ensure users collection exists and has required indexes
def ensure_users_collection():
    try:
        # Check if collection exists
        collection_names = db.list_collection_names()
        print(f"Existing collections: {collection_names}")
        
        if 'users' not in collection_names:
            print("Creating 'users' collection...")
            db.create_collection('users')
            print("Successfully created 'users' collection")
        
        # Get the collection
        users_collection = db['users']
        
        # Create indexes
        print("Creating indexes...")
        users_collection.create_index([("username", 1)], unique=True)
        users_collection.create_index([("email", 1)], unique=True)
        print("Successfully created indexes")
        
        # Verify collection exists and is accessible
        users_collection.count_documents({})
        print("Successfully connected to 'users' collection")
        
        return users_collection
        
    except Exception as e:
        print(f"Error setting up users collection: {str(e)}")
        raise

# Initialize users collection
users_collection = ensure_users_collection()

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
try:
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    # Test the hashing to ensure it works
    pwd_context.hash("test")
except Exception as e:
    print(f"Error initializing bcrypt: {str(e)}")
    # Fall back to a simpler configuration
    pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# User model
class UserInDB:
    def __init__(self, username: str, hashed_password: str, role: str = "user", full_name: str = None, disabled: bool = False):
        self.username = username
        self.hashed_password = hashed_password
        self.role = role
        self.full_name = full_name
        self.disabled = disabled

    @classmethod
    def from_mongo(cls, user_data: dict):
        return cls(
            username=user_data["username"],
            hashed_password=user_data["hashed_password"],
            role=user_data.get("role", "user"),
            full_name=user_data.get("full_name"),
            disabled=user_data.get("disabled", False)
        )

    def to_dict(self):
        return {
            "username": self.username,
            "hashed_password": self.hashed_password,
            "role": self.role,
            "full_name": self.full_name,
            "disabled": self.disabled
        }
        
    def is_admin(self):
        return self.role == "admin"

# Authentication functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def get_user(username: str) -> Optional[UserInDB]:
    user_data = users_collection.find_one({"$or": [{"username": username}, {"email": username}]})
    if user_data:
        return UserInDB.from_mongo(user_data)
    return None

def authenticate_user(username: str, password: str) -> Optional[UserInDB]:
    user = get_user(username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None, user: Optional[UserInDB] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    
    # Add user role to token if user is provided
    if user:
        to_encode.update({"role": user.role})
        
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInDB:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
            
        # Get user from database
        user = get_user(username)
        if user is None:
            raise credentials_exception
            
        # Update user role from token if present (in case it was changed)
        token_role = payload.get("role")
        if token_role:
            user.role = token_role
            
        return user
        
    except JWTError:
        raise credentials_exception

async def get_current_active_user(current_user: UserInDB = Depends(get_current_user)) -> UserInDB:
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user
    
async def get_current_admin_user(current_user: UserInDB = Depends(get_current_active_user)) -> UserInDB:
    if not current_user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user
