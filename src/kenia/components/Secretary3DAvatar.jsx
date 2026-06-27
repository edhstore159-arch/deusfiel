import { Suspense, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

/**
 * Secretary3DAvatar
 * Stylized real-time 3D secretary bust built with R3F primitives (no external GLB
 * needed). Idle breathing, natural blink, mouth lip-sync driven by the
 * SpeechSynthesis boundary events, soft look-at-cursor, click reaction.
 */

function Bust({ state, mouthOpenRef }) {
  const group = useRef();
  const head = useRef();
  const eyeL = useRef();
  const eyeR = useRef();
  const mouth = useRef();
  const lookTarget = useRef(new THREE.Vector2(0, 0));
  const blinkRef = useRef(1);
  const nextBlink = useRef(performance.now() + 2000 + Math.random() * 2500);

  useEffect(() => {
    const onMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      lookTarget.current.set(x * 0.25, -y * 0.2);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((_, dt) => {
    const t = performance.now() / 1000;
    if (group.current) {
      group.current.position.y = -0.05 + Math.sin(t * 1.6) * 0.012;
      group.current.rotation.z = Math.sin(t * 0.8) * 0.015;
    }
    if (head.current) {
      head.current.rotation.y = THREE.MathUtils.damp(
        head.current.rotation.y,
        lookTarget.current.x,
        4,
        dt
      );
      head.current.rotation.x = THREE.MathUtils.damp(
        head.current.rotation.x,
        lookTarget.current.y,
        4,
        dt
      );
    }
    // Blink
    if (performance.now() > nextBlink.current) {
      blinkRef.current = Math.max(0.05, blinkRef.current - dt * 12);
      if (blinkRef.current <= 0.06) {
        nextBlink.current = performance.now() + 2500 + Math.random() * 3000;
        blinkRef.current = 1;
      }
    }
    const sy = blinkRef.current;
    if (eyeL.current) eyeL.current.scale.y = sy;
    if (eyeR.current) eyeR.current.scale.y = sy;

    // Mouth lip-sync (driven externally via mouthOpenRef)
    const target = state === "speaking" ? mouthOpenRef.current : 0;
    if (mouth.current) {
      mouth.current.scale.y = THREE.MathUtils.damp(mouth.current.scale.y, 0.15 + target * 1.6, 14, dt);
    }
  });

  const skin = "#f1c8a5";
  const hair = "#3a2218";
  const blouse = "#f4e6d4";
  const lips = "#c6736b";

  return (
    <group ref={group} position={[0, -0.2, 0]}>
      {/* Torso / blouse */}
      <mesh position={[0, -1.05, 0]} castShadow>
        <coneGeometry args={[0.95, 1.4, 32]} />
        <meshStandardMaterial color={blouse} roughness={0.7} metalness={0.05} />
      </mesh>
      {/* Neck */}
      <mesh position={[0, -0.35, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.3, 24]} />
        <meshStandardMaterial color={skin} roughness={0.55} />
      </mesh>
      {/* Head group */}
      <group ref={head} position={[0, 0.05, 0]}>
        {/* Skull */}
        <mesh castShadow>
          <sphereGeometry args={[0.46, 48, 48]} />
          <meshStandardMaterial color={skin} roughness={0.45} metalness={0.02} />
        </mesh>
        {/* Hair back */}
        <mesh position={[0, 0.05, -0.05]}>
          <sphereGeometry args={[0.5, 48, 48, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
          <meshStandardMaterial color={hair} roughness={0.6} />
        </mesh>
        {/* Hair side curls */}
        <mesh position={[-0.32, -0.15, 0.05]} rotation={[0, 0, 0.3]}>
          <sphereGeometry args={[0.22, 24, 24]} />
          <meshStandardMaterial color={hair} roughness={0.6} />
        </mesh>
        <mesh position={[0.32, -0.15, 0.05]} rotation={[0, 0, -0.3]}>
          <sphereGeometry args={[0.22, 24, 24]} />
          <meshStandardMaterial color={hair} roughness={0.6} />
        </mesh>
        {/* Eyes */}
        <group ref={eyeL} position={[-0.14, 0.05, 0.4]}>
          <mesh>
            <sphereGeometry args={[0.055, 24, 24]} />
            <meshStandardMaterial color="#ffffff" roughness={0.2} />
          </mesh>
          <mesh position={[0, 0, 0.045]}>
            <sphereGeometry args={[0.025, 16, 16]} />
            <meshStandardMaterial color="#3b2a1a" />
          </mesh>
        </group>
        <group ref={eyeR} position={[0.14, 0.05, 0.4]}>
          <mesh>
            <sphereGeometry args={[0.055, 24, 24]} />
            <meshStandardMaterial color="#ffffff" roughness={0.2} />
          </mesh>
          <mesh position={[0, 0, 0.045]}>
            <sphereGeometry args={[0.025, 16, 16]} />
            <meshStandardMaterial color="#3b2a1a" />
          </mesh>
        </group>
        {/* Brows */}
        <mesh position={[-0.14, 0.16, 0.42]} rotation={[0, 0, 0.05]}>
          <boxGeometry args={[0.1, 0.018, 0.02]} />
          <meshStandardMaterial color={hair} />
        </mesh>
        <mesh position={[0.14, 0.16, 0.42]} rotation={[0, 0, -0.05]}>
          <boxGeometry args={[0.1, 0.018, 0.02]} />
          <meshStandardMaterial color={hair} />
        </mesh>
        {/* Nose */}
        <mesh position={[0, -0.04, 0.45]}>
          <coneGeometry args={[0.045, 0.13, 12]} />
          <meshStandardMaterial color={skin} roughness={0.5} />
        </mesh>
        {/* Mouth */}
        <mesh ref={mouth} position={[0, -0.2, 0.42]}>
          <sphereGeometry args={[0.075, 24, 16]} />
          <meshStandardMaterial color={lips} roughness={0.35} />
        </mesh>
        {/* Earrings */}
        <mesh position={[-0.44, -0.05, 0.05]}>
          <sphereGeometry args={[0.025, 16, 16]} />
          <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0.44, -0.05, 0.05]}>
          <sphereGeometry args={[0.025, 16, 16]} />
          <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
}

export default function Secretary3DAvatar({ state, mouthOpenRef, onClick, onHover }) {
  const [glow, setGlow] = useState(false);
  return (
    <div
      className={`relative h-32 w-32 rounded-full overflow-hidden cursor-pointer transition-shadow ${
        state === "speaking" || glow
          ? "shadow-[0_0_30px_rgba(212,175,55,0.7)] ring-2 ring-amber-300"
          : "shadow-[0_8px_24px_rgba(212,175,55,0.35)] ring-2 ring-amber-200"
      } bg-gradient-to-b from-amber-50 to-rose-50`}
      onClick={onClick}
      onPointerEnter={() => { setGlow(true); onHover?.(); }}
      onPointerLeave={() => setGlow(false)}
      role="button"
      aria-label="Assistente virtual 3D Kênia"
    >
      <Canvas
        dpr={[1, 1.8]}
        camera={{ position: [0, 0.1, 1.9], fov: 32 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 3, 4]} intensity={1.1} castShadow />
        <directionalLight position={[-2, 1, 2]} intensity={0.35} color="#ffd9a8" />
        <Suspense fallback={null}>
          <Bust state={state} mouthOpenRef={mouthOpenRef} />
          <Environment preset="apartment" />
        </Suspense>
        <ContactShadows position={[0, -1.4, 0]} opacity={0.35} blur={2.4} far={3} />
      </Canvas>
      {state === "alerting" && (
        <span className="absolute top-1 right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white ring-2 ring-white animate-bounce">
          !
        </span>
      )}
    </div>
  );
}
