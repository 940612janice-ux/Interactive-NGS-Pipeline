import React from 'react';
import { useAppStore } from '../../context/AppContext';

export const TopBar: React.FC = () => {
  const { selectedPatient, setView } = useAppStore();

  return (
    <div id="app-topbar" className="flex items-center justify-between h-12 min-h-12 px-5" style={{ backgroundColor: '#1b2430', borderBottom: '1px solid #33414f' }}>
      <div className="flex items-center gap-3.5 text-[14px]">
        <strong>基因偵探事務所</strong>
        {selectedPatient && (
          <span
            id="patient-badge"
            className="text-[12px] px-3 py-1 rounded-full border"
            style={{ color: '#ffb84d', borderColor: 'rgba(255, 184, 77, 0.4)', backgroundColor: 'rgba(255, 184, 77, 0.08)' }}
          >
            檢體：{selectedPatient.name} ({selectedPatient.cancer})
          </span>
        )}
      </div>
      <button
        id="home-btn"
        onClick={() => setView('home')}
        className="px-3.5 py-1.5 rounded-lg text-[13px] border transition-colors"
        style={{ color: '#9fb0c3', borderColor: '#3b4b5f', backgroundColor: 'transparent' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#e8eef5';
          e.currentTarget.style.borderColor = '#4da3ff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#9fb0c3';
          e.currentTarget.style.borderColor = '#3b4b5f';
        }}
      >
        回首頁
      </button>
    </div>
  );
};