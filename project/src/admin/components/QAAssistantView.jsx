import { useState, useEffect, useRef } from 'react';
import { styles } from '../styles/adminStyles';
import Modal from './Modal';

// Backend base URL (allow override via env if using Vite)
const API_BASE = import.meta?.env?.VITE_LLM_API_URL || 'http://localhost:5001';
// Main backend URL for scraper and product data
const BACKEND_URL = import.meta?.env?.VITE_BACKEND_URL || 'http://localhost:8000';

const QAAssistantView = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: 'Hi! I\'m your pricing & competitor intelligence assistant. Ask about products, trends, forecasts, or pricing strategies.'
  }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('llm_session_id') || null);
  const [useStreaming, setUseStreaming] = useState(false);
  const [forecastModalOpen, setForecastModalOpen] = useState(false);
  const [forecastContent, setForecastContent] = useState(null);
  const wsRef = useRef(null);
  const scrollRef = useRef(null);

  // Auto scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Establish WebSocket when streaming enabled
  useEffect(() => {
    if (!useStreaming) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }
    const wsUrl = API_BASE.replace('http', 'ws') + '/ws';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onopen = () => {
      console.log('WebSocket connected');
    };
    ws.onclose = () => {
      console.log('WebSocket closed');
    };
    ws.onerror = (e) => {
      console.error('WebSocket error', e);
      setError('Streaming connection error. Falling back to standard mode.');
      setUseStreaming(false);
    };
    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        console.log('WS received:', data); // Debug log
        if (data.session_id && !sessionId) {
          setSessionId(data.session_id);
          localStorage.setItem('llm_session_id', data.session_id);
        }
        if (data.text) {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'assistant' && last.streaming) {
              // Append to existing streaming message
              const updated = [...prev];
              updated[updated.length - 1] = { ...last, content: last.content + data.text };
              return updated;
            }
            // Start new streaming message
            return [...prev, { role: 'assistant', content: data.text, streaming: true }];
          });
        }
        if (data.done) {
          // Mark last assistant message as completed
          setMessages((prev) => prev.map((m, i, arr) => i === arr.length - 1 ? { ...m, streaming: false } : m));
          setLoading(false);
        }
        if (data.error) {
          setError(data.error);
          setLoading(false);
        }
        if (data.response) {
          // Handle non-streaming complete response (fallback)
          setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
          setLoading(false);
        }
      } catch (err) {
        console.error('Bad WS message', err);
      }
    };
    return () => {
      ws.close();
    };
  }, [useStreaming, API_BASE, sessionId]);

  // Scraper integration using CompareView API flow
  const triggerScraperAndShowResults = async () => {
    setLoading(true);
    setMessages(prev => [...prev, { role: 'assistant', content: 'Scraper started! Please wait while I fetch the latest prices…' }]);
    try {
      // 1. Start scraper
      const res = await fetch(`${BACKEND_URL}/api/scrape`, { method: 'POST' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to start scraper');
      }
      const { job_id } = await res.json();
      // 2. Poll for status
      let status = 'pending';
      let pollCount = 0;
      while (status !== 'completed' && pollCount < 20) {
        await new Promise(r => setTimeout(r, 2500));
        pollCount++;
        const sres = await fetch(`${BACKEND_URL}/api/scrape/status/${job_id}`);
        if (!sres.ok) continue;
        const sjson = await sres.json();
        status = sjson.status;
        if (status === 'failed') throw new Error('Scrape job failed');
      }
      // 3. Fetch latest prices
      const pricesRes = await fetch(`${BACKEND_URL}/api/compare`);
      if (!pricesRes.ok) throw new Error('Failed to fetch prices');
      const products = await pricesRes.json();
      // 4. Show summary in chat
      const summary = products.slice(0, 5).map(p => `• ${p.title} — ₹${p.price} (ASIN: ${p.asin})`).join('\n');
      setMessages(prev => [...prev, { role: 'assistant', content: `Scraping complete! Latest prices:\n${summary}` }]);
    } catch (e) {
      setError(e.message);
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  // Modified sendMessageREST to intercept scraper prompt
  const sendMessageREST = async (text) => {
    if (text.toLowerCase().includes('scraper') || text.toLowerCase().includes('scrape')) {
      await triggerScraperAndShowResults();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, session_id: sessionId })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Request failed: ${res.status}`);
      }
      const data = await res.json();
      if (data.session_id && !sessionId) {
        setSessionId(data.session_id);
        localStorage.setItem('llm_session_id', data.session_id);
      }
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (e) {
      setError(e.message);
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessageWS = (text) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('Streaming channel not ready.');
      setUseStreaming(false);
      sendMessageREST(text);
      return;
    }
    setLoading(true);
    setError(null);
    // Add user message immediately
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    wsRef.current.send(JSON.stringify({ message: text, session_id: sessionId }));
    // Add placeholder streaming assistant message
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    if (useStreaming) {
      sendMessageWS(text);
    } else {
      sendMessageREST(text);
    }
  };

  // Action prompt helpers
  const handlePriceTrendAction = async () => {
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: 'Show me price trend for the top selling product' }]);
    try {
      // First get top rated products
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'What is the top selling product? Just give me the ASIN and brand name.', session_id: sessionId })
      });
      if (!res.ok) throw new Error('Failed to get top product');
      const data = await res.json();
      
      // Extract ASIN from response (look for pattern like B0C3HCD34R)
      const asinMatch = data.response.match(/B0[A-Z0-9]{8,10}/);
      if (!asinMatch) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Could not identify top product ASIN. ' + data.response }]);
        return;
      }
      const asin = asinMatch[0];
      
      // Now get price trend for this ASIN
      const trendRes = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Get detailed price trend analysis for ASIN ${asin} for the last 30 days.`, session_id: sessionId })
      });
      if (!trendRes.ok) throw new Error('Failed to get price trend');
      const trendData = await trendRes.json();
      
      setMessages(prev => [...prev, { role: 'assistant', content: trendData.response }]);
      if (trendData.session_id && !sessionId) {
        setSessionId(trendData.session_id);
        localStorage.setItem('llm_session_id', trendData.session_id);
      }
    } catch (e) {
      setError(e.message);
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleForecastAction = async () => {
    setForecastModalOpen(true);
    setForecastContent('Loading forecast data...');
    setLoading(true);
    try {
      // Get forecast for a representative product
      // Using soundcore by Anker Q20i as it's the top-selling product
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: 'Get 30-day price forecast for soundcore Q20i headphones. Show predicted prices, confidence levels, and trend direction.', 
          session_id: sessionId 
        })
      });
      if (!res.ok) throw new Error('Failed to get forecast');
      const data = await res.json();
      
      setForecastContent(data.response);
      if (data.session_id && !sessionId) {
        setSessionId(data.session_id);
        localStorage.setItem('llm_session_id', data.session_id);
      }
    } catch (e) {
      setError(e.message);
      setForecastContent(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const actionPrompt = (type) => {
    switch (type) {
      case 'scrape':
        return 'Trigger scraper to fetch latest competitor prices.';
      case 'trend':
        return null; // Handle with direct action
      case 'forecast':
        return 'Get 30-day price forecast for a representative product (brand + model).';
      case 'pricing':
        return 'Provide pricing recommendation for the highest-rated product.';
      default:
        return '';
    }
  };

  const handleAction = (type) => {
    if (type === 'trend') {
      handlePriceTrendAction();
      return;
    }
    
    if (type === 'forecast') {
      handleForecastAction();
      return;
    }
    
    const prompt = actionPrompt(type);
    if (prompt) {
      setInput(prompt);
      // Immediately send
      setTimeout(() => handleSend(), 50);
    }
  };

  const clearConversation = () => {
    setMessages([{ role: 'assistant', content: 'Conversation cleared. Ask me something new.' }]);
    setSessionId(null);
    localStorage.removeItem('llm_session_id');
  };

  return (
    <div style={styles.contentArea}>
      <h1 style={styles.pageTitle}>Q&A Assistant (LLM)</h1>
      <p style={styles.pageSubtitle}>Live answers powered by Groq + your product & pricing data.</p>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: 16 }}>
        <button style={styles.primaryButton} disabled={loading} onClick={() => handleAction('scrape')}>🔄 Scrape Prices</button>
        <button style={styles.primaryButton} disabled={loading} onClick={() => handleAction('trend')}>📊 Price Trend</button>
        <button style={styles.primaryButton} disabled={loading} onClick={() => handleAction('forecast')}>🔮 Forecast</button>
        <button style={styles.primaryButton} disabled={loading} onClick={() => handleAction('pricing')}>💡 Pricing Advice</button>
        <button style={{
          ...styles.primaryButton,
          background: '#eef1f6',
          color: '#334155',
          boxShadow: 'none'
        }} disabled={loading} onClick={clearConversation}>🧹 Clear</button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 8px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e5e7eb' }}>
          <input type="checkbox" checked={useStreaming} onChange={(e) => setUseStreaming(e.target.checked)} /> Streaming
        </label>
      </div>

      {error && (
        <div style={{ ...styles.alertBox, background: '#fff5f5', borderLeft: '4px solid #d9363e', color: '#a8071a' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div style={{ ...styles.searchInputContainer, marginBottom: 14 }}>
        <input
          type="text"
          placeholder="Ask about competitors, price trends, forecasts, or products..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleSend(); }}
          disabled={loading}
          style={{ ...styles.searchInput, flex: 1 }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{ ...styles.primaryButton, paddingLeft: 24, paddingRight: 24 }}
        >
          {loading ? 'Thinking…' : 'Send'}
        </button>
      </div>

      <div ref={scrollRef} style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, background: 'linear-gradient(180deg,#ffffff,#f8fafc)', height: 360, overflowY: 'auto', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)' }}>
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <div key={idx} style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: isUser ? '#0f766e' : '#6246ea', marginBottom: 4, opacity: 0.85 }}>
                {isUser ? 'You' : 'Assistant'}{m.streaming && ' (streaming…)'}
              </div>
              <div style={{
                whiteSpace: 'pre-wrap',
                lineHeight: 1.5,
                fontSize: 13,
                maxWidth: '82%',
                padding: '10px 14px',
                borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background: isUser ? 'linear-gradient(135deg,#0d9488,#0f766e)' : '#f1f5f9',
                color: isUser ? '#ffffff' : '#1e293b',
                boxShadow: isUser ? '0 4px 12px rgba(13,148,136,0.35)' : '0 2px 6px rgba(0,0,0,0.05)'
              }}>{m.content}</div>
            </div>
          );
        })}
        {loading && !useStreaming && (
          <div style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: 12 }}>Assistant is thinking…</div>
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: '#666' }}>
        Session: {sessionId || 'new (will be created on first request)'} • Backend: {API_BASE}
      </div>

      <Modal
        title="Price Forecast"
        open={forecastModalOpen}
        onClose={() => { setForecastModalOpen(false); setForecastContent(null); }}
        width={780}
      >
        {forecastContent ? (
          <div style={{ whiteSpace: 'pre-wrap' }}>{forecastContent}</div>
        ) : (
          <div style={{ fontSize: 14 }}>
            Requesting forecast… The assistant will populate this after processing.
          </div>
        )}
      </Modal>
    </div>
  );
};

export default QAAssistantView;
