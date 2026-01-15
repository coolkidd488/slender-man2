
import React, { Suspense, useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

const createAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
};

// -- Helper Components --

const Tree = ({ position, scale = 1 }: { position: [number, number, number], scale?: number }) => {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.5, 5, 8]} />
        <meshStandardMaterial color="#140d08" roughness={1} />
      </mesh>
      <mesh position={[0, 5, 0]} castShadow>
        <coneGeometry args={[2, 6, 6]} />
        <meshStandardMaterial color="#08140a" roughness={1} />
      </mesh>
    </group>
  );
};

const Shack = ({ position, rotation = 0, scale = 1 }: { position: [number, number, number], rotation?: number, scale?: number }) => {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[4, 3, 4]} />
        <meshStandardMaterial color="#1e1612" roughness={1} />
      </mesh>
      <mesh position={[0, 3.5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[3.5, 2, 4]} />
        <meshStandardMaterial color="#0f0f0f" roughness={1} />
      </mesh>
      <mesh position={[0, 1, 2.01]}>
        <planeGeometry args={[1.2, 2]} />
        <meshBasicMaterial color="#000" />
      </mesh>
    </group>
  );
};

const Tower = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      <mesh position={[0, 5, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 10, 2]} />
        <meshStandardMaterial color="#0a0a0a" roughness={1} />
      </mesh>
      <mesh position={[0, 10.1, 0]} castShadow>
        <boxGeometry args={[4, 0.5, 4]} />
        <meshStandardMaterial color="#111" />
      </mesh>
    </group>
  );
};

const Page = ({ position, onCollect }: { position: [number, number, number], onCollect: () => void }) => {
  const [collected, setCollected] = useState(false);
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (collected) return;
    const distance = state.camera.position.distanceTo(new THREE.Vector3(...position));
    if (distance < 2.5) {
      setCollected(true);
      onCollect();
    }
  });

  if (collected) return null;

  return (
    <mesh position={position} rotation={[0, Math.random() * Math.PI, 0]} ref={ref}>
      <planeGeometry args={[0.4, 0.6]} />
      <meshBasicMaterial color="white" side={THREE.DoubleSide} transparent opacity={0.9} />
    </mesh>
  );
};

const SlenderMan = ({ position }: { position: THREE.Vector3 }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      // Pequena oscilação para parecer mais sinistro
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
  });

  return (
    <group position={[position.x, 0, position.z]} ref={groupRef}>
      {/* Body - Mais alongado */}
      <mesh position={[0, 2.4, 0]}>
        <boxGeometry args={[0.4, 4.8, 0.2]} />
        <meshBasicMaterial color="#080808" />
      </mesh>
      {/* Head - Pálida e sem face */}
      <mesh position={[0, 4.8, 0]}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshBasicMaterial color="#efefef" />
      </mesh>
      {/* Arms - Extremamente longos */}
      <mesh position={[0.4, 3.2, 0]} rotation={[0, 0, -0.05]}>
        <boxGeometry args={[0.08, 4.8, 0.08]} />
        <meshBasicMaterial color="#080808" />
      </mesh>
      <mesh position={[-0.4, 3.2, 0]} rotation={[0, 0, 0.05]}>
        <boxGeometry args={[0.08, 4.8, 0.08]} />
        <meshBasicMaterial color="#080808" />
      </mesh>
      {/* Tentacles - Sinistros e retorcidos */}
      {[0, 1, 2, 3].map(i => (
        <mesh 
          key={i} 
          position={[Math.sin(i) * 0.5, 2.5, -0.2]} 
          rotation={[Math.sin(i), Math.cos(i), 0]}
        >
          <boxGeometry args={[0.05, 3.5, 0.05]} />
          <meshBasicMaterial color="#050505" />
        </mesh>
      ))}
    </group>
  );
};

