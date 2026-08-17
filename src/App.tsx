import { useEffect } from 'react';
import { useAppStore } from './context/AppContext';
import { HomeView } from './components/Home';
import { AppView } from './components/App';
import { FeedbackView } from './components/Feedback/FeedbackView';
import { TaskCard } from './components/TaskCard';
import { CongratsPopup } from './components/TaskCard';

function App() {
  const { currentView } = useAppStore();

  // Handle keyboard navigation for task card
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        useAppStore.getState().nextSlide();
      } else if (e.key === 'ArrowLeft') {
        useAppStore.getState().prevSlide();
      } else if (e.key === 'Escape') {
        useAppStore.getState().closeTaskCard();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="h-screen w-full overflow-hidden">
      {/* Main Views */}
      {currentView === 'home' && <HomeView />}
      {currentView === 'app' && <AppView />}
      {currentView === 'feedback' && <FeedbackView />}

      {/* Task Card Overlay */}
      <TaskCard />

      {/* Congrats Popup */}
      <CongratsPopup />
    </div>
  );
}

export default App;