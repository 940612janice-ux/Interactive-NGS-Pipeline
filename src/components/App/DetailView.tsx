import React from 'react';
import { WorkflowStep } from '../../types';
import { STAGE_COLORS } from '../../data/workflow';

interface DetailViewProps {
  step: WorkflowStep;
  stageIndex: number;
  onBack?: () => void;
}

export const DetailView: React.FC<DetailViewProps> = ({ step, stageIndex }) => {
  const stageColor = STAGE_COLORS[stageIndex % STAGE_COLORS.length];

  return (
    <section id="detail" className="animate-fade-up">
      <div id="detail-content" className="p-6 rounded-2xl border max-w-3xl animate-fade-up" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
        <span className="inline-block text-[12px] font-bold px-2.5 py-1 rounded-full mb-3 text-[#0f1520]" style={{ backgroundColor: stageColor }}>
          {step.name}
        </span>
        <h2 className="text-[24px] mb-1.5">{step.name}</h2>
        <p className="text-[13px] mb-4" style={{ color: '#9fb0c3' }}>{step.en}</p>
        <p className="text-[15px] leading-[1.9] mb-4">{step.desc}</p>

        <h3 className="text-[15px] mb-2" style={{ color: '#ffb84d' }}>關鍵步驟</h3>
        <ul className="pl-5 leading-[1.9] text-[14px] mb-4 space-y-1">
          {step.bullets.map((bullet, i) => (
            <li key={i}>{bullet}</li>
          ))}
        </ul>

        <h3 className="text-[15px] mb-2" style={{ color: '#ffb84d' }}>輸入 / 輸出</h3>
        <div className="flex flex-wrap gap-2.5 mb-4">
          <div className="flex-1 min-w-[220px] p-3 rounded-lg text-[13px]" style={{ backgroundColor: '#0f1520' }}>
            <div className="text-[11px] mb-1" style={{ color: '#9fb0c3' }}>輸入</div>
            <div>{step.input}</div>
          </div>
          <div className="flex-1 min-w-[220px] p-3 rounded-lg text-[13px]" style={{ backgroundColor: '#0f1520' }}>
            <div className="text-[11px] mb-1" style={{ color: '#9fb0c3' }}>輸出</div>
            <div>{step.output}</div>
          </div>
        </div>
      </div>
    </section>
  );
};