import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
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
// camera starts (see CAMERA_DIRECTION below), so dragging back to center
// always shows a sensible straight-on view rather than an arbitrary
// baked-in yaw.
const AXLE_ROTATION = [0, Math.PI / 2, 0];

// Pure geometry — same numbers TireWheel used to compute internally via its
// own useMemo, now lifted up so TireCanvas can also use them to fit the
// camera to each specific tire (see CameraFit below) instead of every tire
// sharing one fixed camera distance regardless of size.
function computeTireDims(tire) {
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
}

function TireWheel({ dims, accent = "#FF6F91", spokeCount = 5 }) {
  const { colorMap, roughnessMap, metalRoughnessMap } = getTireTextures();

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
          metalness={0.88}
          roughness={0.32}
          roughnessMap={metalRoughnessMap}
          envMapIntensity={1.35}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Rear disc so the barrel doesn't look hollow from the back — lightened
          and given a touch of metalness/env reflection so it doesn't read as
          a flat black hole when rotated away from the key light */}
      <mesh position={[0, 0, -dims.widthWorld * 0.43]}>
        <circleGeometry args={discArgs} />
        <meshStandardMaterial color="#2b2c33" metalness={0.5} roughness={0.55} envMapIntensity={0.9} />
      </mesh>

      {/* Spokes + hub, front face */}
      <group position={[0, 0, dims.widthWorld * 0.4]}>
        {spokes.map((angle, i) => (
          <mesh key={i} rotation={[0, 0, angle]} position={[Math.cos(angle) * dims.innerR * 0.42, Math.sin(angle) * dims.innerR * 0.42, 0]} castShadow>
            <boxGeometry args={spokeArgs} />
            <meshStandardMaterial color="#d7dae1" metalness={0.88} roughness={0.28} envMapIntensity={1.35} />
          </mesh>
        ))}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={hubArgs} />
          <meshStandardMaterial color={accent} metalness={0.7} roughness={0.35} envMapIntensity={1.1} />
        </mesh>
      </group>
    </group>
  );
}

// Hand-rolled studio rig (core three.js lights only — no drei Environment):
// a bright key light, a cool fill from the opposite side, a soft rim/back
// light to separate the tire from the background, plus ambient +
// hemisphere fill so the dark rubber never reads as a flat silhouette.
function StudioLighting({ dims }) {
  // Shadow blob scaled/repositioned to each tire's actual radius, instead
  // of GroundShadow's fixed defaults (radius 1.7, y -1.05) — those were
  // tuned for one particular tire size and left every other size either
  // floating above a shadow that's too far below it (big tires) or sitting
  // in a shadow visibly larger than the tire itself (small tires).
  const shadowRadius = dims.outerR * 1.35;
  const shadowY = -dims.outerR - 0.04;

  return (
    <>
      <hemisphereLight args={["#f5f6fa", "#3a3a3f", 0.6]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[3.2, 4.5, 3]} intensity={1.6} castShadow shadow-mapSize={[512, 512]} />
      <directionalLight position={[-3.5, 2, -2]} intensity={0.6} color="#dfe6ff" />
      <pointLight position={[0, -1.5, 2.5]} intensity={0.35} color="#ffffff" />
      <pointLight position={[-2, 0.5, -3]} intensity={0.3} color="#eef1ff" />
      <GroundShadow radius={shadowRadius} y={shadowY} />
    </>
  );
}

// The rim/spokes/hub use metalness-heavy materials, which take almost all
// of their shading from reflected environment light rather than direct
// lights — with no environment map at all, any face not squarely hit by a
// directional light renders as flat black regardless of how bright the
// scene lights are. This builds a small neutral studio-room environment
// (via PMREMGenerator, three's own tool — no drei needed) once per canvas
// and assigns it as `scene.environment`, so the whole rim reads as
// polished metal from every angle instead of going black in the shadowed
// side.
function applyStudioEnvironment(gl, scene) {
  const pmremGenerator = new THREE.PMREMGenerator(gl);
  pmremGenerator.compileEquirectangularShader();
  const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.035).texture;
  scene.environment = envTexture;
  pmremGenerator.dispose();
  return envTexture;
}

// Normalized direction of the original fixed camera position [3.5, 1.5, 6.0]
// — keeps the exact same "3/4, slightly right, slightly above" viewing
// angle; only the DISTANCE along that direction now varies per tire (see
// fitCameraDistance below) instead of being fixed.
const CAMERA_MAGNITUDE = Math.sqrt(3.5 * 3.5 + 1.5 * 1.5 + 6.0 * 6.0);
const CAMERA_DIRECTION = [3.5 / CAMERA_MAGNITUDE, 1.5 / CAMERA_MAGNITUDE, 6.0 / CAMERA_MAGNITUDE];

const VERTICAL_FOV_DEG = 40;
const HALF_FOV_RAD = (VERTICAL_FOV_DEG / 2) * (Math.PI / 180);
// Fraction of the half-FOV the tire's bounding radius should fill at rest —
// e.g. 0.62 leaves ~38% margin on every side at every rotation, for both
// the smallest and the largest tire in the catalog alike, rather than one
// fixed distance that was only really calibrated for the biggest one (see
// the git history on this file — the previous fixed [3.5,1.5,6.0]/fov 40
// was "pulled back further... to completely clear top/bottom cuts" for
// large tires, which is exactly why small tires like a 21" 155/80R12
// rendered tiny and adrift in the middle of the frame).
const FRAME_FILL_RATIO = 0.62;

