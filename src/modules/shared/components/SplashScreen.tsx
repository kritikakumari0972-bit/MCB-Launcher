import { useEffect, useState } from 'react';

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Show splash for 1 second
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      // Wait for the fade-out transition to finish (400ms)
      setTimeout(() => {
        onComplete();
      }, 400);
    }, 1000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      id="splash-screen"
      className={`fixed inset-0 z-[10000] flex items-center justify-center bg-black transition-opacity duration-400 ease-in-out ${isFadingOut ? 'opacity-0' : 'opacity-100'
        }`}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="relative group">
          {/* Subtle glow effect behind logo */}
          <div className="absolute inset-0 bg-white/5 blur-2xl rounded-full scale-150 transform transition-transform duration-1000 group-hover:scale-175"></div>

          <img
            src="/lasscmone_logo.png"
            alt="Launcher Logo"
            className="w-[600px] h-auto relative z-10 animate-in fade-in zoom-in duration-1000 animate-logo-pulse"
          />
        </div>

        {/* Optional: Add a subtle loading indicator if desired, but user didn't ask */}
        {/* <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-white/50 animate-progress"></div>
        </div> */}
      </div>
    </div>
  );
};

export default SplashScreen;
