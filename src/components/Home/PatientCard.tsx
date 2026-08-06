import React from 'react';
import { Patient } from '../../types';

interface PatientCardProps {
  patient: Patient;
  isSelected: boolean;
  onSelect: () => void;
}

export const PatientCard: React.FC<PatientCardProps> = ({ patient, isSelected, onSelect }) => {
  const initial = patient.name.slice(-1);
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
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[15px] truncate">
          {patient.name}
          <span className="text-[13px] font-normal text-[#9fb0c3] ml-2">{patient.age}歲</span>
        </div>
        <span
          className="inline-block mt-1 text-[12px] px-3.0 py-0.5 rounded-full"
          style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#d6e2f0' }}
        >
          {patient.cancer}
        </span>
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