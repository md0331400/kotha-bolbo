import { useEffect, useState } from 'react';

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);
    setIsAndroid(/Android/.test(ua));

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      window.location.reload();
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center overflow-hidden" style={{ background: '#0a0e1a' }}>
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="gradient-orb" style={{ width: 400, height: 400, top: '-10%', left: '-10%', background: '#00d4ff' }} />
        <div className="gradient-orb" style={{ width: 350, height: 350, bottom: '-10%', right: '-10%', background: '#7c3aed' }} />
        <div className="gradient-orb" style={{ width: 200, height: 200, top: '40%', left: '60%', background: '#00d4ff', opacity: 0.06 }} />
      </div>

      <div className="relative z-10 flex flex-col items-center px-8 max-w-md text-center animate-slideUp">
        {/* App icon */}
        <div
          className="w-28 h-28 rounded-3xl flex items-center justify-center mb-8 animate-float"
          style={{
            background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
            boxShadow: '0 20px 60px rgba(0, 212, 255, 0.3), 0 0 80px rgba(124, 58, 237, 0.2)',
          }}
        >
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>

        {/* Title */}
        <h1
          className="text-4xl font-bold mb-3"
          style={{ background: 'linear-gradient(135deg, #00d4ff, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          Kotha Bolbo
        </h1>

        <p className="text-gray-400 text-lg mb-2">Install the App</p>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          For the best experience, please install Kotha Bolbo as an app on your device.
        </p>

        {/* Install button */}
        {deferredPrompt && (
          <button
            onClick={handleInstall}
            className="btn-primary text-lg px-10 py-4 mb-8 flex items-center gap-3"
            style={{ boxShadow: '0 10px 40px rgba(0, 212, 255, 0.3)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Install App
          </button>
        )}

        {/* Manual install instructions */}
        <div className="glass rounded-2xl p-6 w-full text-left">
          <p className="text-gray-300 font-semibold mb-3 text-sm uppercase tracking-wider">How to install</p>

          {isIOS && (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center">1</span>
                <p className="text-gray-400 text-sm">Tap the <strong className="text-white">Share</strong> button in Safari</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center">2</span>
                <p className="text-gray-400 text-sm">Select <strong className="text-white">"Add to Home Screen"</strong></p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center">3</span>
                <p className="text-gray-400 text-sm">Tap <strong className="text-white">"Add"</strong> to confirm</p>
              </div>
            </div>
          )}

          {isAndroid && !deferredPrompt && (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center">1</span>
                <p className="text-gray-400 text-sm">Tap the <strong className="text-white">menu</strong> button (⋮)</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center">2</span>
                <p className="text-gray-400 text-sm">Select <strong className="text-white">"Install app"</strong> or <strong className="text-white">"Add to Home screen"</strong></p>
              </div>
            </div>
          )}

          {!isIOS && !isAndroid && (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center">1</span>
                <p className="text-gray-400 text-sm">Click the <strong className="text-white">install icon</strong> in your browser's address bar</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center">2</span>
                <p className="text-gray-400 text-sm">Or open the browser menu and select <strong className="text-white">"Install"</strong></p>
              </div>
            </div>
          )}
        </div>

        <p className="text-gray-600 text-xs mt-6">Kotha Bolbo • Premium Chat Experience</p>
      </div>
    </div>
  );
};
