# Payment Integration - Razorpay

This folder contains the payment integration using Razorpay for the e-commerce platform.

## Setup

### 1. Install Dependencies

```bash
pip install razorpay
```

Or install from requirements.txt:
```bash
pip install -r requirements.txt
```

### 2. Environment Variables

Add the following to your `.env` file:

```
RAZORPAY_KEY_ID=rzp_test_x4UltRWpwOAf5h
RAZORPAY_KEY_SECRET=KPSF1cqVvwdv6d5nhayl9nYp
```

**Note:** These are test credentials. For production, replace with your live Razorpay keys.

### 3. MongoDB Collection

The payment system automatically creates an `orders` collection in your MongoDB database to store order details.

## Features

### Frontend (CheckoutPage.jsx)
- Collects shipping information (name, email, phone, address, city, pincode)
- Form validation for all fields
- Displays order summary with cart items
- Integrates Razorpay checkout
- Handles payment success and failure
- Clears cart after successful payment
- Redirects to home page after 3 seconds

### Backend (payment_routes.py)
- **POST /api/create-order**: Creates a Razorpay order
- **POST /api/verify-payment**: Verifies payment signature and saves order to database
- **GET /api/orders/{order_id}**: Retrieves order details

## Payment Flow

1. User adds items to cart
2. Clicks "Proceed to Payment" on cart page
3. Redirected to checkout page (`/checkout`)
4. Fills shipping information form
5. Clicks "Pay ₹{amount}"
6. Razorpay payment modal opens
7. User completes payment
8. Backend verifies payment signature
9. Order is saved to database
10. Cart is cleared
11. Success message displayed
12. User redirected to home page

## Order Schema

```json
{
  "order_id": "ORD20251111123456",
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "customer": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "address": "123 Street",
    "city": "Mumbai",
    "pincode": "400001"
  },
  "items": [
    {
      "id": "product_id",
      "name": "Product Name",
      "price": 1000,
      "quantity": 2
    }
  ],
  "subtotal": 2000,
  "tax": 160,
  "total": 2160,
  "payment_status": "completed",
  "order_status": "processing",
  "created_at": "2025-11-11T12:34:56",
  "updated_at": "2025-11-11T12:34:56"
}
```

## Testing

### Test Cards
Use these test card details in Razorpay test mode:

**Success:**
- Card Number: `4111 1111 1111 1111`
- CVV: Any 3 digits
- Expiry: Any future date

**Failure:**
- Card Number: `4000 0000 0000 0002`
- CVV: Any 3 digits
- Expiry: Any future date

### UPI Testing
- VPA: `success@razorpay`

## Security

- Payment signature verification using HMAC SHA256
- Environment variables for sensitive credentials
- CORS enabled for frontend integration
- All amounts in paise (₹1 = 100 paise)

## Production Checklist

- [ ] Replace test Razorpay keys with live keys
- [ ] Update `RAZORPAY_KEY_ID` in both backend (.env) and frontend (CheckoutPage.jsx)
- [ ] Enable webhook for payment notifications
- [ ] Add proper error logging
- [ ] Implement order email notifications
- [ ] Add order tracking system
- [ ] Set up proper database backups
- [ ] Configure proper CORS origins (not "*")

## Troubleshooting

### Razorpay SDK not loading
- Check internet connection
- Verify Razorpay script URL is correct
- Check browser console for errors

### Payment verification fails
- Verify Razorpay credentials are correct
- Check signature generation logic
- Ensure order_id matches

### Database connection issues
- Verify MONGO_URI is set correctly
- Check MongoDB connection status
- Ensure proper permissions for orders collection

## Support

For Razorpay-specific issues, refer to:
- [Razorpay Documentation](https://razorpay.com/docs/)
- [Razorpay Test Mode](https://razorpay.com/docs/payments/payments/test-card-details/)
