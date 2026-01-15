
import React, { useState, useEffect, useCallback, useRef, Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Stars } from '@react-three/drei';
import { GameStatus } from './types';
import { getCrypticMessage, getDeathMessage } from './services/gemini';

// --- COMPONENTE: JOYSTICK ---
const Joystick = ({ onMove }: { onMove: (f: number, s: number) => void }) => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (e: any) => {
    if (!active || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.min(Math.sqrt(dx*dx + dy*dy), rect.width / 2);
    const angle = Math.atan2(dy, dx);
    const x = Math.cos(angle) * dist;
    const y = Math.sin(angle) * dist;
    setPos({ x, y });
    onMove(-y / (rect.width/2), -x / (rect.width/2));
  };

  useEffect(() => {
    if (active) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', () => { setActive(false); setPos({x:0,y:0}); onMove(0,0); });
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', () => { setActive(false); setPos({x:0,y:0}); onMove(0,0); });
    }
    return () => { 
      window.removeEventListener('mousemove', handleMove); 
      window.removeEventListener('touchmove', handleMove);
    };
  }, [active]);

  return (
    <div ref={containerRef} onMouseDown={() => setActive(true)} onTouchStart={() => setActive(true)}
      className="w-32 h-32 bg-white/5 rounded-full border border-white/10 flex items-center justify-center touch-none">
      <div className="w-12 h-12 bg-white/20 rounded-full" style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }} />
    </div>
  );
};

// --- COMPONENTE: SLENDER MAN ---
const SlenderMan = ({ position }: { position: THREE.Vector3 }) => {
  const group = useRef<THREE.Group>(null!);
  useFrame((s) => {
    group.current.position.y = Math.sin(s.clock.elapsedTime * 10) * 0.02;
  });
  return (
    <group ref={group} position={[position.x, 0, position.z]}>
      <mesh position={[0, 2.5, 0]}><boxGeometry args={[0.3, 5, 0.15]} /><meshBasicMaterial color="#000" /></mesh>
      <mesh position={[0, 5.1, 0]}><sphereGeometry args={[0.25, 16, 16]} /><meshBasicMaterial color="#eee" /></mesh>
      {[...Array(6)].map((_, i) => (
        <mesh key={i} position={[0, 3, 0]} rotation={[Math.sin(i), i, 0]}>
          <boxGeometry args={[0.05, 4, 0.05]} /><meshBasicMaterial color="#000" />
        </mesh>
      ))}
    </group>
  );
};

// --- COMPONENTE: FOREST ---
const Forest = ({ onCollect }: any) => {
  const trees = useMemo(() => Array.from({length: 500}).map((_, i) => ({
    pos: [(Math.random()-0.5)*400, 0, (Math.random()-0.5)*400] as [number,number,number],
    s: 0.8 + Math.random()
  })), []);
  
  const pages = useMemo(() => [
    [30,1,30], [-40,1,20], [10,1,-60], [-70,1,-30], [60,1,-10], [5,1,70], [-25,1,-25], [50,1,50]
  ] as [number,number,number][], []);

  return (
    <>
      <mesh rotation={[-Math.PI/2, 0, 0]} receiveShadow><planeGeometry args={[1000, 1000]} /><meshStandardMaterial color="#020202" /></mesh>
      {trees.map((t, i) => (
        <group key={i} position={t.pos} scale={t.s}>
          <mesh position={[0,3,0]}><cylinderGeometry args={[0.2, 0.4, 6]} /><meshStandardMaterial color="#0a0805" /></mesh>
          <mesh position={[0,6,0]}><coneGeometry args={[2, 6]} /><meshStandardMaterial color="#050805" /></mesh>
        </group>
      ))}
      {pages.map((p, i) => <PageItem key={i} id={i} pos={p} onCollect={onCollect} />)}
    </>
  );
};

const PageItem = ({ id, pos, onCollect }: any) => {
  const [c, setC] = useState(false);
  const { camera } = useThree();
  useFrame(() => {
    if (!c && camera.position.distanceTo(new THREE.Vector3(...pos)) < 2.5) { setC(true); onCollect(id); }
  });
  return c ? null : <mesh position={pos}><planeGeometry args={[0.4, 0.6]} /><meshBasicMaterial color="white" side={THREE.DoubleSide} /></mesh>;
};

