
import React, { Suspense, useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

const createAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
};

// -- Elementos do Cenário --

const Tree = ({ position, scale = 1 }: { position: [number, number, number], scale?: number }) => {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.4, 6, 6]} />
        <meshStandardMaterial color="#0a0805" roughness={1} />
      </mesh>
      <mesh position={[0, 5.5, 0]} castShadow>
        <coneGeometry args={[2.5, 7, 5]} />
        <meshStandardMaterial color="#040805" roughness={1} />
      </mesh>
    </group>
  );
};

const Shack = ({ position, rotation = 0, scale = 1 }: { position: [number, number, number], rotation?: number, scale?: number }) => {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.5, 3, 4.5]} />
        <meshStandardMaterial color="#14100d" roughness={1} />
      </mesh>
      <mesh position={[0, 3.8, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[4, 2.5, 4]} />
        <meshStandardMaterial color="#050505" roughness={1} />
      </mesh>
      <mesh position={[0, 1, 2.26]}>
        <planeGeometry args={[1.5, 2.2]} />
        <meshBasicMaterial color="#000" />
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
      <planeGeometry args={[0.35, 0.5]} />
      <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} transparent opacity={0.95} />
    </mesh>
  );
};

const SlenderMan = ({ position }: { position: THREE.Vector3 }) => {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      // Movimento errático (jitter)
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 15) * 0.02;
      groupRef.current.position.x += Math.sin(state.clock.elapsedTime * 20) * 0.01;
    }
    if (headRef.current) {
      // Brilho pulsante na cabeça para destacar no escuro
      const s = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.05;
      headRef.current.scale.set(s, s, s);
    }
  });

  return (
    <group position={[position.x, 0, position.z]} ref={groupRef}>
      {/* Corpo - Elegante e Negro */}
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[0.35, 5, 0.18]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      {/* Cabeça - Pálida e sem traços */}
      <mesh position={[0, 5.1, 0]} ref={headRef}>
        <sphereGeometry args={[0.26, 32, 32]} />
        <meshBasicMaterial color="#f8f8f8" />
      </mesh>
      {/* Braços - Longos demais */}
      <mesh position={[0.4, 3.5, 0]} rotation={[0, 0, -0.05]}>
        <boxGeometry args={[0.07, 5, 0.07]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      <mesh position={[-0.4, 3.5, 0]} rotation={[0, 0, 0.05]}>
        <boxGeometry args={[0.07, 5, 0.07]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      {/* Tentáculos Animados */}
      {[...Array(6)].map((_, i) => (
        <Tentacle key={i} index={i} />
      ))}
    </group>
  );
};

const Tentacle = ({ index }: { index: number }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 3 + index) * 0.2;
      ref.current.rotation.x = Math.cos(state.clock.elapsedTime * 2 + index) * 0.2;
    }
  });
  return (
    <mesh 
      ref={ref}
      position={[Math.sin(index) * 0.4, 3, -0.2]} 
      rotation={[0.5, (index / 6) * Math.PI * 2, 0]}
    >
      <boxGeometry args={[0.04, 4, 0.04]} />
      <meshBasicMaterial color="#020202" />
    </mesh>
  );
};

const Forest = ({ onCollectPage }: { onCollectPage: (id: number) => void }) => {
  const trees = useMemo(() => {
    return Array.from({ length: 600 }).map((_, i) => ({
      id: i,
      pos: [
        (Math.random() - 0.5) * 350,
        0,
        (Math.random() - 0.5) * 350
      ] as [number, number, number],
      scale: 0.8 + Math.random() * 1.2
    }));
  }, []);

  const pagePositions = useMemo(() => [
    [40, 1.2, 40], [-60, 1.2, 30], [25, 1.2, -80], [-85, 1.2, -50],
    [80, 1.2, -30], [20, 1.2, 90], [-40, 1.2, -40], [70, 1.2, 70]
  ] as [number, number, number][], []);

  const structures = useMemo(() => [
    { type: 'shack', pos: [30, 0, 30], rot: 0.8 },
    { type: 'shack', pos: [-50, 0, -60], rot: -1.5 },
    { type: 'shack', pos: [75, 0, -20], rot: 2.5 },
    { type: 'shack', pos: [-80, 0, 80], rot: 0.2 },
    { type: 'shack', pos: [0, 0, -100], rot: 0 },
  ], []);

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[700, 700]} />
        <meshStandardMaterial color="#010101" roughness={1} />
      </mesh>
      {trees.map(t => <Tree key={t.id} position={t.pos} scale={t.scale} />)}
      {structures.map((s, i) => (
        <Shack key={i} position={s.pos as any} rotation={s.rot} />
      ))}
      {pagePositions.map((pos, i) => (
        <Page key={i} position={pos} onCollect={() => onCollectPage(i)} />
      ))}
    </>
  );
};

