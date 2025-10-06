import { useNavigate } from 'react-router-dom';
import { ArrowRight, Tag, TrendingUp, Star } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { products } from '../data/products';
import './GuestHomePage.css';

const GuestHomePage = () => {
  const navigate = useNavigate();
  const featuredProducts = products.slice(0, 4);

  const handleBannerClick = () => {
    navigate('/login');
  };

  return (
    <div className="guest-home">
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Welcome to Ignite</h1>
          <p className="hero-subtitle">Experience Premium Audio Like Never Before</p>
          <button className="hero-btn" onClick={handleBannerClick}>
            Explore Now <ArrowRight size={20} />
          </button>
        </div>
      </section>

      <section className="banners-section">
        <div className="banners-container">
          <div className="banner-card" onClick={handleBannerClick}>
            <Tag size={32} />
            <h3>Mega Sale</h3>
            <p>Up to 50% off on selected items</p>
          </div>
          <div className="banner-card" onClick={handleBannerClick}>
            <TrendingUp size={32} />
            <h3>New Arrivals</h3>
            <p>Check out the latest products</p>
          </div>
          <div className="banner-card" onClick={handleBannerClick}>
            <Star size={32} />
            <h3>Premium Quality</h3>
            <p>Top-rated audio equipment</p>
          </div>
        </div>
      </section>

      <section className="products-section">
        <h2 className="section-title">Featured Products</h2>
        <div className="products-grid">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Experience Premium Audio?</h2>
          <p>Join thousands of satisfied customers and elevate your audio experience</p>
          <button className="cta-btn" onClick={() => navigate('/login')}>
            Get Started <ArrowRight size={20} />
          </button>
        </div>
      </section>
    </div>
  );
};

export default GuestHomePage;
