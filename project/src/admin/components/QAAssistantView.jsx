import { useState } from 'react';
import { styles } from '../styles/adminStyles';

const QAAssistantView = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState(
    'Ask a question about your products, inventory, or market competitors.'
  );
  const [loading, setLoading] = useState(false);

  const handleAsk = () => {
    if (!query.trim()) return;
    setLoading(true);
    setResponse('Thinking...');

    // Simulate LLM response time
    setTimeout(() => {
      setResponse(`LLM Answer for: "${query}" (Simulated).
            
Based on current simulated data, the highest-selling product category is 'Smartphones', accounting for 70% of total revenue last quarter. We recommend increasing ad spend in this category by 15% and diversifying suppliers for the 'Fashion Bag' to mitigate stock issues.`);
      setLoading(false);
      setQuery('');
    }, 1800);
  };

  return (
    <div style={styles.contentArea}>
      <h1 style={styles.pageTitle}>Q&A Assistant (LLM)</h1>
      <p style={styles.pageSubtitle}>
        Get instant answers and market intelligence using the Gemini Model simulation.
      </p>

      <div
        style={{
          ...styles.alertBox,
          backgroundColor: '#e6f7ff',
          borderLeft: '4px solid #1890ff',
          color: '#0050b3',
          marginTop: '20px',
          marginBottom: '20px',
        }}
      >
        <span style={styles.alertIcon}>🧠</span>
        <p style={styles.alertText}>
          This feature simulates a live Q&A using the LLM for grounded answers and analysis.
        </p>
      </div>

      <div style={styles.searchInputContainer}>
        <input
          type="text"
          placeholder="Ask about competitors, sales trends, or product specs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={loading}
          style={{ ...styles.searchInput, paddingRight: '150px' }}
        />
        <button
          onClick={handleAsk}
          disabled={loading || !query.trim()}
          style={{
            ...styles.primaryButton,
            padding: '10px 15px',
            marginLeft: '10px',
            cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Asking...' : 'Ask Assistant'}
        </button>
      </div>

      <div
        style={{
          padding: '20px',
          border: '1px solid #ced4da',
          borderRadius: '5px',
          backgroundColor: '#f9f9f9',
          minHeight: '150px',
          whiteSpace: 'pre-wrap',
        }}
      >
        <p style={{ fontWeight: 'bold', marginBottom: '10px', color: '#007bff' }}>
          Assistant Response:
        </p>
        {response}
      </div>
    </div>
  );
};

export default QAAssistantView;
