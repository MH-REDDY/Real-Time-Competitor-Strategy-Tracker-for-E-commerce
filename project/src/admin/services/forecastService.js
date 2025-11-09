// Real Forecast Service using backend ML API
// This connects to the unified FastAPI backend on port 8001

// API Configuration
const API_URL = 'http://localhost:5000'; // XGBoost ML server
const AUTH_URL = 'http://localhost:8001'; // Backend auth server

// Default brands and models (will be replaced by API data)
export let brands = [];
export let modelsByBrand = {};
export let productDetails = {}; // Store full product details including images

// Initialize brands and models from API
let initialized = false;

export const initializeBrandsFromAPI = async () => {
  if (initialized) return;
  
  try {
    const response = await fetch(`${API_URL}/api/brands`);
    if (!response.ok) throw new Error('Failed to fetch brands');
    
    const data = await response.json();
    brands.length = 0;
    brands.push(...data.brands);
    Object.assign(modelsByBrand, data.modelsByBrand);
    
    // Fetch product details from forecast API
    try {
      const productsResponse = await fetch(`${API_URL}/api/products`);
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        // Store product details by title for quick lookup
        productsData.forEach(product => {
          const key = product.title;
          productDetails[key] = {
            asin: product.asin,
            image_url: product.image_url,
            title: product.title,
            price: product.price,
            original_price: product.original_price,
            discount_percent: product.discount_percent,
            rating: product.rating,
            availability: product.availability
          };
        });
      }
    } catch (err) {
      console.warn('Could not fetch product details:', err);
    }
    
    initialized = true;
    return { brands, modelsByBrand, productDetails };
  } catch (error) {
    console.error('Error fetching brands from API:', error);
    // Keep empty arrays - will show error in UI
    return { brands: [], modelsByBrand: {}, productDetails: {} };
  }
};

/**
 * Generate historical price data (simulating past data)
 */
const generateHistoricalData = (brand, model, days = 60) => {
  const data = [];
  const basePrice = 25000 + Math.random() * 50000; // Base price between 25k-75k
  const baseDiscount = 5 + Math.random() * 15; // Base discount 5-20%
  
  const today = new Date();
  
  for (let i = days; i > 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Add seasonal variations
    const seasonalFactor = Math.sin(i / 10) * 0.15;
    const randomNoise = (Math.random() - 0.5) * 0.1;
    
    // Price with variations
    const price = basePrice * (1 + seasonalFactor + randomNoise);
    
    // Discount with variations
    const discount = Math.max(0, baseDiscount * (1 + seasonalFactor * 1.5 + randomNoise));
    
    data.push({
      date: date.toISOString().split('T')[0],
      price: Math.round(price),
      discount: Math.round(discount * 10) / 10
    });
  }
  
  return data;
};

/**
 * Generate forecast data for next 30 days
 * In production, this would call the Python XGBoost model
 */
const generateForecastData = (brand, model, historicalData) => {
  const forecast = [];
  const lastHistorical = historicalData[historicalData.length - 1];
  
  const today = new Date();
  
  for (let i = 1; i <= 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    
    // Simulate trend and seasonality
    const trendFactor = 1 + (i * 0.002); // Slight upward trend
    const seasonalFactor = Math.sin(i / 7) * 0.05; // Weekly pattern
    const randomNoise = (Math.random() - 0.5) * 0.03;
    
    // Price forecast
    const price = lastHistorical.price * (trendFactor + seasonalFactor + randomNoise);
    
    // Discount forecast (more volatile)
    const discountTrend = Math.sin(i / 5) * 0.2;
    const discount = Math.max(0, lastHistorical.discount * (1 + discountTrend + randomNoise * 2));
    
    forecast.push({
      date: date.toISOString().split('T')[0],
      price: Math.round(price),
      discount: Math.round(discount * 10) / 10,
      isForecast: true
    });
  }
  
  return forecast;
};

/**
 * Main API to get forecast data from backend ML API
 * @param {string} brand - Selected brand
 * @param {string} model - Selected model
 * @returns {Promise} - Real historical data + ML forecast
 */
export const getForecastData = async (brand, model) => {
  try {
    // Call the FastAPI backend
    const response = await fetch(`${API_URL}/api/forecast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ brand, model })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Forecast API failed');
    }
    
    const data = await response.json();
    
    // Format the response to match frontend expectations
    return {
      brand: data.brand,
      model: data.model,
      historical: data.historical,
      forecast: data.forecast,
      combined: [...data.historical, ...data.forecast],
      metadata: {
        historicalDays: data.historical.length,
        forecastDays: data.forecast.length,
        lastHistoricalDate: data.historical[data.historical.length - 1]?.date,
        lastForecastDate: data.forecast[data.forecast.length - 1]?.date,
        source: 'Backend ML API'
      }
    };
  } catch (error) {
    console.error('Error calling forecast API:', error);
    
    // Check if server is running
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to backend server. Make sure the API server is running at http://localhost:8001');
    }
    
    throw error;
  }
};

/**
 * Fetch available brands from API
 * (Optional - can be used to dynamically load brands if backend changes)
 */
export const fetchBrandsFromAPI = async () => {
  try {
    const response = await fetch(`${API_URL}/api/brands`);
    if (!response.ok) throw new Error('Failed to fetch brands');
    
    const data = await response.json();
    return {
      brands: data.brands,
      modelsByBrand: data.modelsByBrand
    };
  } catch (error) {
    console.error('Error fetching brands:', error);
    // Return static brands as fallback
    return { brands, modelsByBrand };
  }
};
