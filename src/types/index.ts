export interface Patient {
  name: string;
  age: number;
  cancer: string;
  cancerEn: string;
  color: string;
}

export interface Sample {
  id: string;
  name: string;
  index: string;
  indexType: 'i5' | 'i7';
  color: string;
}

export interface WorkflowStep {
  name: string;
  en: string;
  icon: string;
  desc: string;
  bullets: string[];
  input: string;
  output: string;
  visualType: string;
}

export interface WorkflowStage {
  title: string;
  zh: string;
  steps: WorkflowStep[];
}

export interface BaseColors {
  A: string;
  C: string;
  G: string;
  T: string;
}

export interface TaskSlide {
  index: number;
  stage: number;
  icon: string;
  stepLabel: string;
  title: string;
  description: string;
}

export type ViewType = 'home' | 'app';

export interface AppState {
  currentView: ViewType;
  selectedPatient: Patient | null;
  currentStage: number;
  currentStep: number;
  showTaskCard: boolean;
  taskSlides: TaskSlide[];
  currentSlideIndex: number;
  showCongrats: boolean;
  showDetail: boolean;
  detailContent: WorkflowStep | null;
}

export interface VisualizationProps {
  onComplete?: () => void;
}