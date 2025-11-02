import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, Calendar, DollarSign, Tag } from 'lucide-react';
import { styles } from '../styles/adminStyles';
import { brands, modelsByBrand, getForecastData } from '../services/forecastService';

const PriceForecastView = () => {
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [viewMode, setViewMode] = useState('prices'); // 'prices' or 'discounts'
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Update available models when brand changes
  useEffect(() => {
    if (selectedBrand) {
      setAvailableModels(modelsByBrand[selectedBrand] || []);
      setSelectedModel('');
      setForecastData(null);
    }
  }, [selectedBrand]);

  // Fetch forecast when model is selected
  const handleForecast = async () => {
    if (!selectedBrand || !selectedModel) {
      alert('Please select both brand and model');
      return;
    }

    setLoading(true);
    try {
      const data = await getForecastData(selectedBrand, selectedModel);
      setForecastData(data);
    } catch (error) {
      console.error('Forecast error:', error);
      alert('Failed to generate forecast. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const getChartData = () => {
    if (!forecastData) return [];
    
    return forecastData.combined.map(item => ({
      date: item.date,
      value: viewMode === 'prices' ? item.price : item.discount,
      isForecast: item.isForecast || false
    }));
  };

  const chartData = getChartData();
  const todayIndex = forecastData ? forecastData.historical.length - 1 : 0;
  const todayDate = forecastData?.historical[forecastData.historical.length - 1]?.date || '';
  // Merge into single dataset with split keys so the forecast line starts exactly
  // from the last historical point without any visual gap.
  const mergedChartData = chartData.map((d, i) => ({
    date: d.date,
    historical: i <= todayIndex ? d.value : null,
    // include last historical point as the first forecast anchor
    forecast: i >= todayIndex ? d.value : null,
  }));

  return (
    <div style={styles.contentArea}>
      <h1 style={styles.pageTitle}>📈 Price & Discount Forecast</h1>
      <p style={styles.pageSubtitle}>
        AI-powered 30-day price and discount predictions using XGBoost ML model
      </p>

      {/* Selection Controls */}
      <div style={{
        display: 'flex',
        gap: '16px',
        alignItems: 'flex-end',
        marginTop: '24px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        {/* Brand Dropdown */}
        <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '8px',
            color: '#2c3e50'
          }}>
            Select Brand
          </label>
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #ced4da',
              fontSize: '14px',
              cursor: 'pointer',
              backgroundColor: 'white'
            }}
          >
            <option value="">Choose a brand...</option>
            {brands.map(brand => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>
        </div>

        {/* Model Dropdown */}
        <div style={{ flex: '1 1 250px', minWidth: '250px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '8px',
            color: '#2c3e50'
          }}>
            Select Model
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={!selectedBrand || availableModels.length === 0}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #ced4da',
              fontSize: '14px',
              cursor: selectedBrand ? 'pointer' : 'not-allowed',
              backgroundColor: selectedBrand ? 'white' : '#f5f5f5',
              opacity: selectedBrand ? 1 : 0.6
            }}
          >
            <option value="">Choose a model...</option>
            {availableModels.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </div>

        {/* Forecast Button */}
        <button
          onClick={handleForecast}
          disabled={!selectedBrand || !selectedModel || loading}
          style={{
            ...styles.primaryButton,
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: (!selectedBrand || !selectedModel || loading) ? 'not-allowed' : 'pointer',
            opacity: (!selectedBrand || !selectedModel || loading) ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <TrendingUp size={18} />
          {loading ? 'Generating...' : 'Generate Forecast'}
        </button>
      </div>

      {/* Graph View Toggle */}
      {forecastData && (
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          background: 'rgba(0,0,0,0.03)',
          padding: '6px',
          borderRadius: '8px',
          width: 'fit-content'
        }}>
          <button
            onClick={() => setViewMode('prices')}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              background: viewMode === 'prices' 
                ? 'linear-gradient(135deg, #e94560 0%, #ff6b6b 100%)'
                : 'transparent',
              color: viewMode === 'prices' ? 'white' : '#6c757d',
              boxShadow: viewMode === 'prices' ? '0 4px 12px rgba(233, 69, 96, 0.3)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <DollarSign size={16} />
            Prices
          </button>
          <button
            onClick={() => setViewMode('discounts')}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              background: viewMode === 'discounts' 
                ? 'linear-gradient(135deg, #e94560 0%, #ff6b6b 100%)'
                : 'transparent',
              color: viewMode === 'discounts' ? 'white' : '#6c757d',
              boxShadow: viewMode === 'discounts' ? '0 4px 12px rgba(233, 69, 96, 0.3)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Tag size={16} />
            Discounts
          </button>
        </div>
      )}

      {/* Chart Display */}
      {forecastData ? (
        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid #e9ecef',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          {/* Chart Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '2px solid #f1f3f5'
          }}>
            <div>
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '700',
                color: '#2c3e50'
              }}>
                {viewMode === 'prices' ? '💰 Price Forecast' : '🏷️ Discount Forecast'}
              </h3>
              <p style={{
                margin: '4px 0 0',
                fontSize: '13px',
                color: '#6c757d'
              }}>
                {selectedBrand} {selectedModel}
              </p>
            </div>
            <div style={{
              display: 'flex',
              gap: '16px',
              fontSize: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#3b82f6'
                }} />
                <span>Historical</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#10b981'
                }} />
                <span>Forecast</span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <ResponsiveContainer width="100%" height={450}>
            <LineChart data={mergedChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(date) => {
                  const d = new Date(date);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                label={{
                  value: viewMode === 'prices' ? 'Price (₹)' : 'Discount (%)',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 12, fill: '#6c757d' }
                }}
              />
              <Tooltip
                contentStyle={{
                  background: 'white',
                  border: '1px solid #e9ecef',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
                formatter={(value) => [
                  viewMode === 'prices' ? `₹${value.toLocaleString()}` : `${value.toFixed(1)}%`,
                  viewMode === 'prices' ? 'Price' : 'Discount'
                ]}
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
              />
              <Legend />
              
              {/* Reference line for today */}
              {todayDate && (
                <ReferenceLine
                  x={todayDate}
                  stroke="#e94560"
                  strokeDasharray="3 3"
                  label={{
                    value: 'Today',
                    position: 'top',
                    fill: '#e94560',
                    fontSize: 11
                  }}
                />
              )}

              {/* Historical line */}
              <Line
                type="monotone"
                dataKey="historical"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Historical"
                connectNulls={false}
              />

              {/* Forecast line */}
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Forecast (30 days)"
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Summary Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '2px solid #f1f3f5'
          }}>
            <StatCard
              icon={<Calendar size={20} />}
              label="Forecast Period"
              value="30 Days"
              color="#3b82f6"
            />
            <StatCard
              icon={viewMode === 'prices' ? <DollarSign size={20} /> : <Tag size={20} />}
              label={`Avg ${viewMode === 'prices' ? 'Price' : 'Discount'}`}
              value={
                viewMode === 'prices'
                  ? `₹${Math.round(
                      forecastData.forecast.reduce((sum, d) => sum + d.price, 0) / 
                      forecastData.forecast.length
                    ).toLocaleString()}`
                  : `${(
                      forecastData.forecast.reduce((sum, d) => sum + d.discount, 0) / 
                      forecastData.forecast.length
                    ).toFixed(1)}%`
              }
              color="#10b981"
            />
            <StatCard
              icon={<TrendingUp size={20} />}
              label="Model Accuracy"
              value="70%"
              color="#f59e0b"
            />
          </div>
        </div>
      ) : (
        <div style={{
          background: 'white',
          padding: '60px 24px',
          borderRadius: '12px',
          border: '2px dashed #e9ecef',
          textAlign: 'center'
        }}>
          <TrendingUp size={48} color="#ced4da" style={{ marginBottom: '16px' }} />
          <p style={{
            fontSize: '16px',
            color: '#6c757d',
            margin: 0
          }}>
            Select a brand and model to generate AI-powered price forecast
          </p>
        </div>
      )}
    </div>
  );
};

// Stat Card Component
const StatCard = ({ icon, label, value, color }) => (
  <div style={{
    background: '#f8f9fa',
    padding: '16px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  }}>
    <div style={{
      width: '40px',
      height: '40px',
      borderRadius: '8px',
      background: `${color}15`,
      color: color,
      display: 'grid',
      placeItems: 'center'
    }}>
      {icon}
    </div>
    <div>
      <div style={{
        fontSize: '12px',
        color: '#6c757d',
        marginBottom: '4px'
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '18px',
        fontWeight: '700',
        color: '#2c3e50'
      }}>
        {value}
      </div>
    </div>
  </div>
);

export default PriceForecastView;
