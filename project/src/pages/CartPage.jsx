import { useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';
import './CartPage.css';

const CartPage = () => {
  const navigate = useNavigate();
  const { cartItems, removeFromCart, updateQuantity, getTotalPrice, getTotalItems } = useCart();

  const handleCheckout = () => {
    alert('Payment functionality will be integrated here. Thank you for shopping with Ignite!');
  };

  if (cartItems.length === 0) {
    return (
      <div className="cart-page">
        <div className="empty-cart">
          <ShoppingBag size={80} />
          <h2>Your Cart is Empty</h2>
          <p>Add some products to your cart to see them here</p>
          <button className="continue-shopping-btn" onClick={() => navigate('/browse-events')}>
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-container">
        <div className="cart-header">
          <button className="back-btn" onClick={() => navigate('/browse-events')}>
            <ArrowLeft size={20} />
            Continue Shopping
          </button>
          <h1>Shopping Cart ({getTotalItems()} items)</h1>
        </div>

        <div className="cart-content">
          <div className="cart-items">
            {cartItems.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="item-image">
                  <img src={item.image} alt={item.name} />
                </div>
                <div className="item-details">
                  <h3 className="item-name">{item.name}</h3>
                  <p className="item-brand">{item.brand}</p>
                  <p className="item-category">{item.category}</p>
                </div>
                <div className="item-quantity">
                  <button
                    className="qty-btn"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    <Minus size={16} />
                  </button>
                  <span className="qty-value">{item.quantity}</span>
                  <button
                    className="qty-btn"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="item-price">
                  <p className="price">₹{(item.price * item.quantity).toFixed(2)}</p>
                  <p className="unit-price">₹{item.price.toFixed(2)} each</p>
                </div>
                <button
                  className="remove-btn"
                  onClick={() => removeFromCart(item.id)}
                  title="Remove from cart"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <h2>Order Summary</h2>
            <div className="summary-details">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>₹{getTotalPrice().toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <span className="free">FREE</span>
              </div>
              <div className="summary-row">
                <span>Tax</span>
                <span>₹{(getTotalPrice() * 0.08).toFixed(2)}</span>
              </div>
              <div className="summary-divider"></div>
              <div className="summary-row total">
                <span>Total</span>
                <span>₹{(getTotalPrice() * 1.08).toFixed(2)}</span>
              </div>
            </div>
            <button className="checkout-btn" onClick={handleCheckout}>
              Proceed to Payment
            </button>
            <div className="benefits-list">
              <div className="benefit">
                <span className="check">✓</span>
                Free shipping on all orders
              </div>
              <div className="benefit">
                <span className="check">✓</span>
                2-day delivery available
              </div>
              <div className="benefit">
                <span className="check">✓</span>
                30-day return policy
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
