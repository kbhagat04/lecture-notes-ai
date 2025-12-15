import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5003/api';

type Message = { from: 'user' | 'bot'; text: string };

const Chat = ({ fileId }: { fileId: string }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // reset chat when fileId changes
    setMessages([]);
    setInput('');
  }, [fileId]);

  useEffect(() => {
    // scroll to bottom on new message
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    const question = input.trim();
    if (!question) return;
    const userMsg: Message = { from: 'user', text: question };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Explicitly request OpenRouter for chat to avoid using Gemini credits
        body: JSON.stringify({ fileId, question, provider: 'openrouter' })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const err = body?.message || res.statusText;
        setMessages((m) => [...m, { from: 'bot', text: `Error: ${err}` }]);
        return;
      }
      const data = await res.json();
      setMessages((m) => [...m, { from: 'bot', text: data.answer || 'No answer' }]);
    } catch (err: any) {
      setMessages((m) => [...m, { from: 'bot', text: `Error: ${err?.message || err}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">Ask about this document</div>
      <div className="chat-messages" ref={containerRef}>
        {messages.length === 0 && <div className="chat-empty">Ask a question about the uploaded slides.</div>}
        {messages.map((m, i) => (
          <div key={i} className={m.from === 'user' ? 'chat-bubble user' : 'chat-bubble bot'}>
            {m.from === 'bot' ? (
              <div className="chat-bot-markdown">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{m.text}</ReactMarkdown>
              </div>
            ) : (
              m.text
            )}
          </div>
        ))}
        {loading && (
          <div className="chat-bubble bot" aria-live="polite">
            <div className="chat-typing" title="Bot is typing">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}
      </div>
      <div className="chat-input-row">
        <input
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a question (press Enter to send)"
          disabled={loading}
        />
        <button
          className="chat-send-btn"
          onClick={send}
          disabled={loading || !input.trim()}
          aria-label="Send message"
          title="Send"
        >
          <svg className="chat-send-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
          </svg>
          <span className="chat-send-label">{loading ? 'Sending...' : 'Send'}</span>
        </button>
      </div>
    </div>
  );
};

export default Chat;
