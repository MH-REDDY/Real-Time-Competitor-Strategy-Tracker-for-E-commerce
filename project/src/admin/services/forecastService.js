// Real Forecast Service using XGBoost ML Model
// This connects to the FastAPI backend that runs the trained XGBoost model

// Real brands and models from expanded_prices_10k.xlsx dataset
export const brands = [
  'Bose',
  'JBL',
  'OnePlus',
  'Sennheiser',
  'Sony',
  'boAt'
];

export const modelsByBrand = {
  'Bose': ['QuietComfort Ultra'],
  'JBL': ['Flip 6', 'Go 3'],
  'OnePlus': ['Buds Z2'],
  'Sennheiser': ['CX 80S', 'HD 450SE'],
  'Sony': ['HT-S20R', 'WF-1000XM5', 'WH-CH520'],
  'boAt': ['Aavante Bar 1160', 'Airdopes 141', 'Rockerz 450']
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
 * Main API to get forecast data from XGBoost ML model
 * @param {string} brand - Selected brand
 * @param {string} model - Selected model
 * @returns {Promise} - Real historical data + ML forecast from XGBoost
 */
export const getForecastData = async (brand, model) => {
  try {
    // Call the FastAPI backend
    const response = await fetch('http://localhost:5000/api/forecast', {
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
        source: 'XGBoost ML Model'
      }
    };
  } catch (error) {
    console.error('Error calling forecast API:', error);
    
    // Check if server is running
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to forecast server. Make sure the API server is running at http://localhost:5000');
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
    const response = await fetch('http://localhost:5000/api/brands');
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
