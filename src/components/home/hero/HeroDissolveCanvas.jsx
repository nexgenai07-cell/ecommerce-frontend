// ============================================================
// HeroDissolveCanvas - COMPONENT
// ============================================================
// Full size WebGL canvas that paints the silver scroll-dissolve
// transition behind the hero content. It receives the artwork canvases
// of every category plus the scroll progress of the hero, and redraws
// (at most once per animation frame) whenever the progress changes.

import { useCallback, useEffect, useRef } from "react"; // React hooks used below
import { useMotionValueEvent } from "framer-motion"; // Subscribes to scroll progress changes
import { createDissolveRenderer } from "../../../utils/dissolveRenderer"; // WebGL shader renderer
import { resolveHeroFrame } from "../../../utils/heroScrollMap"; // Scroll progress -> hero frame state

// Props:
//   backdrops - array of artwork canvases, one per category
//   progress  - framer-motion value holding overall hero scroll progress (0 to 1)
//   count     - number of categories currently presented
const HeroDissolveCanvas = ({ backdrops, progress, count }) => {
  // Reference to the canvas DOM element that WebGL draws into.
  const canvasRef = useRef(null);

  // Reference to the active renderer instance (null when WebGL is unavailable).
  const rendererRef = useRef(null);

  // Id of the pending animation frame request, 0 when none is pending.
  const frameRequestRef = useRef(0);

  // Always holds the latest artwork list and category count so the
  // stable draw function below never reads stale props.
  const latestRef = useRef({ backdrops, count });

  // Keep the latest props available to the draw function.
  useEffect(() => {
    latestRef.current = { backdrops, count };
  }, [backdrops, count]);

  // Paints one frame using the current scroll progress.
  const draw = useCallback(() => {
    const renderer = rendererRef.current; // Active renderer, if any
    const canvas = canvasRef.current; // Target canvas element
    if (!renderer || !canvas) return; // Nothing to draw with

    const { backdrops: artworks, count: total } = latestRef.current; // Latest props
    if (!artworks.length || total <= 0) return; // No artwork prepared yet

    // Resolve which artwork pair is on screen and how dissolved it is.
    const frame = resolveHeroFrame(progress.get(), total);
    const frontArt = artworks[frame.segment]; // Layer that dissolves away
    const backArt = artworks[Math.min(frame.segment + 1, total - 1)]; // Layer revealed beneath
    if (!frontArt || !backArt) return; // Artwork missing, skip this frame

    // Match the drawing buffer to the displayed size (1 buffer pixel per CSS pixel).
    renderer.resize(
      Math.max(1, Math.round(canvas.clientWidth)),
      Math.max(1, Math.round(canvas.clientHeight)),
    );

    // Draw the frame with the resolved dissolve progress.
    renderer.render(frontArt, backArt, frame.dissolve);
  }, [progress]);

  // Coalesces many rapid change events into a single draw per frame.
  const scheduleDraw = useCallback(() => {
    if (frameRequestRef.current) return; // A draw is already queued
    frameRequestRef.current = requestAnimationFrame(() => {
      frameRequestRef.current = 0; // Allow the next request
      draw(); // Paint the frame
    });
  }, [draw]);

  // Create the renderer, watch the canvas size and survive GPU context loss.
  useEffect(() => {
    const canvas = canvasRef.current; // Canvas element to render into
    if (!canvas) return undefined; // Element not mounted

    // Builds a fresh renderer for the canvas.
    const setupRenderer = () => {
      rendererRef.current = createDissolveRenderer(canvas); // Null if WebGL is missing
      scheduleDraw(); // Paint the first frame
    };

    // When the browser drops the GPU context, stop drawing until it returns.
    const handleContextLost = (event) => {
      event.preventDefault(); // Signals that we want the context restored
      rendererRef.current = null; // Old GPU resources are gone
    };

    // When the context is restored, rebuild everything from scratch.
    const handleContextRestored = () => {
      setupRenderer();
    };

    canvas.addEventListener("webglcontextlost", handleContextLost); // Listen for loss
    canvas.addEventListener("webglcontextrestored", handleContextRestored); // Listen for restore
    setupRenderer(); // Initial renderer creation

    // Redraw whenever the canvas is resized (window resize, rotation, etc).
    const resizeObserver = new ResizeObserver(() => scheduleDraw());
    resizeObserver.observe(canvas);

    // Cleanup on unmount.
    return () => {
      resizeObserver.disconnect(); // Stop watching size changes
      canvas.removeEventListener("webglcontextlost", handleContextLost); // Remove listener
      canvas.removeEventListener("webglcontextrestored", handleContextRestored); // Remove listener
      cancelAnimationFrame(frameRequestRef.current); // Cancel any queued frame
      frameRequestRef.current = 0; // Reset the pending marker
      if (rendererRef.current) rendererRef.current.destroy(); // Free GPU resources
      rendererRef.current = null; // Drop the reference
    };
  }, [scheduleDraw]);

  // Redraw as soon as new artwork or a different category count arrives.
  useEffect(() => {
    scheduleDraw();
  }, [backdrops, count, scheduleDraw]);

  // Redraw on every scroll progress change.
  useMotionValueEvent(progress, "change", scheduleDraw);

  // The canvas itself; sizing and layering come from the index.css class.
  return <canvas ref={canvasRef} className="hero-canvas" aria-hidden="true" />;
};

export default HeroDissolveCanvas; // Make the component available to HeroSection
