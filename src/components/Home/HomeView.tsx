import React, { useEffect, useRef } from 'react';
import { useAppStore } from '../../context/AppContext';
import { PATIENTS, SCENARIOS } from '../../data/workflow';
import { PatientCard } from './PatientCard';

export const HomeView: React.FC = () => {
  const { selectedPatient, selectPatient, setView } = useAppStore();
  const scenarioTextRef = useRef<HTMLParagraphElement>(null);
  const typedTextRef = useRef<string>('');
  const charIndexRef = useRef(0);
  const scenarioIndexRef = useRef(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const typeScenario = () => {
      const scenario = SCENARIOS[scenarioIndexRef.current];
      if (charIndexRef.current < scenario.length) {
        typedTextRef.current += scenario[charIndexRef.current];
        charIndexRef.current++;
        if (scenarioTextRef.current) {
          scenarioTextRef.current.innerHTML = typedTextRef.current + '<span class="cursor"></span>';
        }
        setTimeout(typeScenario, 30);
      } else {
        if (scenarioIndexRef.current < SCENARIOS.length - 1) {
          setTimeout(() => {
            charIndexRef.current = 0;
            typedTextRef.current = '';
            scenarioIndexRef.current++;
            typeScenario();
          }, 3000);
        }
      }
    };
    typeScenario();
  }, []);

  const handleStart = () => {
    if (selectedPatient) {
      setView('app');
    }
  };

  return (
    <section className="relative h-screen w-full overflow-hidden flex flex-col" style={{ background: 'linear-gradient(160deg, #10192a 0%, #0b1120 55%, #102028 100%)' }}>
      {/* Background DNA helix */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-10%] bottom-[-10%] w-[5px] rounded-[3px] opacity-16 animate-helix-sway" style={{ left: '8%', background: 'linear-gradient(180deg, #4da3ff, #ffb84d, #4da3ff)' }} />
        <div className="absolute top-[-10%] bottom-[-10%] w-[5px] rounded-[3px] opacity-16 animate-helix-sway" style={{ left: '92%', background: 'linear-gradient(180deg, #4da3ff, #ffb84d, #4da3ff)', animationDelay: '0.6s' }} />
        <div className="absolute top-[-10%] bottom-[-10%] w-[5px] rounded-[3px] opacity-16 animate-helix-sway" style={{ left: '32%', background: 'linear-gradient(180deg, #4da3ff, #ffb84d, #4da3ff)', animationDelay: '1.2s' }} />
      </div>

      {/* Floating nucleotides */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {['A', 'C', 'G', 'T', 'A', 'G', 'C', 'T'].map((base, i) => (
          <span
            key={i}
            className="absolute font-mono font-bold text-[26px] animate-seq-float"
            style={{
              left: `${[6, 18, 30, 44, 58, 70, 83, 94][i]}%`,
              top: `${[18, 64, 30, 78, 22, 70, 34, 80][i]}%`,
              color: i % 2 === 0 ? 'rgba(255, 184, 77, 0.22)' : 'rgba(77, 163, 255, 0.22)',
              textShadow: i % 2 === 0 ? '0 0 14px rgba(255, 184, 77, 0.18)' : '0 0 14px rgba(77, 163, 255, 0.18)',
              animationDelay: `${[-2, -4, -7, -3, -5, -2.5, -6, -4.5][i]}s`,
            }}
          >
            {base}
          </span>
        ))}
      </div>

      <div className="flex-1 flex items-center px-8 max-w-7xl mx-auto w-full relative z-10 animate-fade-up">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-10 items-center w-full">
          {/* Left side */}
          <div className="animate-fade-up">
            <div className="inline-block text-[12px] font-bold tracking-wider mb-5 px-3.5 py-1.5 rounded-full" style={{ color: '#ffb84d', borderColor: 'rgba(255, 184, 77, 0.4)', backgroundColor: 'rgba(255, 184, 77, 0.08)' }}>
              基因偵探事務所
            </div>
            <h1 className="text-[44px] leading-tight font-extrabold tracking-wide mb-5">
              歡迎來到<br />
              <span style={{ color: '#4da3ff' }}>基因偵探事務所</span>
            </h1>
            <p id="scenario-text" ref={scenarioTextRef} className="text-[16px] leading-[2] max-w-[480px] min-h-[3.2em]" style={{ color: '#c6d3e3' }} />
            <div className="flex items-center gap-2.5 mt-8 h-11" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="w-2 h-11 rounded-lg opacity-25 animate-dna-pulse"
                  style={{
                    background: 'linear-gradient(180deg, #4da3ff, #ffb84d)',
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Right side - Patient selection */}
          <div className="animate-fade-up" style={{ animationDelay: '150ms' }}>
            <h2 className="text-[22px] mb-2">請選擇患者檢體</h2>
            <p className="text-[13px] mb-4" style={{ color: '#9fb0c3' }}>點選一位患者，開始你的偵查任務</p>
            <div id="patient-list" className="space-y-3">
              {PATIENTS.map((patient) => (
                <PatientCard
                  key={patient.name}
                  patient={patient}
                  isSelected={selectedPatient?.name === patient.name}
                  onSelect={() => selectPatient(patient)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Start button */}
      <div className="relative z-10 text-center pb-8 animate-fade-up" style={{ animationDelay: '300ms' }}>
        <button
          id="start-btn"
          onClick={handleStart}
          disabled={!selectedPatient}
          className="text-[20px] font-extrabold tracking-widest px-16 py-3.5 rounded-full transition-all duration-150"
          style={{
            color: '#0f1520',
            background: 'linear-gradient(90deg, #ffb84d, #ffd08a)',
            boxShadow: '0 6px 24px rgba(255, 184, 77, 0.35)',
            opacity: selectedPatient ? 1 : 0.4,
            cursor: selectedPatient ? 'pointer' : 'not-allowed',
            filter: selectedPatient ? 'none' : 'grayscale(0.6)',
          }}
        >
          開始尋找！
        </button>
        <p id="start-hint" className="mt-2.5 text-[12px] min-h-[1.4em]" style={{ color: '#9fb0c3' }}>
          {selectedPatient ? `已選擇：${selectedPatient.code} (${selectedPatient.cancer})` : '請先選擇一位患者'}
        </p>
        <button
          onClick={() => setView('feedback')}
          className="mt-4 inline-block text-[13px] font-bold transition-opacity hover:opacity-70"
          style={{ color: '#4da3ff' }}
        >
          留下學習回饋 →
        </button>
      </div>
    </section>
  );
};