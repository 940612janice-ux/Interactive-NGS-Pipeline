import { TaskSlide } from '../types';

export const TASK_SLIDES: TaskSlide[] = [
  // Stage 0: BCL & Basecalling
  {
    index: 0,
    stage: 0,
    icon: 'blc.png',
    stepLabel: '案件目標',
    title: '第一關：BCL 拆碼與轉檔',
    description: '「我們的第一個關卡是處理剛下機的 BCL 檔，請幫我們將它拆碼並轉成 FASTQ！」',
  },
  {
    index: 1,
    stage: 0,
    icon: 'blc.png',
    stepLabel: 'Step 1 · 原始光學訊號',
    title: 'BCL 原始資料',
    description: '序列儀產生的原始 BCL 檔案，儲存的是四通道螢光強度數值，還沒有鹼基文字。觀察純粹的光學訊號矩陣。',
  },
  {
    index: 2,
    stage: 0,
    icon: 'fastq.png',
    stepLabel: 'Step 2 · Basecalling',
    title: 'bcl2fastq Basecalling',
    description: 'BCL 是序列儀的二進位原始資料，就像 DNA 的「原始密碼本」。bcl2fastq 比較四通道螢光強度，判讀出對應鹼基（A/T/C/G），輸出為 FASTQ。',
  },
  {
    index: 3,
    stage: 0,
    icon: 'fastq.png',
    stepLabel: 'Step 3 · 歸檔',
    title: '依 Index 序列拆碼歸檔',
    description: '每位患者都有專屬的 Index 標籤。辨識 Index 條碼，將混合資料拆開，拖拽分類到對應樣品的儲存桶中。',
  },
  // Stage 1: Pre-processing
  {
    index: 4,
    stage: 1,
    icon: 'fastq.png',
    stepLabel: '案件目標',
    title: '第二關：前處理 — Pre-processing',
    description: '「接下來是前處理階段！請幫我們對 Raw FASTQ 進行品質檢測、修剪接頭與低品質鹼基，並將乾淨的 FASTQ 比對到參考基因組。」',
  },
  {
    index: 5,
    stage: 1,
    icon: 'fastq.png',
    stepLabel: 'Step 1 · FastQC 品質檢測',
    title: 'FastQC 品質檢測',
    description: 'FastQC 對 Raw FASTQ 進行品質分析，生成 Per-base 品質折線圖與 Adapter 殘留比例。觀察 Q < 20 的紅色警示區域，點擊「下一步」進入修剪。',
  },
  {
    index: 6,
    stage: 1,
    icon: 'fastq.png',
    stepLabel: 'Step 2 · 修剪與過濾',
    title: 'fastp / Trimmomatic 裁接頭與低品質',
    description: '使用品質剪刀拖動 Q 值門檻，切除 low-quality 尾部；用 Adapter 刮刀清除接頭序列。觀察 Raw FASTQ → Clean FASTQ 的轉換。',
  },
  {
    index: 7,
    stage: 1,
    icon: 'sam.png',
    stepLabel: 'Step 3 · 序列比對',
    title: 'BWA-MEM 對齊參考基因體',
    description: '拖動短序列至 hg38 參考基因組的對應位置，模擬 BWA/Bowtie2 比對過程。觀察 Reads 轉化為帶有基因體座標的結構化比對結果。',
  },
];