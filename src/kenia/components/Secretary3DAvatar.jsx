import { Component, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";

/**
 * Secretary3DAvatar
 * Stylized real-time 3D secretary bust built with R3F primitives (no external GLB
 * needed). Idle breathing, natural blink, mouth lip-sync driven by the
 * SpeechSynthesis boundary events, soft look-at-cursor, click reaction.
 */

class AvatarCanvasBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

function AvatarFallback({ state }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-gold-50 to-nude-50">
      <div className={`relative h-28 w-24 ${state === "speaking" ? "secretary-breathe" : ""}`} aria-hidden="true">
        <div className="absolute left-1/2 top-2 h-20 w-20 -translate-x-1/2 rounded-full bg-gold-100 shadow-inner" />
        <div className="absolute left-1/2 top-0 h-14 w-24 -translate-x-1/2 rounded-t-full bg-nude-900" />
        <div className="absolute left-[26px] top-11 h-2 w-2 rounded-full bg-nude-900" />
        <div className="absolute right-[26px] top-11 h-2 w-2 rounded-full bg-nude-900" />
        <div className={`absolute left-1/2 top-[62px] h-2 w-8 -translate-x-1/2 rounded-full bg-gold-700 transition-transform ${state === "speaking" ? "scale-y-150" : ""}`} />
        <div className="absolute bottom-0 left-1/2 h-14 w-24 -translate-x-1/2 rounded-t-full bg-nude-100 ring-1 ring-gold-200" />
      </div>
    </div>
  );
}

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
      className={`relative h-40 w-40 rounded-full overflow-hidden cursor-pointer transition-shadow sm:h-44 sm:w-44 ${
        state === "speaking" || glow
          ? "shadow-2xl ring-4 ring-gold-300"
          : "shadow-xl ring-4 ring-gold-100"
      } bg-gradient-to-b from-gold-50 to-nude-50`}
      style={{ width: "clamp(9.5rem, 14vw, 11rem)", height: "clamp(9.5rem, 14vw, 11rem)" }}
      onClick={onClick}
      onPointerEnter={() => { setGlow(true); onHover?.(); }}
      onPointerLeave={() => setGlow(false)}
      role="button"
      aria-label="Assistente virtual 3D Kênia"
    >
      <AvatarCanvasBoundary fallback={<AvatarFallback state={state} />}>
        <Canvas
          dpr={[1, 1.8]}
          camera={{ position: [0, 0.05, 2.05], fov: 30 }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          style={{ display: "block", width: "100%", height: "100%" }}
          resize={{ scroll: false, debounce: { scroll: 50, resize: 0 } }}
        >
          <ambientLight intensity={0.75} />
          <directionalLight position={[2, 3, 4]} intensity={1.25} castShadow />
          <directionalLight position={[-2, 1, 2]} intensity={0.45} color="#ffd9a8" />
          <Bust state={state} mouthOpenRef={mouthOpenRef} />
          <ContactShadows position={[0, -1.4, 0]} opacity={0.32} blur={2.2} far={3} />
        </Canvas>
      </AvatarCanvasBoundary>
      {state === "alerting" && (
        <span className="absolute top-2 right-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground ring-2 ring-background animate-bounce">
          !
        </span>
      )}
    </div>
  );
}
