import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5003/api';

type Message = { from: 'user' | 'bot' | 'error'; text: string; retryAfter?: number; originalQuestion?: string };

const Chat = ({ fileId }: { fileId: string }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
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

  const sendWithQuestion = async (question: string) => {
    const q = question.trim();
    if (!q) return;
    const userMsg: Message = { from: 'user', text: q };
    setMessages((m) => [...m, userMsg]);
    setLastQuestion(q);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Explicitly request OpenRouter for chat to avoid using Gemini credits
        body: JSON.stringify({ fileId, question: q, provider: 'openrouter' })
      });
      if (!res.ok) {
        const status = res.status;
        const body = await res.json().catch(() => ({}));
        const err = body?.message || res.statusText;

        // Detect rate-limit even if server returns a non-429 status
        const headerRemaining = res.headers.get('x-ratelimit-remaining');
        const headerReset = res.headers.get('x-ratelimit-reset');
        const headerRetry = res.headers.get('retry-after') || res.headers.get('Retry-After');

        const errText = String(err || '').toLowerCase();
        const bodyType = body?.type || body?.error?.type || '';
        const isRateLimit = status === 429
          || /rate limit|quota|throttl/i.test(errText)
          || bodyType === 'rate_limit'
          || headerRemaining === '0';

        if (isRateLimit) {
          // Compute retry seconds if available (check body first, then headers)
          let retrySec: number | undefined;
          if (body?.retryAfter) {
            const parsed = parseInt(String(body.retryAfter), 10);
            if (!Number.isNaN(parsed)) retrySec = parsed;
          }
          if (retrySec === undefined && headerRetry) {
            const parsed = parseInt(headerRetry, 10);
            if (!Number.isNaN(parsed)) retrySec = parsed;
          }
          if (retrySec === undefined && headerReset) {
            const parsed = parseInt(headerReset, 10);
            if (!Number.isNaN(parsed)) {
              const nowSec = Math.floor(Date.now() / 1000);
              retrySec = parsed > 1000000000 ? Math.max(0, parsed - nowSec) : parsed;
            }
          }

          const serverMsg = body?.message ? `: ${body.message}` : '';
          const remainingVal = body?.remaining ?? headerRemaining ?? null;
          const remainingNote = remainingVal !== null ? ` Remaining: ${remainingVal}.` : '';
          setMessages((m) => [...m, {
            from: 'error',
            text: `Rate limit reached${serverMsg} Please wait and try again.${remainingNote}`,
            retryAfter: retrySec ?? undefined,
            originalQuestion: q
          }]);
        } else {
          setMessages((m) => [...m, { from: 'error', text: `Error ${status}: ${err}`, originalQuestion: q }]);
        }
        return;
      }
      const data = await res.json();
      setMessages((m) => [...m, { from: 'bot', text: data.answer || 'No answer' }]);
    } catch (err: any) {
      setMessages((m) => [...m, { from: 'error', text: `Network error: ${err?.message || err}`, originalQuestion: q }]);
    } finally {
      setLoading(false);
      setInput('');
    }
  };

  const send = () => {
    const question = input.trim();
    if (!question) return;
    sendWithQuestion(question);
  };

  const retryQuestion = (question?: string) => {
    const q = question || lastQuestion;
    if (!q) return;
    sendWithQuestion(q);
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
        {messages.map((m, i) => {
          const cls = m.from === 'user' ? 'chat-bubble user' : m.from === 'error' ? 'chat-bubble error' : 'chat-bubble bot';
          return (
            <div key={i} className={cls} role={m.from === 'error' ? 'status' : undefined}>
              {m.from === 'bot' ? (
                <div className="chat-bot-markdown">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{m.text}</ReactMarkdown>
                </div>
              ) : m.from === 'error' ? (
                <div className="chat-error-body">
                  <strong>
                      { (m.retryAfter !== undefined && m.retryAfter !== null) || /rate limit|quota|throttl/i.test(String(m.text).toLowerCase()) ? 'Rate limit reached' : m.text.startsWith('Error') ? 'Error' : 'Notice' }
                    </strong>
                  <div style={{ marginTop: 6 }}>{m.text}</div>
                  {m.retryAfter && (
                    <div style={{ marginTop: 8 }}>
                      <button className="action-btn secondary" onClick={() => retryQuestion(m.originalQuestion)}>
                        Retry now
                      </button>
                      {m.retryAfter && (
                        <span style={{ marginLeft: 10, color: 'var(--text-muted)', fontSize: 12 }}>
                          Retry after {m.retryAfter} seconds
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                m.text
              )}
            </div>
          );
        })}
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
