import { useNavigate } from 'react-router-dom';
import { ArrowRight, Tag, TrendingUp, Star } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { useEffect, useState } from 'react';
import './GuestHomePage.css';

const GuestHomePage = () => {
  const navigate = useNavigate();
  const [featuredProducts, setFeaturedProducts] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchProducts = async () => {
      try {
        const headers = {};
        const apiKey = import.meta.env.VITE_API_KEY;
        if (apiKey) headers['x-api-key'] = apiKey;
        const res = await fetch('/api/compare', { headers, signal: controller.signal });
        if (!res.ok) throw new Error(`Failed to load products: ${res.status}`);
        const data = await res.json();
        const mapped = (Array.isArray(data) ? data : [])
          .slice(0, 4)
          .map((p) => ({
            id: p.asin || p._id || String(Math.random()),
            name: p.title || 'Product',
            brand: p.brand || '',
            category: p.category || '',
            price: typeof p.price === 'number' ? p.price : (p.price ? Number(p.price) : 0),
            image: p.image_url || p.image || '',
          }));
        setFeaturedProducts(mapped);
      } catch (e) {
        setFeaturedProducts([]);
      }
    };
    fetchProducts();
    return () => controller.abort();
  }, []);

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
