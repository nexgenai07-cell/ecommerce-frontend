// ============================================================
// FireworksBackground
// ============================================================
// A decorative fireworks animation drawn on a canvas. Rockets rise
// from the bottom edge of the container, explode into a burst of
// particles near the upper part of it, and fade away.
//
// Usage requirements:
//   - The component fills its nearest positioned ancestor when it is
//     given the classes "absolute inset-0".
//   - Content that must appear above the fireworks needs its own
//     `relative` positioning and a higher stacking order.
//
// Behavior notes:
//   - The layer never blocks clicks when "pointer-events-none" is set.
//   - The canvas follows the size of its container and is rendered
//     sharply on high density screens.
//   - Burst particles are shaded like small glass beads, and rocket
//     trails are glossy sticks that fade out towards their tail.
//   - The animation pauses while the container is off-screen or the
//     browser tab is hidden.
//   - Users who prefer reduced motion receive an empty, static layer.

import { useEffect, useRef } from "react";

import cn from "../../utils/cn"; // Merges Tailwind class names and resolves conflicts

const MAX_DEVICE_PIXEL_RATIO = 2; // Higher ratios add cost without a visible gain
const ROCKET_GRAVITY = 0.02; // Downward pull applied to a rising rocket each frame
const PARTICLE_GRAVITY = 0.05; // Downward pull applied to a burst particle each frame
const PARTICLE_FRICTION = 0.98; // Share of the speed a burst particle keeps each frame
const MIN_BURST_PARTICLES = 40; // Fewest particles in one burst
const MAX_BURST_PARTICLES = 90; // Most particles in one burst
const LAUNCH_DELAY_RANGE = { min: 300, max: 800 }; // Pause between two launches at population 1, in milliseconds

// Default ranges, kept at module level so they stay stable between renders.
const DEFAULT_FIREWORK_SPEED = { min: 4, max: 8 };
const DEFAULT_FIREWORK_SIZE = { min: 2, max: 5 };
const DEFAULT_PARTICLE_SPEED = { min: 2, max: 7 };
const DEFAULT_PARTICLE_SIZE = { min: 1, max: 5 };

// Returns a random float between min (inclusive) and max (exclusive).
const randomBetween = (min, max) => min + Math.random() * (max - min);

// Returns a random whole number between min (inclusive) and max (exclusive).
const randomInt = (min, max) => Math.floor(randomBetween(min, max));

// Returns a fixed number, or a random value when a { min, max } range is given.
const resolveRange = (range) =>
  typeof range === "number" ? range : randomBetween(range.min, range.max);

// Picks a color from a list, uses a single color as it is, or generates a random hue.
const pickColor = (color) => {
  if (Array.isArray(color) && color.length > 0) {
    return color[randomInt(0, color.length)];
  }
  if (typeof color === "string") return color;
  return `hsl(${randomInt(0, 360)}, 100%, 50%)`;
};

// Creates one burst particle that flies outwards, slows down and fades.
const createParticle = (x, y, color, speed, direction, size) => ({
  x,
  y,
  color,
  size,
  vx: Math.cos(direction) * speed,
  vy: Math.sin(direction) * speed,
  alpha: 1,
  decay: randomBetween(0.005, 0.02),
  update() {
    this.vx *= PARTICLE_FRICTION;
    this.vy *= PARTICLE_FRICTION;
    this.vy += PARTICLE_GRAVITY;
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.decay;
  },
  // Draws a glassy bead: the base color, a glossy highlight and a dark rim on top of it.
  draw(ctx, shine) {
    ctx.save();
    ctx.globalAlpha = Math.max(this.alpha, 0);
    ctx.translate(this.x, this.y);
    ctx.scale(this.size, this.size); // The shared shine gradient is defined for a radius of 1
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.fillStyle = shine;
    ctx.fill();
    ctx.lineWidth = 0.25;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.stroke();
    ctx.restore();
  },
  isAlive() {
    return this.alpha > 0;
  },
});

// Creates one rocket that rises with a short trail and bursts at its target height.
const createFirework = ({
  x,
  y,
  targetY,
  color,
  speed,
  size,
  particleSpeed,
  particleSize,
  onExplode,
}) => {
  const angle = -Math.PI / 2 + randomBetween(-0.3, 0.3); // Nearly straight up, with a slight lean
  return {
    x,
    y,
    color,
    size,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    trail: [],
    trailLength: randomInt(8, 18),
    // Moves the rocket one frame; returns false once it has burst.
    update() {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > this.trailLength) this.trail.shift();

      this.x += this.vx;
      this.y += this.vy;
      this.vy += ROCKET_GRAVITY;

      if (this.vy >= 0 || this.y <= targetY) {
        this.explode();
        return false;
      }
      return true;
    },
    explode() {
      const count = randomInt(MIN_BURST_PARTICLES, MAX_BURST_PARTICLES);
      const particles = [];
      for (let index = 0; index < count; index += 1) {
        particles.push(
          createParticle(
            this.x,
            this.y,
            this.color,
            resolveRange(particleSpeed),
            randomBetween(0, Math.PI * 2),
            resolveRange(particleSize),
          ),
        );
      }
      onExplode(particles);
    },
    // Draws a shiny stick of constant thickness: a dark body that fades out towards the
    // tail, a glossy light streak along its upper half and a bright tip at the head.
    draw(ctx) {
      ctx.save();
      ctx.lineCap = "round";

      const points = [...this.trail, { x: this.x, y: this.y }];
      const lastIndex = points.length - 1;

      // Body: opacity rises from a faint tail to a solid head, which creates the gradient.
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.size;
      for (let index = 1; index <= lastIndex; index += 1) {
        ctx.globalAlpha = 0.15 + 0.85 * (index / lastIndex);
        ctx.beginPath();
        ctx.moveTo(points[index - 1].x, points[index - 1].y);
        ctx.lineTo(points[index].x, points[index].y);
        ctx.stroke();
      }

      // Gloss: a thin light streak through the middle of the upper half of the stick.
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = Math.max(this.size * 0.35, 0.5);
      for (
        let index = Math.ceil(lastIndex / 2);
        index <= lastIndex;
        index += 1
      ) {
        if (index === 0) continue;
        ctx.globalAlpha = (index / lastIndex) * 0.9;
        ctx.beginPath();
        ctx.moveTo(points[index - 1].x, points[index - 1].y);
        ctx.lineTo(points[index].x, points[index].y);
        ctx.stroke();
      }

      // Tip: a small bright dot that makes the head of the stick sparkle.
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(this.size * 0.45, 0.6), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
  };
};

