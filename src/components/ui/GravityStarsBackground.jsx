// ============================================================
// GravityStarsBackground
// ============================================================
// A decorative, interactive starfield drawn on a canvas.
// Stars drift slowly and glow softly. When the pointer moves
// over the parent section, nearby stars are pulled toward it
// (or pushed away) and their glow intensifies.
//
// Usage requirements:
//   - The parent element must be positioned (`relative`) and
//     should clip its overflow (`overflow-hidden`).
//   - Content that must appear above the stars needs its own
//     `relative` positioning and a higher stacking order.
//
// Behavior notes:
//   - The layer never blocks clicks; pointer events are read
//     from the parent element instead of the canvas.
//   - Star colors are read from the project's theme variables
//     (--color-primary and --color-primary-light).
//   - The animation pauses while the section is off-screen.
//   - Users who prefer reduced motion receive a static starfield.

import { useEffect, useRef } from "react";

import cn from "../../utils/cn"; // Merges Tailwind class names and resolves conflicts

// Fallback colors, used only if a theme variable cannot be read.
const FALLBACK_PRIMARY = "16, 185, 129";
const FALLBACK_PRIMARY_LIGHT = "52, 211, 153";
const SOFT_HIGHLIGHT = "167, 243, 208"; // Pale emerald used for occasional lighter stars

const REFERENCE_AREA = 1280 * 380; // Section size that "starsCount" is calibrated for
const MIN_AREA_SCALE = 0.6; // Smallest star-count multiplier for small sections
const MAX_AREA_SCALE = 1.5; // Largest star-count multiplier for large sections
const MAX_DEVICE_PIXEL_RATIO = 2; // Higher ratios add cost without a visible gain
const SPRITE_SIZE = 64; // Pixel size of the pre-rendered glow sprite
const WRAP_MARGIN = 24; // Distance outside the canvas at which stars wrap around
const IDLE_GLOW = 0.5; // Glow level of a star that is not near the pointer
const ACTIVE_GLOW = 1; // Glow level of a star that is near the pointer

// Returns a random float between min (inclusive) and max (exclusive).
const randomBetween = (min, max) => min + Math.random() * (max - min);

// Converts a "#rgb" or "#rrggbb" string to an "r, g, b" string, or null if invalid.
const hexToRgb = (value) => {
  const hex = value.trim().replace("#", "");
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((char) => char + char)
          .join("")
      : hex;

  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
};

// Reads a color from a CSS variable on the document root.
const readThemeColor = (variableName, fallback) => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(
    variableName,
  );
  return hexToRgb(raw) ?? fallback;
};

// Pre-renders a soft radial glow for one color. Drawing this sprite
// is far cheaper than applying a canvas blur to every star each frame.
const createGlowSprite = (color) => {
  const sprite = document.createElement("canvas");
  sprite.width = SPRITE_SIZE;
  sprite.height = SPRITE_SIZE;

  const spriteContext = sprite.getContext("2d");
  const center = SPRITE_SIZE / 2;
  const gradient = spriteContext.createRadialGradient(
    center,
    center,
    0,
    center,
    center,
    center,
  );
  gradient.addColorStop(0, `rgba(${color}, 1)`);
  gradient.addColorStop(0.2, `rgba(${color}, 0.5)`);
  gradient.addColorStop(0.5, `rgba(${color}, 0.14)`);
  gradient.addColorStop(1, `rgba(${color}, 0)`);

  spriteContext.fillStyle = gradient;
  spriteContext.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
  return sprite;
};

