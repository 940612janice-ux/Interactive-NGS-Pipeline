import { create } from 'zustand';
import { AppState, ViewType, Patient, WorkflowStep } from '../types';
import { TASK_SLIDES } from '../data/taskSlides';

interface AppStore extends AppState {
  setView: (view: ViewType) => void;
  selectPatient: (patient: Patient) => void;
  setCurrentStage: (stage: number) => void;
  setCurrentStep: (step: number) => void;
  openTaskCard: (stage: number) => void;
  closeTaskCard: () => void;
  nextSlide: () => void;
  prevSlide: () => void;
  setSlideIndex: (index: number) => void;
  openCongrats: () => void;
  closeCongrats: () => void;
  showDetailView: (step: WorkflowStep) => void;
  hideDetailView: () => void;
  reset: () => void;
}

const initialState: AppState = {
  currentView: 'home',
  selectedPatient: null,
  currentStage: 0,
  currentStep: 0,
  showTaskCard: false,
  taskSlides: TASK_SLIDES,
  currentSlideIndex: 0,
  showCongrats: false,
  showDetail: false,
  detailContent: null,
};

export const useAppStore = create<AppStore>((set) => ({
  ...initialState,
  setView: (view) => set({ currentView: view }),
  selectPatient: (patient) => set({ selectedPatient: patient }),
  setCurrentStage: (stage) => set({ currentStage: stage }),
  setCurrentStep: (step) => set({ currentStep: step }),
  openTaskCard: (stage) => set((state) => ({
    showTaskCard: true,
    currentSlideIndex: state.taskSlides.findIndex(s => s.stage === stage) || 0,
  })),
  closeTaskCard: () => set({ showTaskCard: false }),
  nextSlide: () => set((state) => ({
    currentSlideIndex: Math.min(state.currentSlideIndex + 1, state.taskSlides.length - 1),
  })),
  prevSlide: () => set((state) => ({
    currentSlideIndex: Math.max(state.currentSlideIndex - 1, 0),
  })),
  setSlideIndex: (index) => set({ currentSlideIndex: index }),
  openCongrats: () => set({ showCongrats: true }),
  closeCongrats: () => set({ showCongrats: false }),
  showDetailView: (step) => set({ showDetail: true, detailContent: step }),
  hideDetailView: () => set({ showDetail: false, detailContent: null }),
  reset: () => set(initialState),
}));