const FireworksBackground = ({
  className,
  canvasClassName,
  population = 1,
  color,
  fireworkSpeed = DEFAULT_FIREWORK_SPEED,
  fireworkSize = DEFAULT_FIREWORK_SIZE,
  particleSpeed = DEFAULT_PARTICLE_SPEED,
  particleSize = DEFAULT_PARTICLE_SIZE,
  ...props
}) => {
  const containerRef = useRef(null); // Wrapper element that defines the drawing area
  const canvasRef = useRef(null); // Canvas the fireworks are drawn on

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return undefined;

    // Visitors who prefer reduced motion get no animation at all.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    // Glossy overlay shared by every particle: a soft highlight at the top left
    // and a darker edge, defined for a circle of radius 1 around the origin.
    const shine = ctx.createRadialGradient(-0.35, -0.35, 0, 0, 0, 1);
    shine.addColorStop(0, "rgba(255, 255, 255, 0.85)");
    shine.addColorStop(0.35, "rgba(255, 255, 255, 0.15)");
    shine.addColorStop(0.7, "rgba(0, 0, 0, 0)");
    shine.addColorStop(1, "rgba(0, 0, 0, 0.5)");

    let width = 0; // Drawing width in CSS pixels
    let height = 0; // Drawing height in CSS pixels

    // Matches the canvas resolution to the container size and screen density.
    const resizeCanvas = () => {
      const ratio = Math.min(
        window.devicePixelRatio || 1,
        MAX_DEVICE_PIXEL_RATIO,
      );
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0); // Lets all drawing use CSS pixels
    };
    resizeCanvas();

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(container);

    const fireworks = []; // Rockets that are still rising
    const particles = []; // Particles of bursts that are still fading

    const handleExplode = (burst) => particles.push(...burst);

    let launchTimer = 0; // Handle of the next scheduled launch
    let frameId = 0; // Handle of the next animation frame
    let isRunning = false; // True while the animation loop is active

    // Sends one rocket up and schedules the next one.
    const launchFirework = () => {
      fireworks.push(
        createFirework({
          x: randomBetween(width * 0.1, width * 0.9),
          y: height,
          targetY: randomBetween(height * 0.1, height * 0.4),
          color: pickColor(color),
          speed: resolveRange(fireworkSpeed),
          size: resolveRange(fireworkSize),
          particleSpeed,
          particleSize,
          onExplode: handleExplode,
        }),
      );
      launchTimer = window.setTimeout(
        launchFirework,
        randomBetween(LAUNCH_DELAY_RANGE.min, LAUNCH_DELAY_RANGE.max) /
          population,
      );
    };

    // Draws one frame: rockets first, then the particles of earlier bursts.
    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      for (let index = fireworks.length - 1; index >= 0; index -= 1) {
        const firework = fireworks[index];
        if (firework.update()) {
          firework.draw(ctx);
        } else {
          fireworks.splice(index, 1);
        }
      }

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        particle.update();
        if (particle.isAlive()) {
          particle.draw(ctx, shine);
        } else {
          particles.splice(index, 1);
        }
      }

      frameId = requestAnimationFrame(animate);
    };

    const start = () => {
      if (isRunning) return;
      isRunning = true;
      launchFirework();
      animate();
    };

    const stop = () => {
      isRunning = false;
      window.clearTimeout(launchTimer);
      cancelAnimationFrame(frameId);
      fireworks.length = 0;
      particles.length = 0;
      ctx.clearRect(0, 0, width, height);
    };

    // Runs only while the container is on screen and the tab is visible.
    let isOnScreen = false;
    const syncRunning = () => {
      if (isOnScreen && !document.hidden) start();
      else stop();
    };

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isOnScreen = entry.isIntersecting;
      syncRunning();
    });
    intersectionObserver.observe(container);
    document.addEventListener("visibilitychange", syncRunning);

    return () => {
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", syncRunning);
      stop();
    };
  }, [
    population,
    color,
    fireworkSpeed,
    fireworkSize,
    particleSpeed,
    particleSize,
  ]);

  return (
    <div
      ref={containerRef}
      className={cn("relative size-full overflow-hidden", className)}
      {...props}
    >
      <canvas
        ref={canvasRef}
        className={cn("absolute inset-0 size-full", canvasClassName)}
      />
    </div>
  );
};

export default FireworksBackground;