const Controller = ({ onDeath, setStaticAmount, pagesCollected, flashlightOn, activePagePositions, onUpdateNearestAngle, isMobile, mobileJoystick, mobileLook }: any) => {
  const { camera, scene } = useThree();
  const moveSpeed = 0.15;
  const keys = useRef<{ [key: string]: boolean }>({});
  const slenderPos = useRef(new THREE.Vector3(70, 0, 70));
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
      output[i] *= 4.5;
    }
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;
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
    osc.frequency.setValueAtTime(50, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  };

  const playJumpscareSound = () => {
    if (!audioCtx.current) return;
    const ctx = audioCtx.current;
    for (let i = 0; i < 8; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i % 2 === 0 ? 'sawtooth' : 'square';
        osc.frequency.setValueAtTime(60 + Math.random() * 600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1, ctx.currentTime + 1.5);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.5);
    }
  };

  useFrame((state, delta) => {
    let front = 0, side = 0;
    if (isMobile) {
      front = mobileJoystick.front;
      side = mobileJoystick.side;
    } else {
      front = Number(keys.current['KeyW'] || 0) - Number(keys.current['KeyS'] || 0);
      side = Number(keys.current['KeyD'] || 0) - Number(keys.current['KeyA'] || 0);
    }

    if (Math.abs(front) > 0.1 || Math.abs(side) > 0.1) {
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
      if (footstepTimer.current > 0.5) {
        playFootstep();
        footstepTimer.current = 0;
      }
    }

    if (isMobile && mobileLook.x !== 0) {
      const euler = new THREE.Euler(0, 0, 0, 'YXZ');
      euler.setFromQuaternion(camera.quaternion);
      euler.y -= mobileLook.x * 3.5;
      euler.x -= mobileLook.y * 3.5;
      euler.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, euler.x));
      camera.quaternion.setFromEuler(euler);
    }

    camera.position.y = 1.78;
    const lookAtPos = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).add(camera.position);
    targetRef.current.position.copy(lookAtPos);
    if (lightRef.current) {
        lightRef.current.position.copy(camera.position);
        lightRef.current.target = targetRef.current;
    }

    const dist = camera.position.distanceTo(slenderPos.current);
    const lookDir = new THREE.Vector3();
    camera.getWorldDirection(lookDir);
    const toSlender = new THREE.Vector3().subVectors(slenderPos.current, camera.position).normalize();
    const dot = lookDir.dot(toSlender);
    
    let currentStatic = 0;
    if (dist < 40) {
      const multiplier = 1.5 + (pagesCollected * 0.6);
      currentStatic = (Math.max(0, (40 - dist) / 40) * multiplier);
      if (dot > 0.6) currentStatic *= 6;
    }
    setStaticAmount(Math.min(1.5, currentStatic));

    if (dist < 4.2) {
      playJumpscareSound();
      onDeath();
    }

    if (activePagePositions.length > 0) {
      let closest = activePagePositions[0];
      let minDist = camera.position.distanceTo(closest);
      for (const p of activePagePositions) {
        const d = camera.position.distanceTo(p);
        if (d < minDist) { minDist = d; closest = p; }
      }
      const playerFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      playerFwd.y = 0; playerFwd.normalize();
      const toPage = new THREE.Vector3().subVectors(closest, camera.position);
      toPage.y = 0; toPage.normalize();
      const angle = Math.atan2(toPage.x, toPage.z) - Math.atan2(playerFwd.x, playerFwd.z);
      onUpdateNearestAngle(angle);
    } else {
      onUpdateNearestAngle(null);
    }

    const now = state.clock.getElapsedTime();
    const teleportCooldown = Math.max(0.6, 6 - pagesCollected);
    if (now - lastTeleport.current > teleportCooldown) {
      const angle = Math.random() * Math.PI * 2;
      const spawnDist = Math.max(4, 28 - pagesCollected * 3);
      slenderPos.current.set(camera.position.x + Math.cos(angle) * spawnDist, 0, camera.position.z + Math.sin(angle) * spawnDist);
      lastTeleport.current = now;
    }
  });

  return (
    <>
      {!isMobile && <PointerLockControls />}
      <SlenderMan position={slenderPos.current} />
      <spotLight ref={lightRef} intensity={flashlightOn ? 75 : 0} distance={45} angle={0.52} penumbra={0.8} color="#fffcf5" castShadow />
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
    new THREE.Vector3(40, 1.2, 40), new THREE.Vector3(-60, 1.2, 30),
    new THREE.Vector3(25, 1.2, -80), new THREE.Vector3(-85, 1.2, -50),
    new THREE.Vector3(80, 1.2, -30), new THREE.Vector3(20, 1.2, 90),
    new THREE.Vector3(-40, 1.2, -40), new THREE.Vector3(70, 1.2, 70)
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
    <div className="w-full h-full">
      <Canvas shadows camera={{ fov: 75 }}>
        <color attach="background" args={['#000']} />
        <fog attach="fog" args={['#000', 0, 42]} />
        <Suspense fallback={null}>
          <ambientLight intensity={0.02} />
          <Stars radius={150} depth={70} count={6000} factor={5} saturation={0} fade speed={0.3} />
          <Forest onCollectPage={handlePageCollect} />
          <Controller {...props} activePagePositions={activeVecs} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default GameScene;
