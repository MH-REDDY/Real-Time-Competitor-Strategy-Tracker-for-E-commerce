import { useNavigate } from 'react-router-dom';
import { ArrowRight, Tag, TrendingUp, Star } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { products } from '../data/products';
import './HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();
  const featuredProducts = products.slice(0, 4);

  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Welcome to Ignite</h1>
          <p className="hero-subtitle">Experience Premium Audio Like Never Before</p>
          <button className="hero-btn" onClick={() => navigate('/browse-events')}>
            Browse Events <ArrowRight size={20} />
          </button>
        </div>
      </section>

      <section className="banners-section">
        <div className="banners-container">
          <div className="banner-card" onClick={() => navigate('/browse-events')}>
            <Tag size={32} />
            <h3>Mega Sale</h3>
            <p>Up to 50% off on selected items</p>
          </div>
          <div className="banner-card" onClick={() => navigate('/browse-events')}>
            <TrendingUp size={32} />
            <h3>New Arrivals</h3>
            <p>Check out the latest products</p>
          </div>
          <div className="banner-card" onClick={() => navigate('/browse-events')}>
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
          <h2>Discover More Amazing Products</h2>
          <p>Explore our full collection of premium audio equipment</p>
          <button className="cta-btn" onClick={() => navigate('/browse-events')}>
            Browse All Products <ArrowRight size={20} />
          </button>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
