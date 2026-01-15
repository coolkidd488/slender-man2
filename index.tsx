
import React, { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Stars, useHelper } from '@react-three/drei';
import { GoogleGenAI } from "@google/genai";

// --- CONFIGURAÇÃO IA ---
const ai = process.env.API_KEY ? new GoogleGenAI({ apiKey: process.env.API_KEY }) : null;
const FALLBACK_NOTES = ["ELE TE VÊ", "NÃO OLHE PARA TRÁS", "ESTÁ PERTO", "8 PÁGINAS", "FUJA", "O SILÊNCIO", "A MORTE", "NUNCA SAI"];

const getCrypticMessage = async (count: number) => {
  if (!ai) return FALLBACK_NOTES[count % FALLBACK_NOTES.length];
  try {
    const res = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Gere uma frase de terror curtíssima (máximo 3 palavras) em PORTUGUÊS para o Slender Man. O jogador pegou ${count}/8 páginas.`
    });
    return res.text || FALLBACK_NOTES[count % FALLBACK_NOTES.length];
  } catch { return FALLBACK_NOTES[count % FALLBACK_NOTES.length]; }
};

// --- COMPONENTES 3D ---
const Tree = ({ pos, scale }: { pos: [number, number, number], scale: number }) => (
  <group position={pos} scale={scale}>
    <mesh position={[0, 3, 0]} castShadow>
      <cylinderGeometry args={[0.2, 0.4, 6, 8]} />
      <meshStandardMaterial color="#0a0805" roughness={1} />
    </mesh>
    <mesh position={[0, 6, 0]} castShadow>
      <coneGeometry args={[2, 6, 6]} />
      <meshStandardMaterial color="#020402" roughness={1} />
    </mesh>
  </group>
);

const Slender = ({ position }: { position: THREE.Vector3 }) => {
  const group = useRef<THREE.Group>(null!);
  useFrame((state) => {
    if (group.current) {
      group.current.position.y = Math.sin(state.clock.elapsedTime * 10) * 0.05;
      group.current.rotation.y = Math.atan2(
        state.camera.position.x - group.current.position.x,
        state.camera.position.z - group.current.position.z
      );
    }
  });
  return (
    <group ref={group} position={[position.x, 0, position.z]}>
      {/* Corpo */}
      <mesh position={[0, 2.5, 0]}><boxGeometry args={[0.3, 5, 0.2]} /><meshBasicMaterial color="#000" /></mesh>
      {/* Cabeça */}
      <mesh position={[0, 5.1, 0]}><sphereGeometry args={[0.25, 16, 16]} /><meshBasicMaterial color="#eee" /></mesh>
      {/* Tentáculos */}
      {[...Array(6)].map((_, i) => (
        <mesh key={i} position={[0, 3, 0]} rotation={[i * 0.5, Math.PI / 3 * i, 0]}>
          <boxGeometry args={[0.05, 4, 0.05]} /><meshBasicMaterial color="#000" />
        </mesh>
      ))}
    </group>
  );
};

const Page = ({ pos, onCollect }: { pos: [number, number, number], onCollect: () => void }) => {
  const [active, setActive] = useState(true);
  const camera = useThree((state) => state.camera);
  const pagePos = useMemo(() => new THREE.Vector3(...pos), [pos]);

  useFrame(() => {
    if (active && camera.position.distanceTo(pagePos) < 2.5) {
      setActive(false);
      onCollect();
    }
  });

  if (!active) return null;
  return (
    <mesh position={pos} rotation={[0, Math.random() * Math.PI, 0]}>
      <planeGeometry args={[0.4, 0.6]} />
      <meshBasicMaterial color="#fff" side={THREE.DoubleSide} transparent opacity={0.9} />
    </mesh>
  );
};

// --- CONTROLLER PRINCIPAL ---
const GameController = ({ isMobile, joy, onDeath, setStatic, pages, flashlight }: any) => {
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const slenderPos = useRef(new THREE.Vector3(50, 0, 50));
  const lastTeleport = useRef(0);
  const spotlight = useRef<THREE.SpotLight>(null!);
  const target = useRef(new THREE.Object3D());

  useEffect(() => {
    scene.add(target.current);
    const keys: Record<string, boolean> = {};
    const onKeyDown = (e: KeyboardEvent) => { keys[e.code] = true; (window as any)._keys = keys; };
    const onKeyUp = (e: KeyboardEvent) => { keys[e.code] = false; (window as any)._keys = keys; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      scene.remove(target.current);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [scene]);

  useFrame((state, delta) => {
    const keys = (window as any)._keys || {};
    let f = isMobile ? joy.f : (keys['KeyW'] ? 1 : (keys['KeyS'] ? -1 : 0));
    let s = isMobile ? joy.s : (keys['KeyD'] ? 1 : (keys['KeyA'] ? -1 : 0));

    if (f || s) {
      const dir = new THREE.Vector3(); camera.getWorldDirection(dir); dir.y = 0; dir.normalize();
      const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
      camera.position.addScaledVector(dir, f * 0.15);
      camera.position.addScaledVector(side, s * 0.15);
    }
    camera.position.y = 1.7;

    const lookDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    target.current.position.copy(camera.position).add(lookDir);
    if (spotlight.current) {
      spotlight.current.position.copy(camera.position);
      spotlight.current.target = target.current;
    }

    const dist = camera.position.distanceTo(slenderPos.current);
    setStatic(dist < 35 ? (35 - dist) / 35 : 0);
    if (dist < 4.5) onDeath();

    if (state.clock.elapsedTime - lastTeleport.current > (10 - pages)) {
      const a = Math.random() * Math.PI * 2;
      const d = 15 + Math.random() * 20;
      slenderPos.current.set(camera.position.x + Math.cos(a) * d, 0, camera.position.z + Math.sin(a) * d);
      lastTeleport.current = state.clock.elapsedTime;
    }
  });

  return (
    <>
      {!isMobile && <PointerLockControls />}
      <Slender position={slenderPos.current} />
      <spotLight ref={spotlight} intensity={flashlight ? 80 : 0} distance={40} angle={0.4} penumbra={1} castShadow color="#fffaf0" />
    </>
  );
};

// --- APP ---
const App = () => {
  const [status, setStatus] = useState('MENU');
  const [pages, setPages] = useState(0);
  const [flashlight, setFlashlight] = useState(true);
  const [staticVal, setStaticVal] = useState(0);
  const [msg, setMsg] = useState("");
  const [isMobile] = useState(() => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  const [joy, setJoy] = useState({ f: 0, s: 0 });

  useEffect(() => {
    const loader = document.getElementById('loading-screen');
    if (loader) loader.style.display = 'none';
  }, []);

  const collectPage = async () => {
    const next = pages + 1;
    setPages(next);
    if (next === 8) setStatus('WIN');
    else {
      const m = await getCrypticMessage(next);
      setMsg(m);
      setTimeout(() => setMsg(""), 3000);
    }
  };

  const forestData = useMemo(() => ({
    trees: Array.from({ length: 450 }).map(() => ({
      p: [(Math.random() - 0.5) * 400, 0, (Math.random() - 0.5) * 400] as [number, number, number],
      s: 0.8 + Math.random()
    })),
    pages: [[40, 1, 40], [-50, 1, 20], [15, 1, -80], [-90, 1, -30], [80, 1, -10], [10, 1, 85], [-40, 1, -45], [70, 1, 70]] as [number, number, number][]
  }), []);

  return (
    <div className="w-full h-full relative overflow-hidden bg-black select-none">
      {/* Static Overlay */}
      <div className="absolute inset-0 z-20 pointer-events-none opacity-20 mix-blend-screen bg-[url('https://upload.wikimedia.org/wikipedia/commons/b/b1/Static_noise.gif')]"
           style={{ opacity: 0.05 + staticVal * 0.9 }} />

      {status === 'PLAYING' && (
        <Canvas shadows camera={{ fov: 75 }} className="bg-black">
          <fog attach="fog" args={['#000', 0, 40]} />
          <Suspense fallback={null}>
            <Stars count={4000} factor={4} fade />
            <ambientLight intensity={0.02} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[1000, 1000]} />
              <meshStandardMaterial color="#050505" />
            </mesh>
            {forestData.trees.map((t, i) => <Tree key={i} pos={t.p} scale={t.s} />)}
            {forestData.pages.map((p, i) => <Page key={i} pos={p} onCollect={collectPage} />)}
            <GameController isMobile={isMobile} joy={joy} flashlight={flashlight} pages={pages} 
                            onDeath={() => setStatus('DEAD')} setStatic={setStaticVal} />
          </Suspense>
        </Canvas>
      )}

      {/* Interface */}
      <div className="absolute inset-0 z-30 pointer-events-none p-8 flex flex-col justify-between text-white uppercase font-black tracking-widest">
        {status === 'MENU' && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center pointer-events-auto">
            <h1 className="text-6xl md:text-9xl mb-12 opacity-80 animate-pulse">SLENDER</h1>
            <button onClick={() => setStatus('PLAYING')} className="border-2 border-white/20 px-16 py-5 hover:bg-white hover:text-black transition-all text-xl">INICIAR</button>
            <p className="mt-12 text-[10px] opacity-40">WASD: ANDAR | F: LUZ | MOUSE: OLHAR</p>
          </div>
        )}

        {status === 'DEAD' && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center pointer-events-auto">
            <h2 className="text-7xl mb-10 text-red-900">VOCÊ FOI PEGO</h2>
            <button onClick={() => window.location.reload()} className="border border-red-900 px-12 py-4 text-red-900">REINICIAR</button>
          </div>
        )}

        {status === 'WIN' && (
          <div className="absolute inset-0 bg-white flex flex-col items-center justify-center pointer-events-auto">
            <h2 className="text-7xl mb-10 text-black">VOCÊ ESCAPOU</h2>
            <button onClick={() => window.location.reload()} className="bg-black text-white px-12 py-4">VOLTAR</button>
          </div>
        )}

        {status === 'PLAYING' && (
          <>
            <div className="flex justify-between items-start opacity-70 text-xs">
              <div>PÁGINAS: {pages}/8</div>
              <div>BATERIA: {flashlight ? 'OK' : 'OFF'}</div>
            </div>
            <div className="text-center text-3xl h-12 flex items-center justify-center">{msg}</div>
            {isMobile && (
              <div className="flex justify-between items-end pointer-events-auto">
                <div className="w-32 h-32 bg-white/5 rounded-full border border-white/10 relative"
                     onPointerMove={(e) => {
                       const rect = e.currentTarget.getBoundingClientRect();
                       const x = (e.clientX - (rect.left + 64)) / 64;
                       const y = (e.clientY - (rect.top + 64)) / 64;
                       setJoy({ f: -y, s: x });
                     }}
                     onPointerUp={() => setJoy({ f: 0, s: 0 })}>
                  <div className="w-10 h-10 bg-white/20 rounded-full absolute top-1/2 left-1/2 -ml-5 -mt-5" 
                       style={{ transform: `translate(${joy.s * 40}px, ${-joy.f * 40}px)` }} />
                </div>
                <button onPointerDown={() => setFlashlight(!flashlight)} className="w-16 h-16 rounded-full border border-white/20 bg-black/50 font-bold">L</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
