import React, { useState, useRef, useEffect } from 'react';
import './ChatApp.css';

/**
 * REACT CHAT APP - USE.AI SCRAPER FRONTEND
 */

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  loading?: boolean;
  error?: string;
  duration?: number;
}

interface ApiResponse {
  success: boolean;
  data?: {
    response: string;
    duration: number;
    model: string;
  };
  error?: string;
  timestamp: string;
}

const ChatApp: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Welcome to the use.ai Scraper! Type a prompt and I\'ll fetch the response from use.ai for you.',
      timestamp: new Date(),
    },
  ]);

  const [input, setInput] = useState('');
  const [model, setModel] = useState('Fable 5');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const models = ['Auto', 'Fable 5', 'Sonnet 5', 'Claude 3.5'];
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /**
   * Handle login
   */
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      alert('Please enter a valid email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address');
      return;
    }

    setIsLoggedIn(true);
    setMessages([
      ...messages,
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ Logged in as ${email}. You can now send prompts!`,
        timestamp: new Date(),
      },
    ]);
  };

  /**
   * Handle logout
   */
  const handleLogout = () => {
    setIsLoggedIn(false);
    setEmail('');
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: 'Logged out. Please log in again to continue.',
        timestamp: new Date(),
      },
    ]);
  };

  /**
   * Send message to scraper API
   */
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) {
      return;
    }

    if (!isLoggedIn) {
      alert('Please log in first');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Add loading message
    const loadingMessageId = (Date.now() + 1).toString();
    setMessages(prev => [
      ...prev,
      {
        id: loadingMessageId,
        role: 'assistant',
        content: 'Processing...',
        timestamp: new Date(),
        loading: true,
      },
    ]);

    try {
      const response = await fetch(`${API_BASE_URL}/api/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: input,
          model,
          email,
        }),
      });

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch response');
      }

      // Remove loading message and add actual response
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== loadingMessageId);
        return [
          ...filtered,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: data.data!.response,
            timestamp: new Date(),
            duration: data.data!.duration,
          },
        ];
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      // Replace loading message with error
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== loadingMessageId);
        return [
          ...filtered,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `❌ Error: ${errorMsg}`,
            timestamp: new Date(),
            error: errorMsg,
          },
        ];
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Format timestamp
   */
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="chat-container login-screen">
        <div className="login-box">
          <h1>🤖 use.ai Scraper</h1>
          <p>Connect your email to get responses from use.ai</p>

          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email Address:</label>
              <input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary">
              Sign In
            </button>
          </form>

          <p className="security-note">
            ℹ️ Your email will be used to authenticate with use.ai and is never stored.
          </p>
        </div>
      </div>
    );
  }

  // Chat Screen
  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <div className="header-content">
          <h1>use.ai Scraper Chat</h1>
          <p>Logged in as <strong>{email}</strong></p>
        </div>
        <button onClick={handleLogout} className="btn btn-secondary">
          Logout
        </button>
      </div>

      {/* Messages */}
      <div className="messages-container">
        {messages.map(message => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="message-avatar">
              {message.role === 'user' ? '👤' : '🤖'}
            </div>
            <div className="message-content">
              <p className={message.loading ? 'typing' : message.error ? 'error' : ''}>
                {message.content}
              </p>
              <div className="message-meta">
                <span className="timestamp">{formatTime(message.timestamp)}</span>
                {message.duration && (
                  <span className="duration">⏱️ {message.duration}ms</span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="input-area">
        <div className="model-selector">
          <label htmlFor="model">Model:</label>
          <select
            id="model"
            value={model}
            onChange={e => setModel(e.target.value)}
            disabled={loading}
          >
            {models.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={handleSendMessage} className="message-form">
          <div className="input-wrapper">
            <textarea
              placeholder="Type your prompt here... (e.g., 'what is AI?')"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              disabled={loading}
              rows={3}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="btn btn-send"
              title={loading ? 'Processing...' : 'Send (Enter)'}
            >
              {loading ? '⏳' : '➤'}
            </button>
          </div>
        </form>
      </div>

      {loading && <div className="loading-indicator">Fetching response from use.ai...</div>}
    </div>
  );
};

export default ChatApp;
