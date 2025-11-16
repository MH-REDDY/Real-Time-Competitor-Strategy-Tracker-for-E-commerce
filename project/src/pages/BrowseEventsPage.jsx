import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ShoppingCart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './BrowseEventsPage.css';

const BrowseEventsPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const categories = ['all', 'Headphones', 'Speakers', 'Earphones'];

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const headers = {};
        const apiKey = import.meta.env.VITE_API_KEY;
        if (apiKey) headers['x-api-key'] = apiKey;
        const res = await fetch('/api/compare', { headers, signal: controller.signal });
        if (!res.ok) throw new Error('Failed to load products');
        const data = await res.json();
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (e?.name === 'AbortError' || String(e?.message || '').includes('aborted')) {
          return; // ignore aborted fetch
        }
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, []);

  const filteredProducts = useMemo(() => {
    const list = rows || [];
    return list.filter((p) => {
      const title = String(p.title || '').toLowerCase();
      const category = String(p.category || '').toLowerCase();
      const matchesSearch = title.includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || category === selectedCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [rows, searchQuery, selectedCategory]);

  return (
    <div className="browse-events-page">
      <div className="browse-header">
        <h1 className="browse-title">Browse Events</h1>
        <p className="browse-subtitle">Discover our premium collection of audio products</p>
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="category-filters">
          <div className="filter-header">
            <Filter size={20} />
            <span>Categories:</span>
          </div>
          <div className="category-list">
            {categories.map((category) => (
              <button
                key={category}
                className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category === 'all' ? 'All Products' : category}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="browse-container">
        <div className="products-section">
          <div className="results-info">
            <p><span className="results-count">{filteredProducts.length}</span> products found</p>
          </div>
          {loading ? (
            <div className="no-results"><p>Loading...</p></div>
          ) : (
            <div className="products-grid">
              {filteredProducts.map((p) => (
                <div className="product-card-wrapper" key={p.asin}>
                  <div className="product-card" onClick={() => navigate(`/product/${encodeURIComponent(p.asin || p._id)}`)}>
                    <div className="product-image-container">
                      <img src={p.image_url || 'https://placehold.co/400x300?text=No+Image'} alt={p.title} className="product-image" />
                    </div>
                    <div className="product-info">
                      <p className="product-brand">{p.category || 'Product'}</p>
                      <h3 className="product-name">{p.title}</h3>
                      <p className="product-category">ASIN: {p.asin}</p>
                      <div className="product-footer">
                        <span className="product-price">{p.price != null ? `₹${p.price}` : '—'}</span>
                        <button
                          className="add-cart-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isAuthenticated) {
                              window.location.href = '/login';
                              return;
                            }
                            const cartItem = {
                              id: p.asin || p._id || String(Math.random()),
                              name: p.title || 'Product',
                              brand: p.brand || '',
                              category: p.category || '',
                              price: typeof p.price === 'number' ? p.price : (p.price ? Number(p.price) : 0),
                              image: p.image_url || p.image || 'https://placehold.co/400x300?text=No+Image',
                            };
                            addToCart(cartItem, 1);
                          }}
                        >
                          <ShoppingCart size={18} />
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {(!loading && filteredProducts.length === 0) && (
            <div className="no-results">
              <p>No products found matching your criteria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrowseEventsPage;
