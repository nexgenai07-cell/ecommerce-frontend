// ============================================================
// createHeroBackdrop - UTILITY MODULE
// ============================================================
// Paints the artwork used as the WebGL backdrop of one hero category.
// The artwork is drawn on an offscreen 2D canvas (so no external image
// files are needed) and is later uploaded to the GPU as a texture by the
// dissolve renderer. It combines a deep base tone, soft tinted glows,
// fine concentric rings, light beams and a field of dust particles. The
// fine details matter: the dissolve shader detects edges in this image to
// produce its silver glowing outlines and sparkles.

// Reads an "R G B" triple (for example "16 185 129") from a CSS custom
// property of the given element and returns it as three numbers. The
// colours live in index.css so no colour is hardcoded in JavaScript.
export const readHeroColor = (element, propertyName, fallback) => {
  // Look up the computed value of the custom property on the element.
  const rawValue = getComputedStyle(element).getPropertyValue(propertyName);

  // Split the value on whitespace and convert every part to a number.
  const parts = rawValue
    .trim()
    .split(/\s+/)
    .map((part) => Number(part));

  // Accept the value only when it is exactly three valid numbers.
  if (parts.length === 3 && parts.every((part) => Number.isFinite(part))) {
    return parts;
  }

  // Otherwise use the provided fallback triple.
  return fallback;
};

// Small deterministic pseudo random number generator (mulberry32).
// The same seed always yields the same artwork, so a category looks
// identical on every visit.
const createRandom = (seed) => {
  // Internal state advanced on every call.
  let state = seed >>> 0;

  // Returns the next pseudo random number in the range [0, 1).
  return () => {
    state = (state + 0x6d2b79f5) >>> 0; // Advance the state by a fixed odd constant
    let t = state; // Working copy used for bit mixing
    t = Math.imul(t ^ (t >>> 15), t | 1); // First mixing round
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); // Second mixing round
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // Normalise to [0, 1)
  };
};

// Formats an RGB triple and an alpha value as a CSS rgba() string.
const rgba = (color, alpha) =>
  `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;

// Builds and returns a square canvas containing the backdrop artwork.
//   tint - RGB triple of the accent colour of this category
//   base - RGB triple of the deep background tone
//   seed - number making the artwork unique per category
//   size - width and height of the square canvas in pixels
export const createHeroBackdrop = ({ tint, base, seed, size = 1280 }) => {
  // Create the offscreen canvas that holds the artwork.
  const canvas = document.createElement("canvas");
  canvas.width = size; // Square texture width
  canvas.height = size; // Square texture height

  // 2D drawing context used for all painting below.
  const ctx = canvas.getContext("2d");

  // Deterministic random source for this category.
  const random = createRandom(seed);

  // Centre point of the artwork, nudged slightly per category.
  const centerX = size * (0.5 + (random() - 0.5) * 0.12);
  const centerY = size * (0.5 + (random() - 0.5) * 0.12);

  // ---- 1. Deep base tone ----
  ctx.fillStyle = rgba(base, 1); // Solid dark base colour
  ctx.fillRect(0, 0, size, size); // Cover the whole canvas

  // ---- 2. Large soft tinted glow behind the centre ----
  const mainGlow = ctx.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    size * 0.62,
  ); // Radial gradient fading outwards from the centre
  mainGlow.addColorStop(0, rgba(tint, 0.5)); // Strong tint in the middle
  mainGlow.addColorStop(0.45, rgba(tint, 0.16)); // Gentle falloff
  mainGlow.addColorStop(1, rgba(tint, 0)); // Fully transparent at the edge
  ctx.fillStyle = mainGlow; // Use the gradient as the fill
  ctx.fillRect(0, 0, size, size); // Paint the glow

  // ---- 3. Two smaller off-centre glows for depth ----
  for (let i = 0; i < 2; i += 1) {
    // Random position of this accent glow.
    const glowX = size * (0.15 + random() * 0.7);
    const glowY = size * (0.15 + random() * 0.7);
    // Radius of this accent glow.
    const glowRadius = size * (0.22 + random() * 0.18);
    // Gradient fading from the tint to transparent.
    const accent = ctx.createRadialGradient(
      glowX,
      glowY,
      0,
      glowX,
      glowY,
      glowRadius,
    );
    accent.addColorStop(0, rgba(tint, 0.28)); // Tinted core
    accent.addColorStop(1, rgba(tint, 0)); // Transparent rim
    ctx.fillStyle = accent; // Use the gradient as the fill
    ctx.fillRect(0, 0, size, size); // Paint the accent glow
  }

  // ---- 4. Thin concentric rings around the centre ----
  ctx.lineWidth = Math.max(1.5, size * 0.0016); // Hairline stroke width
  for (let ring = 1; ring <= 11; ring += 1) {
    // Radius grows with every ring.
    const radius = size * (0.06 + ring * 0.06);
    // Rings fade out gradually towards the outside.
    const ringAlpha = 0.22 - ring * 0.014;
    ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0.04, ringAlpha)})`; // Soft white
    ctx.beginPath(); // Start a new circular path
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); // Full circle
    ctx.stroke(); // Draw the ring outline
  }

  // ---- 5. Light beams radiating from the centre ----
  for (let beam = 0; beam < 14; beam += 1) {
    // Evenly spread angle with a little random jitter.
    const angle = (beam / 14) * Math.PI * 2 + random() * 0.2;
    // Gradient along the beam: bright at the centre, gone at the end.
    const beamGradient = ctx.createLinearGradient(
      centerX,
      centerY,
      centerX + Math.cos(angle) * size * 0.75,
      centerY + Math.sin(angle) * size * 0.75,
    );
    beamGradient.addColorStop(0, "rgba(255, 255, 255, 0.16)"); // Bright start
    beamGradient.addColorStop(1, "rgba(255, 255, 255, 0)"); // Faded end
    ctx.strokeStyle = beamGradient; // Stroke with the beam gradient
    ctx.lineWidth = 1 + random() * 2.5; // Slightly varied thickness
    ctx.beginPath(); // Start the beam path
    ctx.moveTo(centerX, centerY); // Begin at the centre
    ctx.lineTo(
      centerX + Math.cos(angle) * size * 0.75,
      centerY + Math.sin(angle) * size * 0.75,
    ); // Extend outwards along the angle
    ctx.stroke(); // Draw the beam
  }

  // ---- 6. Dust particles scattered over the whole canvas ----
  for (let dust = 0; dust < 1100; dust += 1) {
    // Random position of the particle.
    const dustX = random() * size;
    const dustY = random() * size;
    // Mostly tiny particles with the occasional larger one.
    const dustRadius = 0.5 + Math.pow(random(), 3) * 2.6;
    // Random brightness of the particle.
    const dustAlpha = 0.12 + random() * 0.7;
    // One in four particles carries the category tint, the rest are white.
    ctx.fillStyle =
      random() < 0.25
        ? rgba(tint, dustAlpha)
        : `rgba(255, 255, 255, ${dustAlpha})`;
    ctx.beginPath(); // Start a new particle path
    ctx.arc(dustX, dustY, dustRadius, 0, Math.PI * 2); // Draw it as a small disc
    ctx.fill(); // Fill the particle
  }

  // ---- 7. Vignette that darkens the corners ----
  const vignette = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.35,
    size / 2,
    size / 2,
    size * 0.78,
  ); // Transparent centre fading to dark corners
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)"); // Clear in the middle
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.55)"); // Dark at the corners
  ctx.fillStyle = vignette; // Use the vignette as the fill
  ctx.fillRect(0, 0, size, size); // Paint the vignette

  // Return the finished artwork canvas.
  return canvas;
};
