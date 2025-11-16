"""
User and Admin data models
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    
class UserCreate(UserBase):
    password: str
    
class UserLogin(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    password: str
    
class UserResponse(UserBase):
    id: str = Field(alias="_id")
    role: str
    is_active: bool
    created_at: datetime
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "_id": "507f1f77bcf86cd799439011",
                "email": "user@example.com",
                "full_name": "John Doe",
                "role": "user",
                "is_active": True,
                "created_at": "2025-11-06T10:00:00"
            }
        }

class AdminResponse(UserBase):
    id: str = Field(alias="_id")
    role: str
    created_at: datetime
    
    class Config:
        populate_by_name = True

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    user: dict
    
class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    username: Optional[str] = None
