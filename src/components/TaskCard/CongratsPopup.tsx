import React from 'react';
import { useAppStore } from '../../context/AppContext';

export const CongratsPopup: React.FC = () => {
  const { showCongrats, closeCongrats } = useAppStore();

  if (!showCongrats) return null;

  return (
    <div id="congrats-popup" className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="congrats-overlay absolute inset-0 animate-overlay-in" style={{ backgroundColor: 'rgba(8, 12, 18, 0.85)', backdropFilter: 'blur(6px)' }} />
      <div className="congrats-card relative z-10 w-[520px] max-w-[calc(100vw-40px)] p-10 pb-8.5 text-center animate-congrats-pop" style={{
        background: 'linear-gradient(160deg, #1e2d3d 0%, #162030 100%)',
        border: '1px solid rgba(77, 163, 255, 0.3)',
        borderRadius: '20px',
        boxShadow: '0 24px 80px rgba(0, 0, 0, 0.6), 0 0 40px rgba(77, 163, 255, 0.12)',
      }}>
        <div className="congrats-icon text-7xl mb-4.5 animate-dna-pulse">🧬</div>
        <h2 className="congrats-title text-[20px] font-extrabold leading-[1.6] mb-3 bg-gradient-to-r bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, #4da3ff, #ffb84d)' }}>
          恭喜你已經得到完整的完整地體基因序列了 !
        </h2>
        <p className="congrats-subtitle text-[14px] leading-[1.8] mb-7" style={{ color: '#c6d3e3' }}>
          來觀察後續的潛在基因有什麼變化吧 !
        </p>
        <button
          id="congrats-close"
          onClick={closeCongrats}
          className="text-[15px] font-bold tracking-wider px-9 py-3 rounded-full transition-all cursor-pointer"
          style={{
            color: '#0f1520',
            background: 'linear-gradient(90deg, #4da3ff, #6fb5ff)',
            boxShadow: '0 4px 16px rgba(77, 163, 255, 0.35)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(77, 163, 255, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(77, 163, 255, 0.35)';
          }}
        >
          繼續探索
        </button>
      </div>
    </div>
  );
};