import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, Zap, Truck, Package, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { products } from '../data/products';
import { useCart } from '../context/CartContext';
import './ProductDetailPage.css';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');

  const product = products.find((p) => p.id === parseInt(id));

  if (!product) {
    return (
      <div className="product-not-found">
        <h2>Product not found</h2>
        <button onClick={() => navigate('/browse-events')}>Back to Browse</button>
      </div>
    );
  }

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? product.images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === product.images.length - 1 ? 0 : prev + 1));
  };

  const handleAddToCart = () => {
    addToCart(product, quantity);
    alert('Added to cart successfully!');
  };

  const handleBuyNow = () => {
    addToCart(product, quantity);
    navigate('/cart');
  };

  return (
    <div className="product-detail-page">
      <div className="product-detail-container">
        <div className="product-gallery">
          <div className="main-image">
            <button className="nav-btn prev" onClick={handlePrevImage}>
              <ChevronLeft size={24} />
            </button>
            <img src={product.images[currentImageIndex]} alt={product.name} />
            <button className="nav-btn next" onClick={handleNextImage}>
              <ChevronRight size={24} />
            </button>
          </div>
          <div className="thumbnail-list">
            {product.images.map((image, index) => (
              <div
                key={index}
                className={`thumbnail ${index === currentImageIndex ? 'active' : ''}`}
                onClick={() => setCurrentImageIndex(index)}
              >
                <img src={image} alt={`${product.name} ${index + 1}`} />
              </div>
            ))}
          </div>
        </div>

        <div className="product-info-section">
          <div className="product-header">
            <span className="product-brand">{product.brand}</span>
            <h1 className="product-name">{product.name}</h1>
            <p className="product-category">{product.category}</p>
            <div className="product-price">₹{product.price.toFixed(2)}</div>
          </div>

          <div className="benefits-section">
            <div className="benefit-item">
              <Truck size={24} />
              <div>
                <strong>Free Delivery</strong>
                <p>On all orders</p>
              </div>
            </div>
            <div className="benefit-item">
              <Zap size={24} />
              <div>
                <strong>2-Day Delivery</strong>
                <p>Fast shipping</p>
              </div>
            </div>
            <div className="benefit-item">
              <Package size={24} />
              <div>
                <strong>Easy Returns</strong>
                <p>30-day policy</p>
              </div>
            </div>
            <div className="benefit-item">
              <Shield size={24} />
              <div>
                <strong>1 Year Warranty</strong>
                <p>Full coverage</p>
              </div>
            </div>
          </div>

          <div className="quantity-section">
            <label>Quantity:</label>
            <div className="quantity-controls">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
              <span>{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)}>+</button>
            </div>
          </div>

          <div className="action-buttons">
            <button className="add-to-cart-btn" onClick={handleAddToCart}>
              <ShoppingCart size={20} />
              Add to Cart
            </button>
            <button className="buy-now-btn" onClick={handleBuyNow}>
              Buy Now
            </button>
          </div>
        </div>
      </div>

      <div className="product-details-tabs">
        <div className="tabs-header">
          <button
            className={`tab ${activeTab === 'description' ? 'active' : ''}`}
            onClick={() => setActiveTab('description')}
          >
            Description
          </button>
          <button
            className={`tab ${activeTab === 'specifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('specifications')}
          >
            Specifications
          </button>
          <button
            className={`tab ${activeTab === 'features' ? 'active' : ''}`}
            onClick={() => setActiveTab('features')}
          >
            Features
          </button>
        </div>

        <div className="tabs-content">
          {activeTab === 'description' && (
            <div className="tab-panel">
              <h3>Product Description</h3>
              <p>{product.description}</p>
            </div>
          )}

          {activeTab === 'specifications' && (
            <div className="tab-panel">
              <h3>Technical Specifications</h3>
              <div className="specifications-grid">
                {product.specifications.map((spec, index) => (
                  <div key={index} className="spec-item">
                    <span className="spec-label">{spec.label}:</span>
                    <span className="spec-value">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="tab-panel">
              <h3>Key Features</h3>
              <ul className="features-list">
                {product.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
