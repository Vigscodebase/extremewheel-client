import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import GroundShadow from "./GroundShadow";
import OrbitControlsLite from "./OrbitControlsLite";
import { getTireTextures } from "./textures";
import { tireDiameterInches, tireWidthInches } from "../../utils/tireMath";

// NOTE: no @react-three/drei import here at all. Both its <OrbitControls>
// and <ContactShadows> internally import from `three-stdlib`, whose
// package.json only exposes a single root entry point (no deep-import
// subpaths), which forces bundlers to pull in three-stdlib's entire
// barrel — dozens of unrelated loaders/exporters — just to get an orbit
// controller. OrbitControlsLite/GroundShadow below get an equivalent
// result from three.js's own lightweight addon + a tiny procedural
// texture, at a fraction of the bundle cost.

const WORLD_SCALE = 0.11; // world units per inch — keeps the model ~2.5-3.5 units across

// The wheel is modeled with its axle along local Z (torus "hole" normal).
// Standing it up so the axle runs along world X — like a real wheel bolted
// to an axle — keeps the object's own orientation canonical/neutral; the
// "3/4, slightly right" default look then comes purely from where the
// camera starts (see TireCanvas camera prop below), so dragging back to
// center always shows a sensible straight-on view rather than an
// arbitrary baked-in yaw.
const AXLE_ROTATION = [0, Math.PI / 2, 0];

