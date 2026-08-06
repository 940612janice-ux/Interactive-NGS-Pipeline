import React from 'react';
import { WorkflowStage, WorkflowStep } from '../../types';
import { WORKFLOW, STAGE_COLORS } from '../../data/workflow';
import { useAppStore } from '../../context/AppContext';

interface FlowNodeProps {
  step: WorkflowStep;
  stageIndex: number;
  stepIndex: number;
  isSub?: boolean;
  onClick: () => void;
}

const FlowNode: React.FC<FlowNodeProps> = ({ step, stageIndex, stepIndex, isSub, onClick }) => {
  const stageColor = STAGE_COLORS[stageIndex % STAGE_COLORS.length];
  const stepNumber = stepIndex + 1;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full max-w-[280px] p-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
        isSub
          ? 'bg-[#2c3a4b] border border-[#3b4b5f] border-l-4'
          : 'bg-[#2c3a4b] border border-[#3b4b5f] border-l-4'
      } hover:-translate-y-0.5 hover:shadow-lg`}
      style={{
        borderLeftColor: isSub ? '#ffb84d' : stageColor,
        boxShadow: isSub ? '0 0 0 0 transparent' : undefined,
      }}
    >
      <span
        className="flex items-center justify-center min-w-[22px] h-5 rounded-full text-[11px] font-extrabold text-[#0f1520]"
        style={{ backgroundColor: isSub ? '#ffb84d' : stageColor }}
      >
        {stepNumber}
      </span>
      <div className="min-w-0">
        <div className="text-[12.5px] font-bold leading-snug truncate">{step.name}</div>
        <div className="text-[11px] leading-snug truncate" style={{ color: '#9fb0c3' }}>
          {step.en}
        </div>
      </div>
    </button>
  );
};

interface FlowStageProps {
  stage: WorkflowStage;
  stageIndex: number;
  onStepClick: (stageIndex: number, stepIndex: number) => void;
}

const FlowStage: React.FC<FlowStageProps> = ({ stage, stageIndex, onStepClick }) => {
  const stageColor = STAGE_COLORS[stageIndex % STAGE_COLORS.length];
  const stageNumber = stageIndex + 1;

  return (
    <div className="flex flex-col items-center min-w-[280px] animate-fade-up" style={{ backgroundColor: 'rgba(20, 29, 43, 0.55)', border: '1px solid #2c3a4b', borderRadius: '16px', padding: '16px 18px 20px' }}>
      <div className="inline-flex items-center gap-2 font-extrabold text-[13px] px-3.5 py-1.5 rounded-full mb-3.5 whitespace-nowrap" style={{ color: '#0f1520', backgroundColor: stageColor }}>
        <span className="text-[11px] opacity-70">{stageNumber}</span>
        {stage.zh}
      </div>
      <div className="flex flex-col items-center w-full">
        {stage.steps.map((step, stepIndex) => (
          <React.Fragment key={`${stageIndex}-${stepIndex}`}>
            <FlowNode
              step={step}
              stageIndex={stageIndex}
              stepIndex={stepIndex}
              isSub={stepIndex > 0}
              onClick={() => onStepClick(stageIndex, stepIndex)}
            />
            {step.output && (
              <div className="mt-2 mb-1 text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap border border-dashed" style={{ color: '#ffb84d', borderColor: 'rgba(255, 184, 77, 0.5)', backgroundColor: 'rgba(255, 184, 77, 0.08)' }}>
                → {step.output}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export const FlowOverview: React.FC = () => {
  const { setCurrentStage, setCurrentStep, showDetail, hideDetailView, showDetailView } = useAppStore();

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
    <div id="flow-overview" className="mt-6 overflow-x-auto">
      <div className="flex flex-wrap gap-6 justify-center items-start min-h-[400px] p-2">
        {WORKFLOW.map((stage, stageIndex) => (
          <FlowStage
            key={stage.title}
            stage={stage}
            stageIndex={stageIndex}
            onStepClick={handleStepClick}
          />
        ))}
      </div>
    </div>
  );
};