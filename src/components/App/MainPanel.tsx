import React from 'react';
import { FlowOverview } from './FlowOverview';
import { DetailView } from './DetailView';
import { VisualizationRouter } from '../Visualizations';
import { useAppStore } from '../../context/AppContext';
import { WORKFLOW } from '../../data/workflow';

export const MainPanel: React.FC = () => {
  const { currentStage, currentStep, showDetail, detailContent, hideDetailView } = useAppStore();

  const currentStepData = WORKFLOW[currentStage]?.steps[currentStep];
  const activeStep = detailContent || currentStepData;

  return (
    <main id="main-panel" className={`flex-1 h-full overflow-y-auto ${showDetail && activeStep?.visualType ? 'p-4' : 'p-8'}`}>
      <section id="overview">
        {!showDetail && (
          <>
            <h2 className="text-[26px] mb-2.5">NGS 體細胞變異檢測流程總覽</h2>
            <p className="text-[14px] mb-6" style={{ color: '#9fb0c3' }}>
              點擊左側工具縮圖，或直接在此流程圖中點擊任一步驟，查看詳細說明。
            </p>
            <FlowOverview />
          </>
        )}

        {showDetail && activeStep && (
          <>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={hideDetailView}
                className="px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
                style={{ color: '#4da3ff', borderColor: '#4da3ff', borderWidth: '1px', backgroundColor: 'transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(77, 163, 255, 0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                ← 返回總覽
              </button>
              <span className="text-[12px]" style={{ color: '#9fb0c3' }}>{activeStep.en}</span>
            </div>

            {activeStep.visualType ? (
              <VisualizationRouter visualType={activeStep.visualType} />
            ) : (
              <DetailView
                step={activeStep}
                stageIndex={currentStage}
                onBack={hideDetailView}
              />
            )}
          </>
        )}
      </section>
    </main>
  );
};