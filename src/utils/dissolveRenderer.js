// ============================================================
// dissolveRenderer - UTILITY MODULE
// ============================================================
// A dependency free WebGL renderer for the silver "scroll dissolve
// reveal" transition. It is a direct port of the Vengeance UI
// ScrollDissolveReveal shaders: the FRONT texture dissolves outwards
// from the centre in a noisy, pixelated pattern while turning into
// glowing silver edges and sparkles, and the BACK texture underneath
// brightens from a dark grayscale silhouette into full colour.
// Rendering happens on demand (no animation loop), once per scroll
// change, which keeps the page light.

// Vertex shader shared by both layers: draws a full screen quad and
// passes normalised texture coordinates to the fragment shader.
const VERTEX_SHADER = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

// Precision header: use high precision where the GPU supports it.
const PRECISION_HEADER = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif
`;

// Fragment shader of the FRONT layer (the image that dissolves away).
const FRONT_FRAGMENT_SHADER = `
  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  uniform vec2 uImageResolution;
  uniform float uDissolve;
  uniform vec2 uCenter;
  uniform float uGrayscale;
  uniform float uEdgeIntensity;
  uniform float uEdgeBrightness;
  varying vec2 vUv;

  mat3 sobelX = mat3(
    -1.0, 0.0, 1.0,
    -2.0, 0.0, 2.0,
    -1.0, 0.0, 1.0
  );

  mat3 sobelY = mat3(
    -1.0, -2.0, -1.0,
     0.0,  0.0,  0.0,
     1.0,  2.0,  1.0
  );

  float getLuminance(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
  }

  float sobel(sampler2D tex, vec2 uv, vec2 texelSize) {
    float gx = 0.0;
    float gy = 0.0;

    for (int i = -1; i <= 1; i++) {
      for (int j = -1; j <= 1; j++) {
        vec2 offset = vec2(float(i), float(j)) * texelSize;
        float lum = getLuminance(texture2D(tex, uv + offset).rgb);
        gx += lum * sobelX[i + 1][j + 1];
        gy += lum * sobelY[i + 1][j + 1];
      }
    }

    return sqrt(gx * gx + gy * gy);
  }

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }

    return value;
  }

  void main() {
    vec2 ratio = vec2(
      min((uResolution.x / uResolution.y) / (uImageResolution.x / uImageResolution.y), 1.0),
      min((uResolution.y / uResolution.x) / (uImageResolution.y / uImageResolution.x), 1.0)
    );

    vec2 uv = vec2(
      vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
      vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
    );

    vec4 texColor = texture2D(uTexture, uv);

    float gray = getLuminance(texColor.rgb);
    vec3 grayscaleColor = vec3(gray);
    texColor.rgb = mix(texColor.rgb, grayscaleColor, uGrayscale);

    vec2 centeredUv = vUv - uCenter;
    float aspect = uResolution.x / uResolution.y;
    centeredUv.x *= aspect;
    float dist = length(centeredUv);

    float angle = atan(centeredUv.y, centeredUv.x);

    float noiseScale = 6.0;
    vec2 pixelatedUv = floor(vUv * uResolution / noiseScale) * noiseScale / uResolution;
    float blockNoise = fbm(pixelatedUv * 100.0) * 0.15;

    float angularNoise = fbm(vec2(angle * 5.0, 0.0)) * 0.15;

    float totalNoise = blockNoise + angularNoise;
    float noisyDist = dist + totalNoise;

    float maxDist = length(vec2(aspect * 0.5, 0.5));
    float normalizedDist = noisyDist / maxDist;

    float dissolveThreshold = uDissolve * 1.5;

    vec2 texelSize = 1.0 / uResolution;
    float edge = sobel(uTexture, uv, texelSize);

    edge = pow(edge, 0.7) * 2.0;
    edge = clamp(edge, 0.0, 1.0);

    float dissolveMask = smoothstep(dissolveThreshold - 0.03, dissolveThreshold, normalizedDist);

    vec3 edgeColor = vec3(1.0, 1.0, 1.0);

    vec3 baseColor = mix(texColor.rgb, vec3(0.0), uGrayscale);
    vec3 finalColor = baseColor;

    float edgeGlowIntensity = uEdgeIntensity * 2.0;
    float edgeGlow = edge * edgeGlowIntensity * (1.0 + uGrayscale * 3.0);
    finalColor += edgeColor * edgeGlow * uEdgeBrightness;

    float edgeZoneWidth = 0.15 * (1.0 - uDissolve) + 0.02;
    float edgeZone = smoothstep(dissolveThreshold - edgeZoneWidth, dissolveThreshold - edgeZoneWidth + 0.04, normalizedDist) *
                     smoothstep(dissolveThreshold + 0.02, dissolveThreshold - 0.02, normalizedDist);
    float sparkle = hash(floor(vUv * uResolution / 4.0)) * edgeZone;

    float edgeBrightness = (1.0 - uDissolve) * uEdgeBrightness * (1.0 + uGrayscale * 2.0);
    finalColor += vec3(sparkle * 3.0 * edgeBrightness);

    float alpha = dissolveMask * texColor.a;

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

// Fragment shader of the BACK layer (the image revealed underneath).
const BACK_FRAGMENT_SHADER = `
  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  uniform vec2 uImageResolution;
  uniform float uEdgeIntensity;
  uniform float uDarkness;
  uniform float uGrayscale;
  varying vec2 vUv;

  mat3 sobelX = mat3(
    -1.0, 0.0, 1.0,
    -2.0, 0.0, 2.0,
    -1.0, 0.0, 1.0
  );

  mat3 sobelY = mat3(
    -1.0, -2.0, -1.0,
     0.0,  0.0,  0.0,
     1.0,  2.0,  1.0
  );

  float getLuminance(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
  }

  float sobel(sampler2D tex, vec2 uv, vec2 texelSize) {
    float gx = 0.0;
    float gy = 0.0;

    for (int i = -1; i <= 1; i++) {
      for (int j = -1; j <= 1; j++) {
        vec2 offset = vec2(float(i), float(j)) * texelSize;
        float lum = getLuminance(texture2D(tex, uv + offset).rgb);
        gx += lum * sobelX[i + 1][j + 1];
        gy += lum * sobelY[i + 1][j + 1];
      }
    }

    return sqrt(gx * gx + gy * gy);
  }

  void main() {
    vec2 ratio = vec2(
      min((uResolution.x / uResolution.y) / (uImageResolution.x / uImageResolution.y), 1.0),
      min((uResolution.y / uResolution.x) / (uImageResolution.y / uImageResolution.x), 1.0)
    );

    vec2 uv = vec2(
      vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
      vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
    );

    vec4 texColor = texture2D(uTexture, uv);

    float gray = getLuminance(texColor.rgb);
    vec3 grayscaleColor = vec3(gray);
    texColor.rgb = mix(texColor.rgb, grayscaleColor, uGrayscale);

    vec2 texelSize = 1.0 / uResolution;
    float edge = sobel(uTexture, uv, texelSize);

    edge = pow(edge, 0.7) * 2.0;
    edge = clamp(edge, 0.0, 1.0);

    vec3 edgeColor = vec3(1.0, 1.0, 1.0);

    vec3 darkBase = vec3(0.0);
    vec3 baseColor = mix(texColor.rgb, darkBase, uDarkness);

    float edgeGlow = edge * uEdgeIntensity * 2.0;
    baseColor += edgeColor * edgeGlow;

    vec3 finalColor = clamp(baseColor, 0.0, 1.0);

    gl_FragColor = vec4(finalColor, texColor.a);
  }
`;

// Compiles one shader stage and returns it, or null when compilation fails.
const compileShader = (gl, type, source) => {
  const shader = gl.createShader(type); // Create an empty shader object
  gl.shaderSource(shader, source); // Attach the GLSL source code
  gl.compileShader(shader); // Compile it on the GPU driver
  // Report failures to the console and clean up.
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Hero dissolve shader error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader; // Compiled successfully
};

// Links a vertex and fragment shader into a program and looks up the
// locations of the requested uniforms. Returns null when linking fails.
const createProgram = (gl, fragmentSource, uniformNames) => {
  // Compile both shader stages.
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragmentShader = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    PRECISION_HEADER + fragmentSource,
  );
  // Abort when either stage failed to compile.
  if (!vertexShader || !fragmentShader) return null;

  // Link the two stages into one program.
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  // Bind the quad attribute to slot 0 so both programs share one buffer layout.
  gl.bindAttribLocation(program, 0, "position");
  gl.linkProgram(program);

  // Report link failures to the console.
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Hero dissolve link error:", gl.getProgramInfoLog(program));
    return null;
  }

  // Collect the uniform locations by name for fast updates later.
  const uniforms = {};
  uniformNames.forEach((name) => {
    uniforms[name] = gl.getUniformLocation(program, name);
  });

  return { program, uniforms };
};

