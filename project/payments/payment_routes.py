from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Any
import razorpay
import hmac
import hashlib
import os
from datetime import datetime
from pymongo import MongoClient

# Initialize Razorpay client
RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID', 'rzp_test_x4UltRWpwOAf5h')
RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET', 'KPSF1cqVvwdv6d5nhayl9nYp')

razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# MongoDB connection
MONGO_URI = os.environ.get('MONGO_URI')
if MONGO_URI:
    client = MongoClient(MONGO_URI)
    db = client['ecom_tracker']
    orders_col = db['orders']
else:
    orders_col = None

router = APIRouter(prefix="/api", tags=["payments"])


class CreateOrderRequest(BaseModel):
    amount: int  # Amount in paise
    currency: str = "INR"


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    order_details: Dict[str, Any]


@router.post("/create-order")
async def create_order(request: CreateOrderRequest):
    """
    Create a Razorpay order
    """
    try:
        # Create order
        order_data = {
            'amount': request.amount,
            'currency': request.currency,
            'payment_capture': 1  # Auto capture payment
        }
        
        order = razorpay_client.order.create(data=order_data)
        
        return {
            "id": order['id'],
            "amount": order['amount'],
            "currency": order['currency'],
            "status": "created"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")


@router.post("/verify-payment")
async def verify_payment(request: VerifyPaymentRequest):
    """
    Verify Razorpay payment signature and save order
    """
    try:
        # Verify signature
        generated_signature = hmac.new(
            RAZORPAY_KEY_SECRET.encode(),
            f"{request.razorpay_order_id}|{request.razorpay_payment_id}".encode(),
            hashlib.sha256
        ).hexdigest()
        
        if generated_signature != request.razorpay_signature:
            raise HTTPException(status_code=400, detail="Invalid payment signature")
        
        # Payment verified successfully
        # Save order to database
        order_id = f"ORD{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        order_doc = {
            "order_id": order_id,
            "razorpay_order_id": request.razorpay_order_id,
            "razorpay_payment_id": request.razorpay_payment_id,
            "customer": request.order_details.get("customer", {}),
            "items": request.order_details.get("items", []),
            "subtotal": request.order_details.get("subtotal", 0),
            "tax": request.order_details.get("tax", 0),
            "total": request.order_details.get("total", 0),
            "payment_status": "completed",
            "order_status": "processing",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        if orders_col is not None:
            orders_col.insert_one(order_doc)
        
        return {
            "status": "success",
            "message": "Payment verified successfully",
            "order_id": order_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment verification failed: {str(e)}")


@router.get("/orders/{order_id}")
async def get_order(order_id: str):
    """
    Get order details by order ID
    """
    try:
        if orders_col is None:
            raise HTTPException(status_code=500, detail="Database not configured")
        
        order = orders_col.find_one({"order_id": order_id}, {"_id": 0})
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        return order
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch order: {str(e)}")
