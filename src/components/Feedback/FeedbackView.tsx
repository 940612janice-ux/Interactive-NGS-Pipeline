import React, { useState } from 'react';
import { useAppStore } from '../../context/AppContext';
// 貼上api讓表單送入這裡
const SHEETDB_URL = 'https://sheetdb.io/api/v1/gmti7zs7c019a';
// 表單狀態
type Status = 'idle' | 'sending' | 'sent' | 'error';
// 記錄使用者填的字
export const FeedbackView: React.FC = () => {
  const { setView } = useAppStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      // 把要送出的資料包成 key 的格式
      const body = new URLSearchParams();       
      body.append('timestamp', 'DATETIME');
      body.append('name', name);
      body.append('email', email);
      body.append('message', message);
      // 用 fetch 把資料 POST 到 SheetDB 
      const res = await fetch(SHEETDB_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!res.ok) throw new Error('submit failed');
      setStatus('sent');
      setName('');
      setEmail('');
      setMessage('');
    } catch {
      setStatus('error');
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid rgba(77, 163, 255, 0.3)',
    background: 'rgba(13, 21, 37, 0.7)',
    color: '#c6d3e3',
    fontSize: '14px',
    outline: 'none',
  };

  return (
    <section
      className="relative h-screen w-full overflow-y-auto"
      style={{ background: 'linear-gradient(160deg, #10192a 0%, #0b1120 55%, #102028 100%)' }}
    >
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute top-[-10%] bottom-[-10%] w-[5px] rounded-[3px] opacity-16 animate-helix-sway"
          style={{ left: '8%', background: 'linear-gradient(180deg, #4da3ff, #ffb84d, #4da3ff)' }}
        />
        <div
          className="absolute top-[-10%] bottom-[-10%] w-[5px] rounded-[3px] opacity-16 animate-helix-sway"
          style={{ left: '92%', background: 'linear-gradient(180deg, #4da3ff, #ffb84d, #4da3ff)', animationDelay: '0.6s' }}
        />
      </div>

      <div className="relative z-10 max-w-xl mx-auto px-8 py-12">
        <button
          onClick={() => setView('home')}
          className="text-[14px] font-bold mb-8 transition-opacity hover:opacity-70"
          style={{ color: '#9fb0c3' }}
        >
          ← 返回首頁
        </button>

        <div className="inline-block text-[12px] font-bold tracking-wider mb-5 px-3.5 py-1.5 rounded-full" style={{ color: '#ffb84d', border: '1px solid rgba(255, 184, 77, 0.4)', backgroundColor: 'rgba(255, 184, 77, 0.08)' }}>
          回饋表單
        </div>
        <h1 className="text-[34px] font-extrabold tracking-wide mb-3">
          學習回饋
        </h1>
        <p className="text-[14px] leading-[1.8] mb-10" style={{ color: '#9fb0c3' }}>
          你的意見能讓「基因偵探事務所」變得更好，歡迎留下建議！
        </p>

        {status === 'sent' ? (
          <div
            className="p-8 rounded-2xl text-center animate-fade-up"
            style={{ background: 'rgba(77, 163, 255, 0.08)', border: '1px solid rgba(77, 163, 255, 0.35)' }}
          >
            <div className="text-[40px] mb-3">🎉</div>
            <h2 className="text-[20px] font-bold mb-2">感謝你的回饋！</h2>
            <p className="text-[13px] mb-6" style={{ color: '#9fb0c3' }}>你的意見已經送出</p>
            <button
              onClick={() => { setStatus('idle'); }}
              className="text-[14px] font-extrabold px-8 py-2.5 rounded-full"
              style={{ color: '#0f1520', background: 'linear-gradient(90deg, #ffb84d, #ffd08a)' }}
            >
              再填一筆
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 animate-fade-up">
            <div>
              <label className="block text-[13px] font-bold mb-2" style={{ color: '#c6d3e3' }}>姓名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="你的名字"
                style={inputStyle}
              />
            </div>

            <div>
              <label className="block text-[13px] font-bold mb-2" style={{ color: '#c6d3e3' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={inputStyle}
              />
            </div>

            <div>
              <label className="block text-[13px] font-bold mb-2" style={{ color: '#c6d3e3' }}>留言</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={5}
                placeholder="請寫下你的建議或想法…"
                style={inputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full text-[16px] font-extrabold tracking-widest py-3.5 rounded-full transition-all duration-150"
              style={{
                color: '#0f1520',
                background: 'linear-gradient(90deg, #ffb84d, #ffd08a)',
                boxShadow: '0 6px 24px rgba(255, 184, 77, 0.25)',
                opacity: status === 'sending' ? 0.5 : 1,
                cursor: status === 'sending' ? 'not-allowed' : 'pointer',
              }}
            >
              {status === 'sending' ? '傳送中…' : '送出回饋'}
            </button>

            {status === 'error' && (
              <p className="text-[13px] text-center" style={{ color: '#ff6b6b' }}>
                傳送失敗，請稍後再試
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
};