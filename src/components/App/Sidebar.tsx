import React from 'react';
import { WorkflowStage, WorkflowStep } from '../../types';
import { useAppStore } from '../../context/AppContext';
import { WORKFLOW, STAGE_COLORS } from '../../data/workflow';

interface ToolCardProps {
  stageIndex: number;
  stepIndex: number;
  step: WorkflowStep;
  isActive: boolean;
  onClick: () => void;
}

const ToolCard: React.FC<ToolCardProps> = ({ stageIndex, stepIndex, step, isActive, onClick }) => {
  const stageColor = STAGE_COLORS[stageIndex % STAGE_COLORS.length];
  const stepNumber = stepIndex + 1;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-2 rounded-lg bg-[#2c3a4b] border transition-all duration-150 cursor-pointer text-left ${
        isActive
          ? 'border-[#ffb84d] shadow-[0_0_0_2px_rgba(255,184,77,0.35)]'
          : 'border-[#3b4b5f] hover:border-[#4da3ff] hover:shadow-[0_2px_10px_rgba(77,163,255,0.25)] hover:translate-x-1'
      }`}
      style={{ borderLeftColor: isActive ? '#ffb84d' : stageColor }}
    >
      <div className="flex items-center justify-center w-8 h-8 min-w-8 rounded-lg overflow-hidden" style={{ backgroundColor: '#0f1520' }}>
        <img
          src={`/file_type/${step.icon}`}
          alt={step.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
        <span className="hidden text-[15px] font-bold">📄</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className="flex items-center justify-center w-5 h-5 min-w-5 rounded-full text-[11px] font-extrabold text-[#0f1520]"
            style={{ backgroundColor: stageColor }}
          >
            {stepNumber}
          </span>
          <span className="text-[12px] font-bold truncate">{step.name}</span>
        </div>
        <div className="text-[11px] truncate" style={{ color: '#9fb0c3' }}>
          {step.en}
        </div>
      </div>
    </button>
  );
};

interface StageSectionProps {
  stageIndex: number;
  stage: WorkflowStage;
  activeStepKey: string;
  onStepClick: (stageIndex: number, stepIndex: number) => void;
}

const StageSection: React.FC<StageSectionProps> = ({ stageIndex, stage, activeStepKey, onStepClick }) => {
  const stageColor = STAGE_COLORS[stageIndex % STAGE_COLORS.length];
  const stageNumber = stageIndex + 1;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 text-[13px] font-bold mb-2 px-2.5 py-2 rounded-lg" style={{ color: '#e8eef5', backgroundColor: 'rgba(255,255,255,0.06)' }}>
        <span
          className="flex items-center justify-center w-5 h-5 min-w-5 rounded-full text-[11px] font-extrabold text-[#0f1520]"
          style={{ backgroundColor: stageColor }}
        >
          {stageNumber}
        </span>
        <span>{stage.zh}</span>
        <span className="text-[11px] opacity-70 ml-auto">{stage.title}</span>
      </div>
      <div className="grid grid-cols-1 gap-2 pl-2 border-l-[2px]" style={{ borderColor: 'rgba(255,255,255,0.12)', marginLeft: '11px' }}>
        {stage.steps.map((step, stepIndex) => {
          const stepKey = `${stageIndex}-${stepIndex}`;
          const isActive = activeStepKey === stepKey;
          return (
            <ToolCard
              key={stepKey}
              stageIndex={stageIndex}
              stepIndex={stepIndex}
              step={step}
              isActive={isActive}
              onClick={() => onStepClick(stageIndex, stepIndex)}
            />
          );
        })}
      </div>
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const { currentStage, currentStep, setCurrentStage, setCurrentStep, showDetail, hideDetailView, showDetailView } = useAppStore();

  const activeStepKey = `${currentStage}-${currentStep}`;

  const handleStepClick = (stageIndex: number, stepIndex: number) => {
    setCurrentStage(stageIndex);
    setCurrentStep(stepIndex);
    const step = WORKFLOW[stageIndex]?.steps[stepIndex];
    if (step) {
      showDetailView(step);
    } else if (showDetail) {
      hideDetailView();
    }
  };

  return (
    <aside className="w-80 min-w-80 h-full overflow-y-auto p-4.5" style={{ background: 'linear-gradient(180deg, #1b2430 0%, #232f3e 100%)', borderRight: '1px solid #33414f' }}>
      <header className="mb-4">
        <h1 className="text-[20px] tracking-wide">NGS Pipeline</h1>
        <p className="text-[12px] mt-1" style={{ color: '#9fb0c3' }}>全流程工具縮圖</p>
      </header>
      <nav id="workflow-list">
        {WORKFLOW.map((stage, stageIndex) => (
          <StageSection
            key={stage.title}
            stageIndex={stageIndex}
            stage={stage}
            activeStepKey={activeStepKey}
            onStepClick={handleStepClick}
          />
        ))}
      </nav>
    </aside>
  );
};