function fitCameraDistance(dims) {
  // sqrt, not a straight max — accounts for the tire's width extent (half
  // of widthWorld) as well as its radius, so nothing pokes past the frame
  // edge when the person drags to an edge-on view, not just the default angle.
  const boundingRadius = Math.sqrt(dims.outerR * dims.outerR + (dims.widthWorld / 2) * (dims.widthWorld / 2));
  return boundingRadius / Math.tan(FRAME_FILL_RATIO * HALF_FOV_RAD);
}

// Rendered inside <Canvas>: <Canvas camera={...}> only applies once, at
// construction, so it can't react to `tire` changing later on its own (the
// same canvas is reused, live, as width/aspect/rim change on the
// Calculator/Comparison/Plus Size pages — see the "live-reactive" note that
// used to sit on TireWheel's dims memo). This re-applies the fitted
// distance — along the same fixed viewing direction/angle — any time the
// tire's size actually changes. Safe to set camera.position imperatively
// here: three.js's OrbitControls re-derives its own internal spherical
// state from the camera's actual position on every update() call (see
// OrbitControlsLite), so it picks up the new distance cleanly next frame
// rather than fighting it.
function CameraFit({ distance }) {
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    camera.position.set(
      CAMERA_DIRECTION[0] * distance,
      CAMERA_DIRECTION[1] * distance,
      CAMERA_DIRECTION[2] * distance
    );
    camera.updateProjectionMatrix();
  }, [camera, distance]);

  return null;
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
  const envTextureRef = useRef(null);

  // Recomputes any time width/aspect/rim (or anything derived from them,
  // like overall diameter/circumference) changes — this is what makes the
  // model (and now the camera framing too) live-reactive to the
  // calculator/comparison inputs.
  const dims = useMemo(() => computeTireDims(tire), [tire]);
  const cameraDistance = useMemo(() => fitCameraDistance(dims), [dims]);

  // Initial camera position for the very first paint — before CameraFit's
  // effect has run — computed from the same fit so there's no flash of the
  // wrong framing on mount. React-three-fiber only reads this once (at
  // <Canvas> construction), which is exactly why CameraFit exists above to
  // keep it correct afterward as `tire` changes.
  const initialCameraPosition = useMemo(
    () => [
      CAMERA_DIRECTION[0] * cameraDistance,
      CAMERA_DIRECTION[1] * cameraDistance,
      CAMERA_DIRECTION[2] * cameraDistance,
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    const dom = glRef.current;
    if (!dom || !onContextLost) return undefined;
    dom.addEventListener("webglcontextlost", onContextLost);
    return () => dom.removeEventListener("webglcontextlost", onContextLost);
  }, [onContextLost]);

  useEffect(() => {
    return () => {
      envTextureRef.current?.dispose();
    };
  }, []);

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{
        antialias: true,
        alpha: true,
        premultipliedAlpha: false,
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: false,
      }}
      camera={{ position: initialCameraPosition, fov: VERTICAL_FOV_DEG }}
      className="tire3d-canvas-fill"
      onCreated={({ gl, scene }) => {
        glRef.current = gl.domElement;
        // `alpha: true` above only requests a transparent-*capable* WebGL
        // context — it doesn't guarantee three.js's own clear color is
        // actually transparent. That's a separate, renderer-level setting,
        // and on some GPU/driver combinations the FIRST WebGL context
        // created on a page initializes with an opaque black clear color
        // regardless of the `alpha` flag, while later contexts (e.g. a
        // second <TireCanvas> mounted right next to it, as on the Plus
        // Size and Comparison pages) don't hit the same quirk — which is
        // exactly the "one preview has a black box, the other doesn't"
        // split seen with two side-by-side previews. Setting the clear
        // color explicitly, rather than relying on the context flag alone,
        // makes every canvas transparent the same way regardless of mount
        // order.
        gl.setClearColor(0x000000, 0);
        envTextureRef.current = applyStudioEnvironment(gl, scene);
      }}
    >
      <CameraFit distance={cameraDistance} />
      <StudioLighting dims={dims} />
      <TireWheel dims={dims} accent={accent} />
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
        /* Zoom range now scales with the fitted distance instead of a fixed
           [3.0, 10.0] tuned for one tire size — otherwise a big tire's
           fitted distance (further out) could get silently clamped back
           down to the old fixed maxDistance the instant OrbitControls next
           updates, undoing the fit. The 0.66 floor (not something looser
           like 0.5) is load-bearing, not arbitrary: FRAME_FILL_RATIO
           already puts the object at 12.4° of the 20° half-FOV by default,
           and 1/0.66 ≈ 1.5x that gets to ~18.5° at max zoom-in — under the
           20° half-FOV with a couple degrees to spare. A looser floor here
           would let zooming all the way in clip the tire against the frame
           edge, which is the exact bug being fixed on the OE preview. */
        minDistance={cameraDistance * 0.66}
        maxDistance={cameraDistance * 1.8}
      />
    </Canvas>
  );
}
