
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameStatus } from './types';
import { getCrypticMessage, getDeathMessage } from './services/gemini';
import GameScene from './components/GameScene';
import UI from './components/UI';
import Joystick from './components/Joystick';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);
  const [pages, setPages] = useState(0);
  const [flashlight, setFlashlight] = useState(true);
  const [staticAmount, setStaticAmount] = useState(0);
  const [message, setMessage] = useState<string>('');
  const [deathNote, setDeathNote] = useState<string>('');
  const [nearestPageAngle, setNearestPageAngle] = useState<number | null>(null);
  const [isJumpscare, setIsJumpscare] = useState(false);
  
  // Mobile detection & Controls
  const [isMobile, setIsMobile] = useState(false);
  const [joystickValues, setJoystickValues] = useState({ front: 0, side: 0 });
  const [touchLook, setTouchLook] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 800);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (status === GameStatus.PLAYING) {
      setMessage("ENCONTRE AS 8 PÁGINAS");
      const timer = setTimeout(() => setMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (e.code === 'KeyF' && status === GameStatus.PLAYING) {
        setFlashlight(prev => !prev);
      }
      if (e.code === 'KeyG') {
        setStatus(prev => prev === GameStatus.PLAYING ? GameStatus.MENU : prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [status]);

  const handlePageCollect = useCallback(async () => {
    const nextPages = pages + 1;
    setPages(nextPages);
    
    if (nextPages === 8) {
      setStatus(GameStatus.VICTORY);
      return;
    }

    const cryptic = await getCrypticMessage(nextPages);
    setMessage(cryptic);
    setTimeout(() => setMessage(''), 4000);
  }, [pages]);

  const handleDeath = useCallback(async () => {
    setIsJumpscare(true);
    setTimeout(async () => {
      setIsJumpscare(false);
      setStatus(GameStatus.GAME_OVER);
      const note = await getDeathMessage();
      setDeathNote(note);
    }, 1500);
  }, []);

  const startGame = () => {
    setPages(0);
    setStaticAmount(0);
    setStatus(GameStatus.PLAYING);
    setFlashlight(true);
    setMessage('');
    setNearestPageAngle(null);
    setIsJumpscare(false);
  };

  // Touch look handling
  const lastTouchRef = useRef<{x: number, y: number} | null>(null);
  const handleTouchMove = (e: React.TouchEvent) => {
    if (status !== GameStatus.PLAYING) return;
    
    // Filtro para não capturar o toque do joystick (assumindo que o joystick está à esquerda)
    const touch = e.touches[0];
    if (touch.clientX < window.innerWidth / 3) return; 

    if (lastTouchRef.current) {
      const dx = touch.clientX - lastTouchRef.current.x;
      const dy = touch.clientY - lastTouchRef.current.y;
      setTouchLook({ x: dx * 0.005, y: dy * 0.005 });
    }
    lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = () => {
    lastTouchRef.current = null;
    setTouchLook({ x: 0, y: 0 });
  };

  return (
    <div 
      className="relative w-full h-full bg-black overflow-hidden select-none"
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="crt-overlay" />
      <div className="noise" style={{ opacity: Math.max(0.05, staticAmount * 0.95) }} />
      
      {isJumpscare && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white overflow-hidden animate-[flash_0.1s_infinite]">
           <img 
            src="https://upload.wikimedia.org/wikipedia/commons/b/be/Slender_Man_screenshot.png" 
            className="w-full h-full object-cover grayscale invert contrast-200 scale-110"
            alt="jumpscare"
          />
          <div className="absolute inset-0 bg-red-900/40 mix-blend-overlay" />
        </div>
      )}

      {status === GameStatus.PLAYING && (
        <GameScene 
          pagesCollected={pages}
          flashlightOn={flashlight}
          onCollectPage={handlePageCollect}
          onDeath={handleDeath}
          setStaticAmount={setStaticAmount}
          onUpdateNearestAngle={setNearestPageAngle}
          isMobile={isMobile}
          mobileJoystick={joystickValues}
          mobileLook={touchLook}
        />
      )}

      <UI 
        status={status}
        pages={pages}
        message={message}
        deathNote={deathNote}
        onStart={startGame}
        flashlightOn={flashlight}
        toggleFlashlight={() => setFlashlight(!flashlight)}
        nearestPageAngle={nearestPageAngle}
        isMobile={isMobile}
      />

      {status === GameStatus.PLAYING && isMobile && (
        <div className="absolute bottom-10 left-10 z-50 pointer-events-auto">
          <Joystick onMove={(front, side) => setJoystickValues({ front, side })} />
        </div>
      )}

      {status === GameStatus.PLAYING && isMobile && (
        <button 
          onClick={() => setFlashlight(!flashlight)}
          className="absolute bottom-10 right-10 z-50 pointer-events-auto w-16 h-16 bg-white/10 rounded-full border border-white/20 flex items-center justify-center active:bg-white/30"
        >
           <svg viewBox="0 0 24 24" className="w-8 h-8 text-white fill-current">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
            </svg>
        </button>
      )}
      
      {!isMobile && (
        <div className="fixed bottom-4 left-4 text-[10px] text-zinc-500 uppercase tracking-widest z-50 bg-black/50 px-2 py-1 rounded">
          WASD: Mover | Mouse: Olhar | F: Lanterna | G: Menu
        </div>
      )}
      {isMobile && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 text-[8px] text-zinc-500 uppercase tracking-widest z-50 bg-black/50 px-2 py-1 rounded">
          Joystick: Mover | Lado Direito: Olhar | Círculo: Lanterna
        </div>
      )}
    </div>
  );
};

export default App;