// --- COMPONENTE: APP PRINCIPAL ---
const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);
  const [pages, setPages] = useState(0);
  const [flashlight, setFlashlight] = useState(true);
  const [staticAmount, setStaticAmount] = useState(0);
  const [msg, setMsg] = useState("");
  const [deathNote, setDeathNote] = useState("");
  const [isMobile] = useState(() => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  const [joy, setJoy] = useState({ front: 0, side: 0 });
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [angle, setAngle] = useState<number | null>(null);
  const [jumpscare, setJumpscare] = useState(false);

  const startGame = () => { setPages(0); setStatus(GameStatus.PLAYING); setJumpscare(false); setMsg("ENCONTRE AS 8 PÁGINAS"); setTimeout(() => setMsg(""), 4000); };

  const handleDeath = async () => {
    setJumpscare(true);
    setTimeout(async () => {
      setStatus(GameStatus.GAME_OVER);
      setDeathNote(await getDeathMessage());
      setJumpscare(false);
    }, 1500);
  };

  const handlePage = async () => {
    const n = pages + 1;
    setPages(n);
    if (n === 8) setStatus(GameStatus.VICTORY);
    else { setMsg(await getCrypticMessage(n)); setTimeout(() => setMsg(""), 3000); }
  };

  return (
    <div className="w-full h-full bg-black relative overflow-hidden" 
      onTouchMove={(e) => { if(status === GameStatus.PLAYING && e.touches[0].clientX > window.innerWidth/2) setLook({x: e.touches[0].clientX, y: e.touches[0].clientY}) }}
      onTouchEnd={() => setLook({x:0, y:0})}>
      
      {/* Noise Effect */}
      <div className="absolute inset-0 pointer-events-none z-10 opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/b/b1/Static_noise.gif')]" 
           style={{ opacity: 0.05 + staticAmount * 0.8 }} />

      {jumpscare && (
        <div className="absolute inset-0 z-[100] bg-white flex items-center justify-center animate-pulse">
          <img src="https://upload.wikimedia.org/wikipedia/commons/b/be/Slender_Man_screenshot.png" className="w-full h-full object-cover grayscale invert" />
        </div>
      )}

      {status === GameStatus.PLAYING && (
        <Canvas shadows camera={{ fov: 75 }} className="cursor-none">
          <fog attach="fog" args={['#000', 0, 40]} />
          <Suspense fallback={null}>
            <Stars count={5000} factor={4} fade />
            <ambientLight intensity={0.02} />
            <Forest onCollect={handlePage} />
            <GameController 
              isMobile={isMobile} joy={joy} look={look} flashlight={flashlight}
              onDeath={handleDeath} setStatic={setStaticAmount} pages={pages} setAngle={setAngle}
            />
          </Suspense>
        </Canvas>
      )}

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none z-50 p-10 flex flex-col justify-between text-white uppercase font-bold tracking-widest">
        {status === GameStatus.MENU ? (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center pointer-events-auto">
            <h1 className="text-8xl mb-10 opacity-80">SLENDER</h1>
            <button onClick={startGame} className="border border-white/20 px-10 py-4 hover:bg-white hover:text-black transition-all">INICIAR</button>
            <p className="mt-10 text-[10px] opacity-40">WASD: MOVER | F: LANTERNA | MOUSE: OLHAR</p>
          </div>
        ) : status === GameStatus.GAME_OVER ? (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center pointer-events-auto">
            <h2 className="text-6xl text-red-900 mb-6">FIM</h2>
            <p className="mb-10 text-zinc-500 italic">"{deathNote}"</p>
            <button onClick={startGame} className="border border-red-900 text-red-900 px-8 py-3">REINICIAR</button>
          </div>
        ) : null}

        {status === GameStatus.PLAYING && (
          <>
            <div className="flex justify-between">
              <div>PÁGINAS: {pages}/8</div>
              <div>BATERIA: {flashlight ? 'OK' : 'OFF'}</div>
            </div>
            {msg && <div className="text-center text-2xl animate-pulse">{msg}</div>}
            {isMobile && (
              <div className="flex justify-between items-end pointer-events-auto">
                <Joystick onMove={(f, s) => setJoy({ front: f, side: s })} />
                <button onClick={() => setFlashlight(!flashlight)} className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center">F</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const GameController = ({ isMobile, joy, look, flashlight, onDeath, setStatic, pages, setAngle }: any) => {
  const { camera, scene } = useThree();
  const slenderPos = useRef(new THREE.Vector3(50,0,50));
  const lastTeleport = useRef(0);
  const light = useRef<THREE.SpotLight>(null!);
  const target = useRef(new THREE.Object3D());

  useEffect(() => { scene.add(target.current); return () => { scene.remove(target.current); } }, []);

  useFrame((state, delta) => {
    // Teclas PC
    const keys: any = (window as any)._keys || {};
    let f = isMobile ? joy.front : (keys['KeyW'] ? 1 : (keys['KeyS'] ? -1 : 0));
    let s = isMobile ? joy.side : (keys['KeyD'] ? 1 : (keys['KeyA'] ? -1 : 0));

    if (f || s) {
      const dir = new THREE.Vector3(); camera.getWorldDirection(dir); dir.y = 0; dir.normalize();
      const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0,1,0)).normalize();
      camera.position.addScaledVector(dir, f * 0.15);
      camera.position.addScaledVector(side, s * 0.15);
    }
    camera.position.y = 1.7;

    const lookDir = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
    target.current.position.copy(camera.position).add(lookDir);
    if(light.current) { light.current.position.copy(camera.position); light.current.target = target.current; }

    const dist = camera.position.distanceTo(slenderPos.current);
    setStatic(dist < 30 ? (30-dist)/30 : 0);
    if (dist < 4) onDeath();

    if (state.clock.elapsedTime - lastTeleport.current > (7 - pages)) {
      const a = Math.random() * Math.PI * 2;
      const d = 15 + Math.random() * 20;
      slenderPos.current.set(camera.position.x + Math.cos(a)*d, 0, camera.position.z + Math.sin(a)*d);
      lastTeleport.current = state.clock.elapsedTime;
    }
  });

  window.addEventListener('keydown', (e) => { (window as any)._keys = { ...(window as any)._keys, [e.code]: true }; });
  window.addEventListener('keyup', (e) => { (window as any)._keys = { ...(window as any)._keys, [e.code]: false }; });

  return (
    <>
      {!isMobile && <PointerLockControls />}
      <SlenderMan position={slenderPos.current} />
      <spotLight ref={light} intensity={flashlight ? 50 : 0} distance={40} angle={0.5} penumbra={1} castShadow />
    </>
  );
};

export default App;
