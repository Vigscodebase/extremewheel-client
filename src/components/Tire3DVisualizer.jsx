import { CircleOff } from "lucide-react";
import { Suspense, lazy, useState } from "react";
import Tire3DErrorBoundary from "./tire3d/Tire3DErrorBoundary";
import { isWebGLAvailable } from "../utils/webgl";

const TireCanvas = lazy(() => import("./tire3d/TireCanvas"));

function UnavailableFallback({ tire }) {
  return (
    <div className="tire3d-fallback">
      <CircleOff size={22} />
      <p className="tire3d-fallback-title">3D preview unavailable</p>
      <p className="tire3d-fallback-hint">
        {tire?.width && tire?.rim ? `${tire.width}/${tire.aspect}R${tire.rim} — ` : ""}
        This browser session can't create a WebGL context. Try a standard browser window
        (not an embedded preview) with hardware acceleration enabled.
      </p>
    </div>
  );
}

/**
 * Realistic (photoreal-leaning, not illustrative) 3D tire + wheel preview,
 * proportioned live from real tire spec (width/aspect/rim — circumference,
 * overall diameter etc. all derive from these, so any of those changing
 * feeds straight back into the 3D geometry). Renders lazily — three.js /
 * @react-three/fiber / drei are only fetched the first time a page
 * actually mounts this component.
 *
 * Degrades gracefully to a text fallback when WebGL genuinely isn't
 * available in the current browser session (checked up front, and again
 * via an error boundary + context-loss listener as defense-in-depth) —
 * rather than throwing an uncaught error and breaking the page.
 *
 * Props:
 *  - tire: { width, aspect, rim } (required)
 *  - label: caption under the canvas
 *  - accent: hub/spoke accent color, used to tell multiple tires apart
 *  - height: canvas height in px, or any CSS length ("100%" etc.) (default 260)
 *  - interactive: allow drag-to-rotate so the user can confirm it's a real
 *    3D object from any angle (default true)
 *  - zoomable: allow scroll-wheel zoom. Off by default for visualizers that
 *    sit inline in normal page flow, so hovering one doesn't hijack page
 *    scroll — turn on inside modals/dedicated viewers where that's safe.
 *  - autoRotate: slow showroom spin (default true)
 *  - variant: per-page layout/sizing hook ("dashboard" | "compare" |
 *    "calculator" | "option-preview" | "plus-size" | undefined). Each page
 *    embeds this visualizer in a different layout, so instead of one global
 *    look, `variant` selects a dedicated `.tire3d-canvas-box--<variant>`
 *    rule in global.css (max-width, aspect handling, etc.) for that page.
 */
export default function Tire3DVisualizer({
  tire,
  label,
  accent = "#FF6F91",
  height = 260,
  interactive = true,
  zoomable = false,
  autoRotate = true,
  variant,
}) {
  const [webglLost, setWebglLost] = useState(false);
  const [webglOk] = useState(isWebGLAvailable);

  if (!tire || !tire.width || !tire.rim) return null;

  const fallback = <UnavailableFallback tire={tire} />;
  const heightVar = typeof height === "number" ? `${height}px` : height;
  const boxClassName = `tire3d-canvas-box${variant ? ` tire3d-canvas-box--${variant}` : ""}`;

  return (
    <div className={`tire3d-wrap${variant ? ` tire3d-wrap--${variant}` : ""}`}>
      <div className={boxClassName} style={{ "--tire3d-height": heightVar }}>
        {webglOk && !webglLost ? (
          <Tire3DErrorBoundary fallback={fallback}>
            <Suspense fallback={<div className="tire3d-skeleton" style={{ "--tire3d-height": heightVar }} />}>
              <TireCanvas
                tire={tire}
                accent={accent}
                interactive={interactive}
                zoomable={zoomable}
                autoRotate={autoRotate}
                onContextLost={() => setWebglLost(true)}
              />
            </Suspense>
          </Tire3DErrorBoundary>
        ) : (
          fallback
        )}
      </div>
      {label && <p className="tire3d-label">{label}</p>}
    </div>
  );
}