function TireWheel({ tire, accent = "#FF6F91", spokeCount = 5 }) {
  const { colorMap, roughnessMap, metalRoughnessMap } = getTireTextures();

  // Recomputes any time width/aspect/rim (or anything derived from them,
  // like overall diameter/circumference) changes — this is what makes the
  // model live-reactive to the calculator/comparison inputs.
  const dims = useMemo(() => {
    const diameterIn = tireDiameterInches(tire);
    const widthIn = tireWidthInches(tire);
    const rimIn = Number(tire.rim) || 15;

    const outerR = (diameterIn / 2) * WORLD_SCALE;
    const innerR = (rimIn / 2) * WORLD_SCALE;
    const mainRadius = (outerR + innerR) / 2;
    const tubeRadius = Math.max((outerR - innerR) / 2, 0.05);
    const widthWorld = Math.max(widthIn * WORLD_SCALE, tubeRadius * 0.6);
    const widthScale = widthWorld / (2 * tubeRadius);

    return { outerR, innerR, mainRadius, tubeRadius, widthWorld, widthScale };
  }, [tire]);

  // Geometry constructor args, memoized so three.js only rebuilds a mesh's
  // BufferGeometry when the numbers backing it actually changed.
  const torusArgs = useMemo(() => [dims.mainRadius, dims.tubeRadius, 28, 90], [dims.mainRadius, dims.tubeRadius]);
  const barrelArgs = useMemo(
    () => [dims.innerR * 0.99, dims.innerR * 0.99, dims.widthWorld * 0.86, 40, 1, true],
    [dims.innerR, dims.widthWorld]
  );
  const discArgs = useMemo(() => [dims.innerR * 0.99, 40], [dims.innerR]);
  const hubArgs = useMemo(
    () => [dims.innerR * 0.26, dims.innerR * 0.26, dims.widthWorld * 0.08, 32],
    [dims.innerR, dims.widthWorld]
  );
  const spokeArgs = useMemo(
    () => [dims.innerR * 0.9, dims.innerR * 0.16, dims.widthWorld * 0.05],
    [dims.innerR, dims.widthWorld]
  );

  const spokes = useMemo(() => Array.from({ length: spokeCount }, (_, i) => (i / spokeCount) * Math.PI * 2), [spokeCount]);

  return (
    <group rotation={AXLE_ROTATION}>
      {/* Tire — dark rubber torus, non-uniformly scaled along the axle (Z)
          so overall diameter (radial) and tread width (axial) are both
          driven independently by the real tire spec. */}
      <mesh scale={[1, 1, dims.widthScale]} castShadow receiveShadow>
        <torusGeometry args={torusArgs} />
        <meshPhysicalMaterial
          map={colorMap}
          roughnessMap={roughnessMap}
          roughness={0.95}
          metalness={0}
          clearcoat={0.12}
          clearcoatRoughness={0.7}
          color="#3a3a3f"
        />
      </mesh>

      {/* Rim barrel */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={barrelArgs} />
        <meshStandardMaterial
          color="#c7cad2"
          metalness={1}
          roughness={0.3}
          roughnessMap={metalRoughnessMap}
          envMapIntensity={1.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Rear disc so the barrel doesn't look hollow from the back */}
      <mesh position={[0, 0, -dims.widthWorld * 0.43]}>
        <circleGeometry args={discArgs} />
        <meshStandardMaterial color="#111114" metalness={0.4} roughness={0.6} />
      </mesh>

      {/* Spokes + hub, front face */}
      <group position={[0, 0, dims.widthWorld * 0.4]}>
        {spokes.map((angle, i) => (
          <mesh key={i} rotation={[0, 0, angle]} position={[Math.cos(angle) * dims.innerR * 0.42, Math.sin(angle) * dims.innerR * 0.42, 0]} castShadow>
            <boxGeometry args={spokeArgs} />
            <meshStandardMaterial color="#d7dae1" metalness={1} roughness={0.26} envMapIntensity={1.1} />
          </mesh>
        ))}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={hubArgs} />
          <meshStandardMaterial color={accent} metalness={0.75} roughness={0.35} />
        </mesh>
      </group>
    </group>
  );
}

// Hand-rolled studio rig (core three.js lights only — no drei Environment):
// a bright key light, a cool fill from the opposite side, a soft rim/back
// light to separate the tire from the background, plus ambient +
// hemisphere fill so the dark rubber never reads as a flat silhouette.
function StudioLighting() {
  return (
    <>
      <hemisphereLight args={["#f5f6fa", "#3a3a3f", 0.55]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[3.2, 4.5, 3]} intensity={1.6} castShadow shadow-mapSize={[512, 512]} />
      <directionalLight position={[-3.5, 2, -2]} intensity={0.5} color="#dfe6ff" />
      <pointLight position={[0, -1.5, 2.5]} intensity={0.35} color="#ffffff" />
      <GroundShadow />
    </>
  );
}

export default function TireCanvas({
  tire,
  accent = "#FF6F91",
  interactive = true,
  zoomable = false,
  autoRotate = true,
  onContextLost,
}) {
  const glRef = useRef(null);

  useEffect(() => {
    const dom = glRef.current;
    if (!dom || !onContextLost) return undefined;
    dom.addEventListener("webglcontextlost", onContextLost);
    return () => dom.removeEventListener("webglcontextlost", onContextLost);
  }, [onContextLost]);

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance", failIfMajorPerformanceCaveat: false }}
      /* Pulled back further on X, Y, and Z, and widened FOV to completely clear the top/bottom cuts */
      camera={{ position: [3.5, 1.5, 6.0], fov: 40 }}
      className="tire3d-canvas-fill"
      onCreated={({ gl }) => { glRef.current = gl.domElement; }}
    >
      <StudioLighting />
      <TireWheel tire={tire} accent={accent} />
      <OrbitControlsLite
        target={[0, 0, 0]}
        autoRotate={autoRotate}
        autoRotateSpeed={1.8}
        enableDamping
        dampingFactor={0.08}
        enableZoom={zoomable}
        enablePan={false}
        enableRotate={interactive}
        minPolarAngle={Math.PI * 0.12}
        maxPolarAngle={Math.PI * 0.88}
        /* Adjusted zoom limits for the new camera distance */
        minDistance={3.0}
        maxDistance={10.0}
      />
    </Canvas>
  );
}
