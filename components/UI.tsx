
import React from 'react';
import { GameStatus } from '../types';

interface UIProps {
  status: GameStatus;
  pages: number;
  message: string;
  deathNote: string;
  onStart: () => void;
  flashlightOn: boolean;
  toggleFlashlight: () => void;
  nearestPageAngle: number | null;
  isMobile: boolean;
}

const UI: React.FC<UIProps> = ({ status, pages, message, deathNote, onStart, flashlightOn, toggleFlashlight, nearestPageAngle, isMobile }) => {
  
  if (status === GameStatus.MENU) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/98 z-40 p-6 text-center">
        <h1 className="text-6xl md:text-9xl font-bold tracking-[0.25em] mb-4 text-zinc-100 uppercase opacity-90 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">SLENDER</h1>
        <p className="text-zinc-500 max-w-md mb-12 uppercase tracking-[0.4em] text-[10px] leading-relaxed opacity-60">
          A floresta está fria. As páginas chamam.<br/>Não olhe para ele.
        </p>
        <button 
          onClick={onStart}
          className="group relative border border-zinc-800 hover:border-zinc-200 transition-all px-16 py-5 uppercase tracking-[0.4em] text-lg bg-black cursor-pointer overflow-hidden"
        >
          <span className="relative z-10">Entrar na Floresta</span>
          <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          <style>{`
            button:hover span { color: black; transition: color 0.3s; }
          `}</style>
        </button>
        <div className="mt-12 text-[9px] text-zinc-700 uppercase tracking-[0.2em] space-y-3 font-medium">
          {!isMobile ? (
            <>
              <p>Controles: WASD para Mover</p>
              <p>F: Lanterna | G: Pausar/Menu</p>
              <p>Mova o Mouse para Olhar</p>
            </>
          ) : (
            <>
              <p>Joystick à Esquerda: Mover</p>
              <p>Arraste à Direita: Olhar</p>
              <p>Botão no Círculo: Lanterna</p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (status === GameStatus.GAME_OVER) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-50 text-center p-8">
        <div className="w-full h-full absolute inset-0 bg-white/5 animate-pulse pointer-events-none" />
        <h2 className="text-6xl font-bold mb-8 text-red-950 uppercase tracking-tighter drop-shadow-[0_0_15px_rgba(100,0,0,0.5)]">FIM</h2>
        <p className="text-zinc-500 italic mb-12 max-w-lg text-sm border-l border-red-900 pl-4 py-2 bg-red-950/10 tracking-wide">
          "{deathNote || 'Ele sempre esteve observando.'}"
        </p>
        <button 
          onClick={onStart}
          className="border border-red-950 text-red-900 px-12 py-4 uppercase tracking-[0.3em] hover:bg-red-950 hover:text-white transition-all cursor-pointer font-bold"
        >
          Reiniciar
        </button>
      </div>
    );
  }

  if (status === GameStatus.VICTORY) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-50 z-50 text-center p-8">
        <h2 className="text-7xl font-black mb-4 text-black uppercase tracking-tighter">SOBREVIVENTE</h2>
        <p className="text-zinc-800 mb-12 uppercase tracking-[0.5em] text-xs font-bold">Você coletou as 8 páginas e escapou do olhar.</p>
        <button 
          onClick={onStart}
          className="bg-black text-white px-14 py-5 uppercase tracking-[0.4em] hover:bg-zinc-800 transition-all cursor-pointer shadow-2xl"
        >
          Voltar para a Floresta
        </button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-30 p-10 flex flex-col justify-between">
      {/* Top HUD */}
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-6">
          <div className="space-y-1">
            <div className="text-[9px] text-zinc-600 uppercase tracking-[0.3em] font-bold">Páginas Coletadas</div>
            <div className="text-4xl font-black tracking-tighter text-zinc-100 drop-shadow-md">
              {pages}<span className="text-zinc-700 mx-1">/</span>8
            </div>
          </div>
          
          {/* Compass Arrow */}
          {nearestPageAngle !== null && (
            <div className="flex flex-col items-center justify-center pt-5">
              <div 
                className="w-8 h-8 flex items-center justify-center transition-transform duration-75 ease-linear drop-shadow-[0_0_5px_rgba(150,0,0,0.8)]"
                style={{ transform: `rotate(${-nearestPageAngle * (180 / Math.PI)}deg)` }}
              >
                <svg viewBox="0 0 24 24" className="w-full h-full text-red-900 fill-current">
                  <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
                </svg>
              </div>
              <div className="text-[7px] text-red-950 uppercase font-black tracking-widest mt-1">PÁGINA PRÓXIMA</div>
            </div>
          )}
        </div>

        <div className="text-right">
          <div className="text-[9px] text-zinc-600 uppercase tracking-[0.3em] font-bold">Bateria</div>
          <div className={`text-sm uppercase font-black tracking-widest ${flashlightOn ? 'text-green-900' : 'text-zinc-900'}`}>
            {flashlightOn ? 'Ativa' : 'Desligada'}
          </div>
        </div>
      </div>

      {/* Cryptic Message */}
      {message && (
        <div className="flex items-center justify-center pb-24">
          <div className="text-2xl md:text-4xl font-black uppercase tracking-[0.5em] text-white animate-pulse text-center drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] px-4">
            {message}
          </div>
        </div>
      )}

      {/* Center Prompt */}
      {!flashlightOn && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-zinc-900 text-[9px] uppercase tracking-[0.4em] font-bold">
          Escuridão Profunda... {!isMobile ? '[F]' : ''}
        </div>
      )}
    </div>
  );
};

export default UI;