const GravityStarsBackground = ({
  className = "",
  starsCount = 75, // Star count for a section of about 1280x380 px
  starsSize = 2, // Average star diameter in CSS pixels
  starsOpacity = 0.75, // Maximum opacity of a star's core
  glowIntensity = 15, // Maximum extra glow radius in CSS pixels
  glowAnimation = "ease", // "instant" | "ease" | "spring"
  movementSpeed = 0.3, // Idle drift speed, in pixels per frame at 60 fps
  mouseInfluence = 100, // Pointer radius of influence in CSS pixels
  mouseGravity = "attract", // "attract" | "repel"
  gravityStrength = 75, // Strength of the pointer's pull or push
}) => {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return undefined;

    const context = canvas.getContext("2d");
    if (!context) return undefined;

    // Section that receives pointer events on behalf of the canvas.
    const host = wrapper.parentElement;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Star color palette built from the project's theme.
    const primary = readThemeColor("--color-primary", FALLBACK_PRIMARY);
    const primaryLight = readThemeColor(
      "--color-primary-light",
      FALLBACK_PRIMARY_LIGHT,
    );
    const palette = [
      primary,
      primary,
      primaryLight,
      primaryLight,
      SOFT_HIGHLIGHT,
    ];
    const sprites = new Map(
      palette.map((color) => [color, createGlowSprite(color)]),
    );

    const pointer = { x: 0, y: 0, active: false };
    const isAttract = mouseGravity === "attract";
    const idleSpeed = movementSpeed * 60; // Converts pixels per frame to pixels per second

    let width = 0;
    let height = 0;
    let stars = [];
    let rafId = 0;
    let isRunning = false;
    let lastTimestamp = 0;

    // Creates a star at a random position drifting in a random direction.
    const createStar = () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = idleSpeed * randomBetween(0.5, 1.5);
      const baseVx = Math.cos(angle) * speed;
      const baseVy = Math.sin(angle) * speed;

      return {
        x: Math.random() * width,
        y: Math.random() * height,
        baseVx,
        baseVy,
        vx: baseVx,
        vy: baseVy,
        radius: (starsSize * randomBetween(0.6, 1.4)) / 2,
        opacity: starsOpacity * randomBetween(0.7, 1),
        color: palette[Math.floor(Math.random() * palette.length)],
        glow: IDLE_GLOW,
        glowVelocity: 0,
      };
    };

    // Moves a star's glow toward its target using the chosen animation style.
    const updateGlow = (star, target, deltaSeconds) => {
      if (glowAnimation === "instant") {
        star.glow = target;
      } else if (glowAnimation === "spring") {
        const stiffness = 120;
        const damping = 12;
        const acceleration =
          stiffness * (target - star.glow) - damping * star.glowVelocity;
        star.glowVelocity += acceleration * deltaSeconds;
        star.glow += star.glowVelocity * deltaSeconds;
        star.glow = Math.min(Math.max(star.glow, 0), 1.3);
      } else {
        star.glow += (target - star.glow) * Math.min(1, deltaSeconds * 6);
      }
    };

    // Advances every star by one time step.
    const update = (deltaSeconds) => {
      for (const star of stars) {
        let accelerationX = 0;
        let accelerationY = 0;
        let isNearPointer = false;

        if (pointer.active) {
          const dx = pointer.x - star.x;
          const dy = pointer.y - star.y;
          const distance = Math.hypot(dx, dy);

          if (distance < mouseInfluence) {
            isNearPointer = true;
            const falloff = 1 - distance / mouseInfluence;
            const safeDistance = Math.max(distance, 12); // Avoids extreme force at the exact pointer position
            const direction = isAttract ? 1 : -1;
            const strength = gravityStrength * 3 * falloff;

            accelerationX = (dx / safeDistance) * strength * direction;
            accelerationY = (dy / safeDistance) * strength * direction;
          }
        }

        // Velocity eases back to the star's idle drift; damping is stronger near the pointer.
        const relax = Math.min(1, deltaSeconds * (isNearPointer ? 3 : 1.2));
        star.vx +=
          (star.baseVx - star.vx) * relax + accelerationX * deltaSeconds;
        star.vy +=
          (star.baseVy - star.vy) * relax + accelerationY * deltaSeconds;

        star.x += star.vx * deltaSeconds;
        star.y += star.vy * deltaSeconds;

        // Stars leaving one edge re-enter from the opposite edge.
        if (star.x < -WRAP_MARGIN) star.x = width + WRAP_MARGIN;
        else if (star.x > width + WRAP_MARGIN) star.x = -WRAP_MARGIN;
        if (star.y < -WRAP_MARGIN) star.y = height + WRAP_MARGIN;
        else if (star.y > height + WRAP_MARGIN) star.y = -WRAP_MARGIN;

        updateGlow(star, isNearPointer ? ACTIVE_GLOW : IDLE_GLOW, deltaSeconds);
      }
    };

    // Paints the current frame: a soft halo first, then the star core on top.
    const render = () => {
      context.clearRect(0, 0, width, height);

      for (const star of stars) {
        const haloRadius = star.radius + glowIntensity * star.glow;

        context.globalAlpha = Math.min(1, star.opacity * 0.85);
        context.drawImage(
          sprites.get(star.color),
          star.x - haloRadius,
          star.y - haloRadius,
          haloRadius * 2,
          haloRadius * 2,
        );

        context.globalAlpha = star.opacity;
        context.fillStyle = `rgb(${star.color})`;
        context.beginPath();
        context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        context.fill();
      }

      context.globalAlpha = 1;
    };

    // Animation loop; the time step is clamped so returning to a
    // background tab does not cause a large jump.
    const frame = (timestamp) => {
      if (!isRunning) return;

      const deltaSeconds = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
      lastTimestamp = timestamp;

      update(deltaSeconds);
      render();
      rafId = requestAnimationFrame(frame);
    };

    const start = () => {
      if (isRunning || prefersReducedMotion) return;
      isRunning = true;
      lastTimestamp = performance.now();
      rafId = requestAnimationFrame(frame);
    };

    const stop = () => {
      isRunning = false;
      cancelAnimationFrame(rafId);
    };

    // Matches the canvas to its container. Existing stars keep their
    // relative positions, and stars are only added or removed to reach
    // the target count, so resizing never reshuffles the whole sky.
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const previousWidth = width;
      const previousHeight = height;
      width = bounds.width;
      height = bounds.height;
      if (width === 0 || height === 0) return;

      const ratio = Math.min(
        window.devicePixelRatio || 1,
        MAX_DEVICE_PIXEL_RATIO,
      );
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      if (previousWidth > 0 && previousHeight > 0) {
        for (const star of stars) {
          star.x *= width / previousWidth;
          star.y *= height / previousHeight;
        }
      }

      const areaScale = Math.min(
        MAX_AREA_SCALE,
        Math.max(MIN_AREA_SCALE, (width * height) / REFERENCE_AREA),
      );
      const targetCount = Math.round(starsCount * areaScale);

      while (stars.length < targetCount) {
        stars.push(createStar());
      }
      if (stars.length > targetCount) {
        stars.length = targetCount;
      }

      render();
    };

    // Converts a pointer event to canvas coordinates.
    const handlePointerMove = (event) => {
      const bounds = canvas.getBoundingClientRect();
      pointer.x = event.clientX - bounds.left;
      pointer.y = event.clientY - bounds.top;
      pointer.active = true;
    };

    const handlePointerLeave = () => {
      pointer.active = false;
    };

    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    // Runs the loop only while the section is actually visible.
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        start();
      } else {
        stop();
      }
    });
    visibilityObserver.observe(canvas);

    if (host && !prefersReducedMotion) {
      host.addEventListener("pointermove", handlePointerMove, {
        passive: true,
      });
      host.addEventListener("pointerleave", handlePointerLeave);
      host.addEventListener("pointercancel", handlePointerLeave);
    }

    return () => {
      stop();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();

      if (host) {
        host.removeEventListener("pointermove", handlePointerMove);
        host.removeEventListener("pointerleave", handlePointerLeave);
        host.removeEventListener("pointercancel", handlePointerLeave);
      }
    };
  }, [
    starsCount,
    starsSize,
    starsOpacity,
    glowIntensity,
    glowAnimation,
    movementSpeed,
    mouseInfluence,
    mouseGravity,
    gravityStrength,
  ]);

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden", // Fills the parent and never intercepts clicks
        className,
      )}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
};

export default GravityStarsBackground;
