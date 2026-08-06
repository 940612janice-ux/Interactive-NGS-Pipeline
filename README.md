# NGS Pipeline - 基因偵探事務所

React + TypeScript + Tailwind CSS 重構版本的 NGS 變異檢測流程互動教學工具。

## 功能特色

- 🏠 **首頁場景式體驗** - 選擇患者檢體，開始偵查任務
- 🧪 **完整 NGS Pipeline 視覺化** - 6 大階段、20+ 個步驟完整呈現
- 🎮 **互動式關卡學習** - BCL 拆碼、Basecalling、Demultiplexing、FastQC、Trimming 等關卡
- 📊 **即時動態圖表** - 品質分數分布、Adapter 含量、螢光強度矩陣等視覺化
- 🎨 **Tailwind CSS 樣式系統** - 統一的設計語言，支援深色模式

## 專案結構

```
src/
├── components/
│   ├── Home/           # 首頁組件
│   ├── App/            # 主應用視圖
│   ├── TaskCard/       # 任務卡片彈窗
│   └── Visualizations/ # 各階段視覺化組件
├── context/            # Zustand 狀態管理
├── data/               # 靜態資料 (WORKFLOW, PATIENTS 等)
├── hooks/              # 自定義 Hooks
└── types/              # TypeScript 型別定義
```

## 快速開始

### 安裝依賴

```bash
npm install
```

### 開發模式

```bash
npm run dev
```

### 建構生產版本

```bash
npm run build
```

### 預覽生產版本

```bash
npm run preview
```

## 技術棧

- **React 18** - 元件化 UI 框架
- **TypeScript** - 型別安全
- **Vite** - 快速建構工具
- **Tailwind CSS 3** - 實用優先的 CSS 框架
- **Zustand** - 輕量級狀態管理

## 主要視覺化組件

| 組件 | 對應階段 | 特色 |
|------|---------|------|
| `BclRawVisualization` | BCL 原始資料 | 4 通道螢光強度矩陣動畫 |
| `BasecallingVisualization` | Basecalling | 光訊號解碼過程、FASTQ 即時生成 |
| `DemultiplexingVisualization` | Demultiplexing | Index 拖拽分類遊戲 |
| `FastQCVisualization` | FastQC | Per-base Quality、Adapter Content 動態圖表 |
| `TrimmingVisualization` | Trimming | Q 值門檻滑桿、修剪進度動畫 |
| `GenericVisualization` | 其他階段 | 通用資訊展示組件 |

## 狀態管理

使用 Zustand 管理全域狀態：
- 當前視圖
- 選擇的患者
- 當前階段/步驟
- 任務卡片狀態
- 詳細檢視內容

## 自訂主題色彩

在 `tailwind.config.js` 中定義了專案專用色彩：

```js
colors: {
  accent: '#4da3ff',      // 主色藍
  'accent-2': '#ffb84d',  // 輔助金
  'text-light': '#e8eef5',
  'text-dim': '#9fb0c3',
  'card-bg': '#2c3a4b',
  'bg-dark': '#0f1520',
  'sidebar-bg': '#1b2430',
  'sidebar-bg-2': '#232f3e',
}
```

## 授權

MIT License