import { useEffect, useState } from 'react';

export const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onFinish, 500);
    }, 2000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: '#0a0e1a' }}
    >
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="gradient-orb" style={{ width: 300, height: 300, top: '10%', left: '-10%', background: '#00d4ff' }} />
        <div className="gradient-orb" style={{ width: 250, height: 250, bottom: '10%', right: '-5%', background: '#7c3aed' }} />
        <div className="gradient-orb" style={{ width: 200, height: 200, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#00d4ff', opacity: 0.08 }} />
      </div>

      {/* Logo */}
      <div className="relative z-10 flex flex-col items-center">
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 animate-pulseGlow"
          style={{ background: 'linear-gradient(135deg, #00d4ff, #7c3aed)' }}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>

        <h1
          className="text-3xl font-bold mb-2 animate-neonGlow"
          style={{ background: 'linear-gradient(135deg, #00d4ff, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          Kotha Bolbo
        </h1>

        <p className="text-gray-500 text-sm mb-8">Connect. Chat. Belong.</p>

        {/* Loading dots */}
        <div className="flex gap-2">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
      </div>
    </div>
  );
};