// Creates the renderer bound to the given canvas element. Returns null
// when WebGL is not available so the caller can fall back gracefully.
export const createDissolveRenderer = (canvas) => {
  // Request a WebGL context without antialiasing or alpha, like the original.
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
  if (!gl) return null;

  // Build the two shader programs (front layer and back layer).
  const front = createProgram(gl, FRONT_FRAGMENT_SHADER, [
    "uTexture",
    "uResolution",
    "uImageResolution",
    "uDissolve",
    "uCenter",
    "uGrayscale",
    "uEdgeIntensity",
    "uEdgeBrightness",
  ]);
  const back = createProgram(gl, BACK_FRAGMENT_SHADER, [
    "uTexture",
    "uResolution",
    "uImageResolution",
    "uEdgeIntensity",
    "uDarkness",
    "uGrayscale",
  ]);
  if (!front || !back) return null;

  // Full screen quad made of two triangles covering clip space.
  const quadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0); // Quad positions are read from attribute slot 0
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); // Two floats per vertex

  // Standard "source over" alpha blending so the front layer fades out
  // over the back layer exactly like a transparent three.js material.
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(
    gl.SRC_ALPHA,
    gl.ONE_MINUS_SRC_ALPHA,
    gl.ONE,
    gl.ONE_MINUS_SRC_ALPHA,
  );

  // Flip images vertically on upload so texture coordinates match three.js.
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  // Cache of GPU textures, one per source canvas, uploaded only once.
  const textureCache = new Map();

  // Returns the GPU texture for a source canvas, uploading it on first use.
  const getTexture = (source) => {
    // Reuse the texture when this source was uploaded before.
    if (textureCache.has(source)) return textureCache.get(source);
    const texture = gl.createTexture(); // Allocate a texture object
    gl.bindTexture(gl.TEXTURE_2D, texture); // Make it the active texture
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); // Smooth shrinking
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); // Smooth enlarging
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); // No horizontal repeat
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); // No vertical repeat
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source); // Upload the canvas pixels to the GPU
    textureCache.set(source, texture); // Remember it for next time
    return texture;
  };

  // Binds a source canvas to texture unit 0 and sets the shared
  // resolution uniforms of the currently active program.
  const bindLayerTexture = (layer, source) => {
    gl.activeTexture(gl.TEXTURE0); // Always use texture unit 0
    gl.bindTexture(gl.TEXTURE_2D, getTexture(source)); // Bind this layer's texture
    gl.uniform1i(layer.uniforms.uTexture, 0); // Tell the shader to sample unit 0
    gl.uniform2f(layer.uniforms.uResolution, canvas.width, canvas.height); // Drawing size
    gl.uniform2f(layer.uniforms.uImageResolution, source.width, source.height); // Source artwork size
  };

  // Resizes the drawing buffer to the given pixel size.
  const resize = (width, height) => {
    // Only touch the canvas when the size really changed.
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width; // Drawing buffer width
      canvas.height = height; // Drawing buffer height
    }
    gl.viewport(0, 0, width, height); // Match the viewport to the buffer
  };

  // Draws one frame.
  //   frontSource / backSource - artwork canvases of the two layers
  //   progress                 - dissolve progress from 0 to 1
  const render = (frontSource, backSource, progress) => {
    gl.clearColor(0, 0, 0, 1); // Opaque black behind everything
    gl.clear(gl.COLOR_BUFFER_BIT); // Wipe the previous frame

    // Draw the back layer first, but only while the front layer is not
    // completely opaque yet (at progress 0 the front covers everything).
    if (progress > 0.0001) {
      gl.useProgram(back.program); // Activate the back layer shader
      bindLayerTexture(back, backSource); // Bind texture and resolution uniforms
      const accelerated = Math.min(1, progress * 1.1); // Back layer runs slightly faster
      gl.uniform1f(back.uniforms.uEdgeIntensity, 0.6 * (1 - accelerated)); // Fading edge glow
      gl.uniform1f(back.uniforms.uDarkness, 1 - accelerated); // Dark to bright
      gl.uniform1f(back.uniforms.uGrayscale, 1 - accelerated); // Grayscale to colour
      gl.drawArrays(gl.TRIANGLES, 0, 6); // Paint the quad
    }

    // Draw the front layer on top while it has not fully dissolved yet.
    if (progress < 0.9999) {
      gl.useProgram(front.program); // Activate the front layer shader
      bindLayerTexture(front, frontSource); // Bind texture and resolution uniforms
      gl.uniform1f(front.uniforms.uDissolve, progress); // Dissolve radius
      gl.uniform2f(front.uniforms.uCenter, 0.5, 0.5); // Dissolve starts at the centre
      gl.uniform1f(front.uniforms.uGrayscale, Math.min(1, progress / 0.4)); // Turns silver early
      gl.uniform1f(front.uniforms.uEdgeIntensity, progress * 0.5); // Edge glow grows
      gl.uniform1f(front.uniforms.uEdgeBrightness, 1 - progress); // Glow fades near the end
      gl.drawArrays(gl.TRIANGLES, 0, 6); // Paint the quad
    }
  };

  // Releases every GPU resource held by this renderer.
  const destroy = () => {
    textureCache.forEach((texture) => gl.deleteTexture(texture)); // Free all textures
    textureCache.clear(); // Forget them
    gl.deleteBuffer(quadBuffer); // Free the quad buffer
    gl.deleteProgram(front.program); // Free the front shader program
    gl.deleteProgram(back.program); // Free the back shader program
  };

  // Public surface of the renderer.
  return { render, resize, destroy };
};
