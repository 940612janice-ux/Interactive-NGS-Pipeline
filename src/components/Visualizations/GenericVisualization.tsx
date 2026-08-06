import React from 'react';
import { VisualizationProps } from '../../types';

const visualizationInfo: Record<string, { title: string; description: string; icon: string; color: string }> = {
  'alignment': {
    title: 'BWA-MEM 序列比對',
    description: '將 Clean FASTQ 的 reads 使用 BWA-MEM 演算法比對到 hg38 參考基因體，產出帶有基因體座標的 SAM/BAM 檔案',
    icon: '🧬',
    color: '#4da3ff',
  },
  'mark-duplicates': {
    title: 'Mark Duplicates (Picard)',
    description: '標記 PCR 重複（duplicate）的 reads，修正 PCR amplification bias，避免影響後續的變異偵測準確度',
    icon: '📑',
    color: '#ffb84d',
  },
  'bqsr': {
    title: 'BQSR 品質校正',
    description: '使用 GATK BaseRecalibrator 搭配 dbSNP 已知位點建立模型，校正系統性 Q 值誤差，輸出 Analysis-ready BAM',
    icon: '🎚️',
    color: '#4cc38a',
  },
  'mutect2': {
    title: 'Mutect2 體細胞突變偵測',
    description: 'GATK Mutect2 比對 Tumor vs Matched Normal 的資料，找出腫瘤特有的體細胞變異，輸出 raw somatic VCF',
    icon: '🔬',
    color: '#ff6b6b',
  },
  'gnomad': {
    title: 'Germline Filtering (gnomAD)',
    description: '結合 gnomAD 族群等位基因頻率資料，濾除常見的天生遺傳變異，確保保留真正的體細胞突變',
    icon: '🧠',
    color: '#7a6bff',
  },
  'pon': {
    title: 'Panel of Normals (PoN)',
    description: '使用正常樣本建立背景變異模型，消除平台或實驗技術造成的系統性雜訊，降低偽陽性',
    icon: '🛡️',
    color: '#ff8fb1',
  },
  'contamination': {
    title: 'Contamination Estimation',
    description: '利用 GATK CalculateContamination 估算樣本間交叉污染程度，供後續過濾使用',
    icon: '🚱',
    color: '#4da3ff',
  },
  'orientation-bias': {
    title: 'Read Orientation Bias',
    description: '學習並排除 FFPE 氧化造成的 C>T/G>A 轉換變異，是體細胞呼叫的關鍵濾網',
    icon: '🔄',
    color: '#ffb84d',
  },
  'filter-mutect': {
    title: 'FilterMutectCalls',
    description: '綜合所有濾網（germline、PoN、contamination、orientation bias），給出高可信度變異 PASS 標籤',
    icon: '✅',
    color: '#4cc38a',
  },
  'annotation': {
    title: '變異註解 (VEP/ANNOVAR)',
    description: '為 PASS VCF 註解基因名稱、轉錄本、胺基酸變化、ClinVar/COSMIC 致病性等資訊',
    icon: '📖',
    color: '#ff6b6b',
  },
};

interface GenericVisualizationProps extends VisualizationProps {
  visualType: string;
}

export const GenericVisualization: React.FC<GenericVisualizationProps> = ({ visualType, onComplete }) => {
  const info = visualizationInfo[visualType] || {
    title: visualType,
    description: '此階段無專屬視覺化內容，正在建置中...',
    icon: '🚧',
    color: '#9fb0c3',
  };

  return (
    <div className="generic-visual grid gap-6 h-[calc(100vh-13rem)] min-h-[600px] p-8" style={{ gridTemplateColumns: '1fr 1fr' }}>
      {/* Visualization Panel */}
      <div className="flex flex-col items-center justify-center p-8 rounded-2xl text-center" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px' }}>
        <div className="text-8xl mb-6 animate-dna-pulse">{info.icon}</div>
        <h3 className="text-2xl font-bold mb-4" style={{ color: info.color }}>{info.title}</h3>
        <p className="text-lg max-w-xl leading-relaxed" style={{ color: '#c6d3e3' }}>{info.description}</p>
        <div className="mt-8 p-4 rounded-xl" style={{ backgroundColor: 'rgba(77, 163, 255, 0.1)', borderColor: 'rgba(77, 163, 255, 0.2)', borderWidth: '1px' }}>
          <p className="text-sm" style={{ color: '#9fb0c3' }}>詳細視覺化元件建置中...</p>
          <p className="text-xs mt-1 font-mono" style={{ color: '#6b7b8c' }}>Visual Type: {visualType}</p>
        </div>
      </div>

      {/* Info Panel */}
      <div className="flex flex-col gap-4">
        <div className="flex-1 p-6 rounded-2xl overflow-auto" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px' }}>
          <h4 className="text-lg font-bold mb-4" style={{ color: '#ffb84d' }}>階段資訊</h4>
          <div className="space-y-4">
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
              <strong className="block text-sm mb-1" style={{ color: '#e8eef5' }}>輸入</strong>
              <p className="text-sm font-mono" style={{ color: '#c6d3e3' }}>上一階段的輸出檔案</p>
            </div>
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
              <strong className="block text-sm mb-1" style={{ color: '#e8eef5' }}>輸出</strong>
              <p className="text-sm font-mono" style={{ color: '#c6d3e3' }}>下一階段的輸入檔案</p>
            </div>
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
              <strong className="block text-sm mb-1" style={{ color: '#e8eef5' }}>關鍵工具</strong>
              <p className="text-sm" style={{ color: '#c6d3e3' }}>GATK / Picard / SAMtools / BWA</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl text-center" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px' }}>
          <button
            onClick={onComplete}
            className="px-6 py-3 rounded-lg font-bold text-base transition-all w-full"
            style={{ backgroundColor: info.color, color: '#0f1520' }}
            onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
          >
            完成此階段
          </button>
        </div>
      </div>
    </div>
  );
};