const Forest = ({ onCollectPage }: { onCollectPage: (id: number) => void }) => {
  const trees = useMemo(() => {
    return Array.from({ length: 500 }).map((_, i) => ({
      id: i,
      pos: [
        (Math.random() - 0.5) * 300,
        0,
        (Math.random() - 0.5) * 300
      ] as [number, number, number],
      scale: 0.9 + Math.random() * 0.8
    }));
  }, []);

  const pageDefinitions = useMemo(() => {
    return [
      { id: 0, pos: [35, 1.2, 35] }, 
      { id: 1, pos: [-50, 1.2, 28] }, 
      { id: 2, pos: [20, 1.2, -70] }, 
      { id: 3, pos: [-75, 1.2, -45] },
      { id: 4, pos: [70, 1.2, -25] }, 
      { id: 5, pos: [15, 1.2, 80] }, 
      { id: 6, pos: [-35, 1.2, -35] }, 
      { id: 7, pos: [60, 1.2, 60] }
    ] as { id: number, pos: [number, number, number] }[];
  }, []);

  const structures = useMemo(() => [
    { type: 'shack', pos: [25, 0, 25], rot: 0.5 },
    { type: 'shack', pos: [-40, 0, -50], rot: -1.2 },
    { type: 'shack', pos: [65, 0, -15], rot: 2.1 },
    { type: 'shack', pos: [-70, 0, 70], rot: 0.1 },
    { type: 'tower', pos: [-55, 0, 55] },
    { type: 'tower', pos: [45, 0, -55] },
    { type: 'tower', pos: [0, 0, 90] },
    { type: 'wall', pos: [0, 0, -25], rot: 0 },
    { type: 'wall', pos: [20, 0, 65], rot: Math.PI / 2 },
    { type: 'wall', pos: [-65, 0, 20], rot: 0.8 },
    { type: 'wall', pos: [-15, 0, -65], rot: -0.5 },
  ], []);

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color="#020202" roughness={1} />
      </mesh>
      {trees.map(t => <Tree key={t.id} position={t.pos} scale={t.scale} />)}
      {structures.map((s, i) => (
        s.type === 'shack' 
          ? <Shack key={i} position={s.pos as any} rotation={s.rot} /> 
          : s.type === 'tower' 
          ? <Tower key={i} position={s.pos as any} />
          : null
      ))}
      {pageDefinitions.map((page) => (
        <Page 
          key={page.id} 
          position={page.pos} 
          onCollect={() => onCollectPage(page.id)} 
        />
      ))}
    </>
  );
};

const Controller = ({ onDeath, setStaticAmount, pagesCollected, flashlightOn, activePagePositions, onUpdateNearestAngle, isMobile, mobileJoystick, mobileLook }: any) => {
  const { camera, scene } = useThree();
  const moveSpeed = 0.14;
  const keys = useRef<{ [key: string]: boolean }>({});
  const slenderPos = useRef(new THREE.Vector3(60, 0, 60));
  const lastTeleport = useRef(0);
  
  const lightRef = useRef<THREE.SpotLight>(null!);
  const targetRef = useRef<THREE.Object3D>(new THREE.Object3D());

  const audioCtx = useRef<AudioContext | null>(null);
  const footstepTimer = useRef(0);
  const ambienceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    scene.add(targetRef.current);
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (!audioCtx.current) {
        audioCtx.current = createAudioContext();
        startAmbience();
      }
    };
    const up = (e: KeyboardEvent) => keys.current[e.code] = false;
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      scene.remove(targetRef.current);
      if (ambienceRef.current) ambienceRef.current.stop();
    };
  }, [scene]);

  const startAmbience = () => {
    if (!audioCtx.current) return;
    const ctx = audioCtx.current;
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 4.0;
    }
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 350;
    source.connect(filter);
    filter.connect(ctx.destination);
    source.start();
    ambienceRef.current = source;
  };

  const playFootstep = () => {
    if (!audioCtx.current) return;
    const ctx = audioCtx.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(55, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  };

  const playJumpscareSound = () => {
    if (!audioCtx.current) return;
    const ctx = audioCtx.current;
    for (let i = 0; i < 6; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i % 2 === 0 ? 'sawtooth' : 'square';
        osc.frequency.setValueAtTime(80 + Math.random() * 400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(5 + Math.random() * 15, ctx.currentTime + 1.2);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.2);
    }
  };

  useFrame((state, delta) => {
    // 1. Movement logic (Joystick + Keys)
    let front = 0;
    let side = 0;

    if (isMobile) {
      front = mobileJoystick.front;
      side = mobileJoystick.side;
    } else {
      front = Number(keys.current['KeyW'] || 0) - Number(keys.current['KeyS'] || 0);
      side = Number(keys.current['KeyD'] || 0) - Number(keys.current['KeyA'] || 0);
    }

    const isMoving = Math.abs(front) > 0.1 || Math.abs(side) > 0.1;

    if (isMoving) {
      const cameraDir = new THREE.Vector3();
      camera.getWorldDirection(cameraDir);
      cameraDir.y = 0;
      cameraDir.normalize();
      const cameraSide = new THREE.Vector3().crossVectors(cameraDir, new THREE.Vector3(0, 1, 0)).normalize();
      
      const moveDir = new THREE.Vector3();
      moveDir.addScaledVector(cameraDir, front * moveSpeed);
      moveDir.addScaledVector(cameraSide, side * moveSpeed);
      camera.position.add(moveDir);

      footstepTimer.current += delta;
      if (footstepTimer.current > 0.55) {
        playFootstep();
        footstepTimer.current = 0;
      }
    }

    // 2. Mobile Look handling
    if (isMobile && mobileLook.x !== 0) {
      const euler = new THREE.Euler(0, 0, 0, 'YXZ');
      euler.setFromQuaternion(camera.quaternion);
      euler.y -= mobileLook.x * 4; // Ajuste de sensibilidade
      euler.x -= mobileLook.y * 4;
      euler.x = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, euler.x));
      camera.quaternion.setFromEuler(euler);
    }

    camera.position.y = 1.75;

    // Flashlight target
    const lookAtPos = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).add(camera.position);
    targetRef.current.position.copy(lookAtPos);
    if (lightRef.current) {
        lightRef.current.position.copy(camera.position);
        lightRef.current.target = targetRef.current;
    }

    // Slender AI & Static
    const dist = camera.position.distanceTo(slenderPos.current);
    const lookDir = new THREE.Vector3();
    camera.getWorldDirection(lookDir);
    const toSlender = new THREE.Vector3().subVectors(slenderPos.current, camera.position).normalize();
    const dot = lookDir.dot(toSlender);
    
    let currentStatic = 0;
    if (dist < 35) {
      const multiplier = 1.3 + (pagesCollected * 0.5);
      currentStatic = (Math.max(0, (35 - dist) / 35) * multiplier);
      if (dot > 0.65) currentStatic *= 5;
    }
    setStaticAmount(Math.min(1.4, currentStatic));

    if (dist < 3.8) {
      playJumpscareSound();
      onDeath();
    }

    // Compass update
    if (activePagePositions.length > 0) {
      let closest = activePagePositions[0];
      let minDist = camera.position.distanceTo(closest);
      for (const p of activePagePositions) {
        const d = camera.position.distanceTo(p);
        if (d < minDist) {
          minDist = d;
          closest = p;
        }
      }
      const playerFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      playerFwd.y = 0;
      playerFwd.normalize();
      const toPage = new THREE.Vector3().subVectors(closest, camera.position);
      toPage.y = 0;
      toPage.normalize();
      const angle = Math.atan2(toPage.x, toPage.z) - Math.atan2(playerFwd.x, playerFwd.z);
      onUpdateNearestAngle(angle);
    } else {
      onUpdateNearestAngle(null);
    }

    // AI Teleport
    const now = state.clock.getElapsedTime();
    const teleportCooldown = Math.max(0.8, 6.5 - pagesCollected);
    if (now - lastTeleport.current > teleportCooldown) {
      const angle = Math.random() * Math.PI * 2;
      const spawnDist = Math.max(4.5, 25 - pagesCollected * 2.8);
      slenderPos.current.set(camera.position.x + Math.cos(angle) * spawnDist, 0, camera.position.z + Math.sin(angle) * spawnDist);
      lastTeleport.current = now;
    }
  });

  return (
    <>
      {!isMobile && <PointerLockControls />}
      <SlenderMan position={slenderPos.current} />
      <spotLight ref={lightRef} intensity={flashlightOn ? 65 : 0} distance={40} angle={0.5} penumbra={0.75} color="#fffcf0" castShadow />
      <primitive object={camera} />
    </>
  );
};

