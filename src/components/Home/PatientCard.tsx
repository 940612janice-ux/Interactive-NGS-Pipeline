import React from 'react';
import { Patient } from '../../types';

interface PatientCardProps {
  patient: Patient;
  isSelected: boolean;
  onSelect: () => void;
}

export const PatientCard: React.FC<PatientCardProps> = ({ patient, isSelected, onSelect }) => {
  const initial = 'P';
  const avatarColor = patient.color;

  return (
    <button
      onClick={onSelect}
      className={`flex items-center gap-4 p-3 rounded-xl bg-[#2c3a4b] border-2 transition-all duration-150 cursor-pointer ${
        isSelected
          ? 'border-[#ffb84d] shadow-[0_0_0_2px_rgba(255,184,77,0.35),_0_4px_16px_rgba(255,184,77,0.12)]'
          : 'border-transparent hover:border-white/25 hover:-translate-y-0.5'
      }`}
      style={{ backgroundColor: isSelected ? 'rgba(255, 184, 77, 0.05)' : undefined }}
    >
      <div
        className="flex items-center justify-center w-11 h-11 min-w-11 rounded-full font-extrabold text-[19px]"
        style={{ backgroundColor: avatarColor, color: '#0f1520' }}
      >
        {initial}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <ul className="space-y-0.5 text-[12px] leading-relaxed">
          <li style={{ color: '#c6d3e3' }}>患者代碼：{patient.code}</li>
          <li style={{ color: '#c6d3e3' }}>年齡/性別：{patient.age} 歲 / {patient.gender}</li>
          <li style={{ color: '#c6d3e3' }}>癌別：{patient.cancer}</li>
          <li style={{ color: '#c6d3e3' }}>Sample ID：{patient.sampleId}</li>
        </ul>
      </div>
      <span
        className="text-[18px] transition-all duration-150"
        style={{
          color: isSelected ? '#ffb84d' : '#9fb0c3',
          transform: isSelected ? 'translateX(4px)' : 'translateX(0)',
        }}
      >
        →
      </span>
    </button>
  );
};