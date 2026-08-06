import React from 'react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { MainPanel } from './MainPanel';

export const AppView: React.FC = () => {
  return (
    <section id="view-app" className="flex flex-col h-screen w-full" style={{ background: 'linear-gradient(160deg, #10192a 0%, #0b1120 60%, #102028 100%)' }}>
      <TopBar />
      <div id="app-body" className="flex flex-1 min-h-0">
        <Sidebar />
        <MainPanel />
      </div>
    </section>
  );
};