interface GameSceneProps {
  pagesCollected: number;
  flashlightOn: boolean;
  onCollectPage: () => void;
  onDeath: () => void;
  setStaticAmount: (val: number) => void;
  onUpdateNearestAngle: (angle: number | null) => void;
  isMobile: boolean;
  mobileJoystick: { front: number, side: number };
  mobileLook: { x: number, y: number };
}

const GameScene: React.FC<GameSceneProps> = (props) => {
  const initialPagePositions = useMemo(() => [
    new THREE.Vector3(35, 1.2, 35),
    new THREE.Vector3(-50, 1.2, 28),
    new THREE.Vector3(20, 1.2, -70),
    new THREE.Vector3(-75, 1.2, -45),
    new THREE.Vector3(70, 1.2, -25),
    new THREE.Vector3(15, 1.2, 80),
    new THREE.Vector3(-35, 1.2, -35),
    new THREE.Vector3(60, 1.2, 60)
  ], []);

  const [activePages, setActivePages] = useState<number[]>(initialPagePositions.map((_, i) => i));

  const handlePageCollect = (id: number) => {
    setActivePages(prev => prev.filter(pId => pId !== id));
    props.onCollectPage();
  };

  const activeVecs = useMemo(() => 
    initialPagePositions.filter((_, i) => activePages.includes(i)),
    [activePages, initialPagePositions]
  );

  return (
    <div className="w-full h-full cursor-none">
      <Canvas shadows camera={{ fov: 75 }}>
        <color attach="background" args={['#000']} />
        <fog attach="fog" args={['#000', 0.5, 38]} />
        <Suspense fallback={null}>
          <ambientLight intensity={0.03} />
          <Stars radius={130} depth={65} count={5000} factor={4} saturation={0} fade speed={0.4} />
          <Forest onCollectPage={handlePageCollect} />
          <Controller {...props} activePagePositions={activeVecs} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default GameScene;
