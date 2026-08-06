import React from 'react';
import { TaskSlide } from '../../types';
import { useAppStore } from '../../context/AppContext';

interface TaskNavProps {
  currentIndex: number;
  totalSlides: number;
  onPrev: () => void;
  onNext: () => void;
  onDotClick: (index: number) => void;
  isFinal: boolean;
}

const TaskNav: React.FC<TaskNavProps> = ({ currentIndex, totalSlides, onPrev, onNext, onDotClick, isFinal }) => {
  return (
    <div className="flex items-center justify-between mt-6.5 pt-5 border-t" style={{ borderColor: '#3b4b5f' }}>
      <button
        id="task-prev"
        onClick={onPrev}
        disabled={currentIndex === 0}
        className="px-5.5 py-2.5 rounded-lg text-[14px] font-bold transition-colors"
        style={{
          color: currentIndex === 0 ? '#3b4b5f' : '#9fb0c3',
          borderColor: currentIndex === 0 ? '#3b4b5f' : '#3b4b5f',
          backgroundColor: 'transparent',
          opacity: currentIndex === 0 ? 0.35 : 1,
          cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
        }}
        onMouseEnter={(e) => {
          if (currentIndex > 0) {
            e.currentTarget.style.color = '#e8eef5';
            e.currentTarget.style.borderColor = '#4da3ff';
          }
        }}
        onMouseLeave={(e) => {
          if (currentIndex > 0) {
            e.currentTarget.style.color = '#9fb0c3';
            e.currentTarget.style.borderColor = '#3b4b5f';
          }
        }}
      >
        上一步
      </button>

      <div id="task-dots" className="flex gap-2">
        {Array.from({ length: totalSlides }, (_, i) => (
          <span
            key={i}
            onClick={() => onDotClick(i)}
            className="w-2.25 h-2.25 rounded-full transition-all duration-200 cursor-pointer"
            style={{
              backgroundColor: i === currentIndex ? '#ffb84d' : '#3b4b5f',
              transform: i === currentIndex ? 'scale(1.25)' : 'scale(1)',
            }}
          />
        ))}
      </div>

      <button
        id="task-next"
        onClick={onNext}
        className={`px-5.5 py-2.5 rounded-lg text-[14px] font-bold transition-all ${isFinal ? '' : ''}`}
        style={{
          color: '#0f1520',
          background: isFinal ? 'linear-gradient(90deg, #ffb84d, #ffd08a)' : '#4da3ff',
          border: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.filter = 'brightness(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = 'brightness(1)';
        }}
      >
        {isFinal ? '完成關卡' : '下一步'}
      </button>
    </div>
  );
};

interface TaskSlideContentProps {
  slide: TaskSlide;
}

const TaskSlideContent: React.FC<TaskSlideContentProps> = ({ slide }) => {
  return (
    <div className="task-slide active flex flex-col items-center text-center animate-slide-in" style={{ minHeight: '300px' }}>
      <div className="task-icon relative w-18 h-18 rounded-2xl mb-5 overflow-hidden flex items-center justify-center" style={{ backgroundColor: '#0f1520', border: '2px solid #ffb84d', boxShadow: '0 6px 24px rgba(255, 184, 77, 0.25)' }}>
        <img
          src={`/file_type/${slide.icon}`}
          alt={slide.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
        <span className="hidden text-3xl">📄</span>
      </div>
      <div className="task-step-label text-[12px] font-bold tracking-wider mb-2.5" style={{ color: '#ffb84d', letterSpacing: '2px' }}>
        {slide.stepLabel}
      </div>
      <h2 className="text-[23px] mb-3.5">{slide.title}</h2>
      <p className="text-[15px] leading-[2] max-w-[440px]" style={{ color: '#c6d3e3' }}>
        {slide.description}
      </p>
    </div>
  );
};

export const TaskCard: React.FC = () => {
  const { showTaskCard, taskSlides, currentSlideIndex, closeTaskCard, prevSlide, nextSlide, setSlideIndex } = useAppStore();

  if (!showTaskCard) return null;

  const currentSlide = taskSlides[currentSlideIndex];
  const isFinal = currentSlideIndex === taskSlides.length - 1;
  const totalSlidesInStage = taskSlides.filter(s => s.stage === currentSlide.stage).length;
  const stageStartIndex = taskSlides.findIndex(s => s.stage === currentSlide.stage);
  const slideIndexInStage = currentSlideIndex - stageStartIndex;

  const handleNext = () => {
    if (isFinal) {
      closeTaskCard();
      // Trigger congrats for stage 1 completion
      const { openCongrats } = useAppStore.getState();
      if (currentSlide.stage === 1) {
        openCongrats();
      }
    } else {
      nextSlide();
    }
  };

  return (
    <div
      id="task-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center animate-overlay-in"
      style={{ backgroundColor: 'rgba(8, 12, 18, 0.78)', backdropFilter: 'blur(4px)' }}
      onClick={closeTaskCard}
    >
      <div
        id="task-card"
        className="w-[560px] max-w-[calc(100vw-40px)] p-8.5 pb-6.5 animate-card-pop"
        style={{
          backgroundColor: '#232f3e',
          border: '1px solid #3b4b5f',
          borderRadius: '18px',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.55)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="task-slides relative" style={{ minHeight: '300px' }}>
          <TaskSlideContent slide={currentSlide} />
        </div>
        <TaskNav
          currentIndex={slideIndexInStage}
          totalSlides={totalSlidesInStage}
          onPrev={prevSlide}
          onNext={handleNext}
          onDotClick={setSlideIndex}
          isFinal={isFinal}
        />
      </div>
    </div>
  );
};