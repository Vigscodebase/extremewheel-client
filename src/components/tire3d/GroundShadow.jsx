import { useMemo } from "react";
import * as THREE from "three";

let cachedShadowTexture = null;

function getShadowTexture() {
  if (cachedShadowTexture) return cachedShadowTexture;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(10,10,12,0.42)");
  gradient.addColorStop(0.55, "rgba(10,10,12,0.22)");
  gradient.addColorStop(1, "rgba(10,10,12,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  cachedShadowTexture = new THREE.CanvasTexture(canvas);
  return cachedShadowTexture;
}

export default function GroundShadow({ radius = 1.7, y = -1.05 }) {
  const texture = useMemo(() => getShadowTexture(), []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} renderOrder={-1}>
      <planeGeometry args={[radius * 2, radius * 2]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
