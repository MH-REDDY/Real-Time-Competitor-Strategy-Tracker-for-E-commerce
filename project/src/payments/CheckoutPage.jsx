import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from '../context/CartContext';
import './CheckoutPage.css';

function CheckoutPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { cartItems, getTotalPrice, clearCart } = useCart();
    
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        pincode: ""
    });
    const [orderId, setOrderId] = useState("");

    // Calculate amounts
    const subtotal = getTotalPrice();
    const tax = subtotal * 0.08;
    const total = subtotal + tax;
    const amountInPaise = Math.round(total * 100); // Convert to paise

    useEffect(() => {
        // Redirect if cart is empty
        if (cartItems.length === 0 && !paymentSuccess) {
            navigate('/cart');
            return;
        }

        // Load Razorpay SDK
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        script.onload = () => console.log("Razorpay SDK Loaded");
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, [cartItems, navigate, paymentSuccess]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const validateForm = () => {
        const { name, email, phone, address, city, pincode } = formData;
        if (!name || !email || !phone || !address || !city || !pincode) {
            alert("Please fill all required fields.");
            return false;
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert("Please enter a valid email address.");
            return false;
        }
        
        // Phone validation (10 digits)
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(phone)) {
            alert("Please enter a valid 10-digit phone number.");
            return false;
        }
        
        // Pincode validation (6 digits)
        const pincodeRegex = /^[0-9]{6}$/;
        if (!pincodeRegex.test(pincode)) {
            alert("Please enter a valid 6-digit pincode.");
            return false;
        }
        
        return true;
    };

    const createOrder = async () => {
        if (!validateForm()) return;

        try {
            const res = await fetch("/api/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    amount: amountInPaise,
                    currency: "INR"
                })
            });

            if (!res.ok) {
                throw new Error("Failed to create order");
            }

            const data = await res.json();
            setOrderId(data.id);
            openRazorpay(data.id);
        } catch (err) {
            console.error("Error creating order:", err);
            alert("Failed to create order. Please try again.");
        }
    };

    const openRazorpay = (orderId) => {
        if (!window.Razorpay) {
            alert("Razorpay SDK failed to load. Please try again.");
            return;
        }

        const options = {
            key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_PLACEHOLDER",
            amount: amountInPaise,
            currency: "INR",
            name: "Ignite E-commerce",
            description: "Purchase of Products",
            order_id: orderId,
            handler: async (response) => {
                try {
                    // Verify payment on backend
                    const verifyRes = await fetch("/api/verify-payment", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            order_details: {
                                customer: formData,
                                items: cartItems,
                                subtotal: subtotal,
                                tax: tax,
                                total: total
                            }
                        })
                    });

                    if (!verifyRes.ok) {
                        throw new Error("Payment verification failed");
                    }

                    const verifyData = await verifyRes.json();
                    
                    if (verifyData.status === "success") {
                        alert("Payment Successful! Order ID: " + verifyData.order_id);
                        setPaymentSuccess(true);
                        clearCart();
                        
                        // Redirect after 3 seconds
                        setTimeout(() => {
                            navigate('/browse-events');
                        }, 3000);
                    } else {
                        throw new Error("Payment verification failed");
                    }
                } catch (err) {
                    console.error("Error verifying payment:", err);
                    alert("Payment verification failed. Please contact support.");
                }
            },
            prefill: {
                name: formData.name,
                email: formData.email,
                contact: formData.phone
            },
            theme: {
                color: "#ff6b6b"
            }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response){
            alert("Payment Failed: " + response.error.description);
        });
        rzp.open();
    };

    if (paymentSuccess) {
        return (
            <div className="checkout-page">
                <div className="success-message">
                    <div className="success-icon">✓</div>
                    <h2>🎉 Payment Successful!</h2>
                    <p>Thank you for your purchase!</p>
                    <p>You will be redirected to the home page shortly...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="checkout-page">
            <div className="checkout-container">
                <h1>Checkout</h1>
                
                <div className="checkout-content">
                    <div className="checkout-form">
                        <h2>Shipping Information</h2>
                        <form>
                            <div className="form-group">
                                <label htmlFor="name">Full Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    id="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="Enter your full name"
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="email">Email Address *</label>
                                <input
                                    type="email"
                                    name="email"
                                    id="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    placeholder="your.email@example.com"
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="phone">Phone Number *</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    id="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    placeholder="10-digit mobile number"
                                    maxLength="10"
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="address">Address *</label>
                                <textarea
                                    name="address"
                                    id="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    placeholder="House/Flat No., Street, Area"
                                    rows="3"
                                    required
                                />
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="city">City *</label>
                                    <input
                                        type="text"
                                        name="city"
                                        id="city"
                                        value={formData.city}
                                        onChange={handleInputChange}
                                        placeholder="City"
                                        required
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label htmlFor="pincode">Pincode *</label>
                                    <input
                                        type="text"
                                        name="pincode"
                                        id="pincode"
                                        value={formData.pincode}
                                        onChange={handleInputChange}
                                        placeholder="6-digit pincode"
                                        maxLength="6"
                                        required
                                    />
                                </div>
                            </div>
                        </form>
                    </div>

                    <div className="order-summary">
                        <h2>Order Summary</h2>
                        
                        <div className="summary-items">
                            {cartItems.map((item) => (
                                <div key={item.id} className="summary-item">
                                    <img src={item.image} alt={item.name} />
                                    <div className="item-info">
                                        <h4>{item.name}</h4>
                                        <p>Qty: {item.quantity}</p>
                                    </div>
                                    <span className="item-price">₹{(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="summary-details">
                            <div className="summary-row">
                                <span>Subtotal</span>
                                <span>₹{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="summary-row">
                                <span>Shipping</span>
                                <span className="free">FREE</span>
                            </div>
                            <div className="summary-row">
                                <span>Tax (8%)</span>
                                <span>₹{tax.toFixed(2)}</span>
                            </div>
                            <div className="summary-divider"></div>
                            <div className="summary-row total">
                                <span>Total</span>
                                <span>₹{total.toFixed(2)}</span>
                            </div>
                        </div>

                        <button onClick={createOrder} className="pay-button">
                            Pay ₹{total.toFixed(2)}
                        </button>
                        
                        <div className="secure-payment">
                            <span>🔒</span> Secure Payment via Razorpay
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CheckoutPage;
