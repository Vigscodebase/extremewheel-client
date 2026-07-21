import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { OrbitControls as ThreeOrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// A minimal, dependency-free stand-in for drei's <OrbitControls>. Built
// directly on three.js's own official addon module (`three/examples/jsm`,
// which the `three` package exposes as a proper subpath export) instead
// of going through @react-three/drei -> three-stdlib, whose barrel file
// pulls in dozens of unrelated loaders/exporters that can't be tree-shaken
// out (three-stdlib's package.json only exposes its root entry point).
//
// The controls instance is a mutable, stateful three.js class — an
// imperative escape hatch, not a derivable React value — so it's held in
// a ref (created once) rather than useMemo, which is reserved for pure
// values.
export default function OrbitControlsLite({
  target = [0, 0, 0],
  autoRotate = false,
  autoRotateSpeed = 2,
  enableDamping = true,
  dampingFactor = 0.08,
  enableZoom = false,
  enablePan = false,
  enableRotate = true,
  minPolarAngle = 0,
  maxPolarAngle = Math.PI,
  minDistance = 0,
  maxDistance = Infinity,
}) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const set = useThree((s) => s.set);
  const get = useThree((s) => s.get);

  const controlsRef = useRef(null);
  if (controlsRef.current === null) {
    controlsRef.current = new ThreeOrbitControls(camera, gl.domElement);
  }

  const targetKey = target.join(",");

  useEffect(() => {
    const controls = controlsRef.current;
    controls.target.set(target[0], target[1], target[2]);
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = autoRotateSpeed;
    controls.enableDamping = enableDamping;
    controls.dampingFactor = dampingFactor;
    controls.enableZoom = enableZoom;
    controls.enablePan = enablePan;
    controls.enableRotate = enableRotate;
    controls.minPolarAngle = minPolarAngle;
    controls.maxPolarAngle = maxPolarAngle;
    controls.minDistance = minDistance;
    controls.maxDistance = maxDistance;
    controls.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey, autoRotate, autoRotateSpeed, enableDamping, dampingFactor, enableZoom, enablePan, enableRotate, minPolarAngle, maxPolarAngle, minDistance, maxDistance]);

  useEffect(() => {
    const controls = controlsRef.current;
    const prevControls = get().controls;
    set({ controls });
    return () => {
      controls.dispose();
      set({ controls: prevControls });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(() => {
    const controls = controlsRef.current;
    if (controls.enabled) controls.update();
  });

  return null;
}
