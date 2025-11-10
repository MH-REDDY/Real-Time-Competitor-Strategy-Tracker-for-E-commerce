import { ShoppingCart, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './ProductCard.css';

const ProductCard = ({ product, showQuantity = false }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();

  const handleViewDetails = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    const pid = product._id || product.id;
    navigate(`/product/${pid}`);
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    addToCart(product, 1);
  };

  return (
    <div className="product-card" onClick={handleViewDetails}>
      <div className="product-image-container">
        <img src={product.image_url || product.image} alt={product.title || product.name} className="product-image" />
        <div className="product-overlay">
          <button className="overlay-btn" onClick={handleViewDetails}>
            <Eye size={20} />
            View Details
          </button>
        </div>
      </div>
      <div className="product-info">
        {product.brand && <p className="product-brand">{product.brand}</p>}
        <h3 className="product-name">{product.title || product.name}</h3>
        <p className="product-category">{product.category || 'Products'}</p>
        <div className="product-footer">
          <span className="product-price">₹{(typeof product.price === 'number' ? product.price : Number(product.price || 0)).toFixed(2)}</span>
          {showQuantity && (
            <button className="add-cart-btn" onClick={handleAddToCart}>
              <ShoppingCart size={18} />
              Add to Cart
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
