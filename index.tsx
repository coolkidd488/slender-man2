
import React, { useState, useEffect, useCallback, useRef, Suspense, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Stars } from '@react-three/drei';
import { GoogleGenAI } from "@google/genai";

// --- CONFIGURAÇÃO IA ---
const getAI = () => {
  try {
    if (process.env.API_KEY) return new GoogleGenAI({ apiKey: process.env.API_KEY });
  } catch (e) {}
  return null;
};
const ai = getAI();

const FALLBACK_MESSAGES = ["ELE TE VÊ.", "NÃO OLHE.", "CORRA.", "ATRÁS DE VOCÊ.", "8 PÁGINAS...", "O FIM.", "MORTE.", "SILÊNCIO."];

const getMessage = async (count: number) => {
  if (!ai) return FALLBACK_MESSAGES[count % 8];
  try {
    const res = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Gere uma frase de terror curta (3 palavras) sobre o Slender Man. Páginas: ${count}/8.`
    });
    return res.text || FALLBACK_MESSAGES[count % 8];
  } catch (e) { return FALLBACK_MESSAGES[count % 8]; }
};

// --- COMPONENTES 3D ---
const Tree = ({ pos, s }: any) => (
  <group position={pos} scale={s}>
    <mesh position={[0, 3, 0]} castShadow>
      <cylinderGeometry args={[0.2, 0.4, 6]} />
      <meshStandardMaterial color="#0a0502" />
    </mesh>
    <mesh position={[0, 6, 0]} castShadow>
      <coneGeometry args={[2, 6, 5]} />
      <meshStandardMaterial color="#020502" />
    </mesh>
  </group>
);

const Slender = ({ position }: any) => {
  const group = useRef<THREE.Group>(null!);
  useFrame((s) => { if(group.current) group.current.position.y = Math.sin(s.clock.elapsedTime * 8) * 0.05; });
  return (
    <group ref={group} position={[position.x, 0, position.z]}>
      <mesh position={[0, 2.5, 0]}><boxGeometry args={[0.3, 5, 0.2]} /><meshBasicMaterial color="black" /></mesh>
      <mesh position={[0, 5.1, 0]}><sphereGeometry args={[0.26, 16, 16]} /><meshBasicMaterial color="#eee" /></mesh>
      {[...Array(6)].map((_, i) => (
        <mesh key={i} position={[0, 3, 0]} rotation={[i, Math.sin(i), 0]}>
          <boxGeometry args={[0.04, 4, 0.04]} /><meshBasicMaterial color="black" />
        </mesh>
      ))}
    </group>
  );
};

const Page = ({ pos, onCollect }: any) => {
  const [active, setActive] = useState(true);
  // Fix: useThree hook requires a selector in some environments to infer types correctly and avoid 'unknown' type errors
  const camera = useThree((state) => state.camera);
  useFrame(() => {
    if (active && camera.position.distanceTo(new THREE.Vector3(...pos)) < 2.5) {
      setActive(false);
      onCollect();
    }
  });
  if (!active) return null;
  return (
    <mesh position={pos} rotation={[0, Math.random(), 0]}>
      <planeGeometry args={[0.4, 0.6]} />
      <meshBasicMaterial color="white" side={THREE.DoubleSide} />
    </mesh>
  );
};

const Controller = ({ isMobile, joy, onDeath, setStatic, pages, onCollect, flashlight }: any) => {
  // Fix: Call useThree at the top level with selectors to correctly access reactive camera and scene objects
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const slenderPos = useRef(new THREE.Vector3(60, 0, 60));
  const lastTeleport = useRef(0);
  // Fix: Explicitly type the spotlight ref to enable access to its Three.js properties
  const spotlight = useRef<THREE.SpotLight>(null!);
  const target = useRef(new THREE.Object3D());

  useEffect(() => { scene.add(target.current); return () => { scene.remove(target.current); } }, [scene]);

  useFrame((state) => {
    // Movimentação
    // Fix: Access custom window properties using a type assertion to any
    const keys = (window as any)._keys || {};
    let f = isMobile ? joy.f : (keys['KeyW'] ? 1 : (keys['KeyS'] ? -1 : 0));
    let s = isMobile ? joy.s : (keys['KeyD'] ? 1 : (keys['KeyA'] ? -1 : 0));
    
    if (f || s) {
      const dir = new THREE.Vector3(); camera.getWorldDirection(dir); dir.y = 0; dir.normalize();
      const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
      camera.position.addScaledVector(dir, f * 0.16);
      camera.position.addScaledVector(side, s * 0.16);
    }
    camera.position.y = 1.7;

    // Lanterna
    const look = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    target.current.position.copy(camera.position).add(look);
    if (spotlight.current) {
      spotlight.current.position.copy(camera.position);
      spotlight.current.target = target.current;
    }

    // Slender AI
    const dist = camera.position.distanceTo(slenderPos.current);
    setStatic(dist < 35 ? (35 - dist) / 35 : 0);
    if (dist < 4) onDeath();

    if (state.clock.elapsedTime - lastTeleport.current > (8 - pages)) {
      const a = Math.random() * Math.PI * 2;
      const d = 12 + Math.random() * 20;
      slenderPos.current.set(camera.position.x + Math.cos(a)*d, 0, camera.position.z + Math.sin(a)*d);
      lastTeleport.current = state.clock.elapsedTime;
    }
  });

  return (
    <>
      {!isMobile && <PointerLockControls />}
      <Slender position={slenderPos.current} />
      <spotLight ref={spotlight} intensity={flashlight ? 60 : 0} distance={45} angle={0.5} penumbra={1} castShadow />
    </>
  );
};

// --- JOYSTICK MOBILE ---
const MobileJoystick = ({ onMove }: any) => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const handle = (e: any) => {
    if (!active) return;
    const t = e.touches ? e.touches[0] : e;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = t.clientX - (rect.left + 64);
    const y = t.clientY - (rect.top + 64);
    const dist = Math.min(Math.sqrt(x*x + y*y), 64);
    const ang = Math.atan2(y, x);
    setPos({ x: Math.cos(ang)*dist, y: Math.sin(ang)*dist });
    onMove(-Math.sin(ang)*(dist/64), -Math.cos(ang)*(dist/64));
  };
  return (
    <div className="w-32 h-32 bg-white/5 rounded-full border border-white/10 relative"
         onPointerDown={() => setActive(true)}
         onPointerUp={() => { setActive(false); setPos({x:0,y:0}); onMove(0,0); }}
         onPointerMove={handle}>
      <div className="w-12 h-12 bg-white/20 rounded-full absolute top-1/2 left-1/2 -ml-6 -mt-6"
           style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }} />
    </div>
  );
};

// --- APP PRINCIPAL ---
const App = () => {
  const [status, setStatus] = useState('MENU');
  const [pages, setPages] = useState(0);
  const [flashlight, setFlashlight] = useState(true);
  const [staticVal, setStaticVal] = useState(0);
  const [msg, setMsg] = useState("");
  const [isMobile] = useState(() => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  const [joy, setJoy] = useState({ f: 0, s: 0 });

  useEffect(() => {
    // Fix: Use type-safe access for window keys storage
    const down = (e: any) => { (window as any)._keys = { ...((window as any)._keys || {}), [e.code]: true }; };
    const up = (e: any) => { (window as any)._keys = { ...((window as any)._keys || {}), [e.code]: false }; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    // Fix: Access window.hideLoading via any cast to satisfy TypeScript
    if ((window as any).hideLoading) (window as any).hideLoading();
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  const collectPage = async () => {
    const next = pages + 1;
    setPages(next);
    if (next === 8) setStatus('WIN');
    else { setMsg(await getMessage(next)); setTimeout(() => setMsg(""), 3000); }
  };

  const trees = useMemo(() => Array.from({length: 400}).map((_, i) => ({
    p: [(Math.random()-0.5)*400, 0, (Math.random()-0.5)*400] as [number, number, number], s: 0.8 + Math.random()
  })), []);

  const pageLocs = useMemo(() => [
    [40,1,40], [-50,1,30], [20,1,-70], [-80,1,-40], [70,1,-20], [15,1,85], [-35,1,-35], [65,1,65]
  ] as [number, number, number][], []);

  return (
    <div className="w-full h-full relative select-none">
      {/* Noise Filter */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-[url('https://upload.wikimedia.org/wikipedia/commons/b/b1/Static_noise.gif')] mix-blend-screen"
           style={{ opacity: 0.05 + staticVal * 0.9 }} />

      {status === 'PLAYING' && (
        <Canvas shadows camera={{ fov: 75 }} className="bg-black">
          <fog attach="fog" args={['#000', 0, 45]} />
          <Suspense fallback={null}>
            <Stars count={3000} factor={4} />
            <ambientLight intensity={0.01} />
            {trees.map((t, i) => <Tree key={i} pos={t.p} s={t.s} />)}
            {pageLocs.map((p, i) => <Page key={i} pos={p} onCollect={collectPage} />)}
            {/* Fix: Pass missing required onCollect prop to Controller component */}
            <Controller isMobile={isMobile} joy={joy} flashlight={flashlight} pages={pages} 
                        onDeath={() => setStatus('DEAD')} setStatic={setStaticVal} onCollect={collectPage} />
          </Suspense>
        </Canvas>
      )}

      {/* UI */}
      <div className="absolute inset-0 z-40 pointer-events-none flex flex-col justify-between p-8 text-white uppercase tracking-tighter">
        {status === 'MENU' && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center pointer-events-auto">
            <h1 className="text-8xl font-black mb-10 opacity-70">SLENDER</h1>
            <button onClick={() => setStatus('PLAYING')} className="border border-white/20 px-12 py-4 hover:bg-white hover:text-black transition-all">ENTRAR</button>
          </div>
        )}

        {status === 'DEAD' && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center pointer-events-auto text-red-900">
            <h2 className="text-7xl font-black mb-8">VOCÊ MORREU</h2>
            <button onClick={() => window.location.reload()} className="border border-red-900 px-10 py-3">TENTAR NOVAMENTE</button>
          </div>
        )}

        {status === 'WIN' && (
          <div className="absolute inset-0 bg-white flex flex-col items-center justify-center pointer-events-auto text-black">
            <h2 className="text-7xl font-black mb-8">SOBREVIVEU</h2>
            <button onClick={() => window.location.reload()} className="border border-black px-10 py-3">SAIR</button>
          </div>
        )}

        {status === 'PLAYING' && (
          <>
            <div className="flex justify-between font-bold opacity-60">
              <div>PÁGINAS: {pages}/8</div>
              <div onClick={() => !isMobile && setFlashlight(!flashlight)}>LUZ: {flashlight ? 'ON' : 'OFF'}</div>
            </div>
            <div className="text-center text-3xl font-black animate-pulse h-10">{msg}</div>
            {isMobile && (
              <div className="flex justify-between items-end pointer-events-auto">
                <MobileJoystick onMove={(f, s) => setJoy({f, s})} />
                <button onPointerDown={() => setFlashlight(!flashlight)} className="w-16 h-16 rounded-full border border-white/20 bg-black/50">F</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);
