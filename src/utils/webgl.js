// Cheap, cached WebGL capability probe. Chromium environments with the GPU
// process disabled or sandboxed (common inside embedded webviews — VS
// Code's Simple Browser, Electron webviews, some remote/VDI desktop
// sessions — or with hardware acceleration disabled by policy) report
// GL_VENDOR/GL_RENDERER as "Disabled" and fail to create any WebGL
// context. There's nothing app code can do to force a context into
// existence there, so we detect it up front and let callers render a
// graceful fallback instead of letting three.js throw deep inside a
// render commit.
let cachedResult = null;

export function isWebGLAvailable() {
  if (cachedResult !== null) return cachedResult;

  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: false }) ||
      canvas.getContext("webgl", { failIfMajorPerformanceCaveat: false }) ||
      canvas.getContext("experimental-webgl", { failIfMajorPerformanceCaveat: false });
    cachedResult = !!gl;
  } catch {
    cachedResult = false;
  }

  return cachedResult;
}
