import { useState, useMemo } from 'react';
import { Search, Filter } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { products } from '../data/products';
import './BrowseEventsPage.css';

const BrowseEventsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', 'Headphones', 'Speakers', 'Earphones'];

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.brand.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

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
          <div className="products-grid">
            {filteredProducts.map((product) => (
              <div className="product-card-wrapper" key={product.id}>
                <ProductCard product={product} showQuantity={true} />
              </div>
            ))}
          </div>
          {filteredProducts.length === 0 && (
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
