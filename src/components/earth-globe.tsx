"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const LUNAR_ECCENTRICITY = 0.0549;
const LUNAR_SEMIMAJOR_AXIS = 1.33;
const LUNAR_ORBIT_SECONDS = 180;
const MOON_RADIUS = 0.12;

function lunarOrbitPosition(meanAnomaly: number) {
  let eccentricAnomaly = meanAnomaly;
  for (let i = 0; i < 6; i++) {
    eccentricAnomaly -= (eccentricAnomaly - LUNAR_ECCENTRICITY * Math.sin(eccentricAnomaly) - meanAnomaly)
      / (1 - LUNAR_ECCENTRICITY * Math.cos(eccentricAnomaly));
  }
  return new THREE.Vector3(
    LUNAR_SEMIMAJOR_AXIS * (Math.cos(eccentricAnomaly) - LUNAR_ECCENTRICITY),
    LUNAR_SEMIMAJOR_AXIS * Math.sqrt(1 - LUNAR_ECCENTRICITY ** 2) * Math.sin(eccentricAnomaly),
    0
  );
}

/* ─── Procedural city lights texture ─── */
function makeCityLightsTexture() {
  const W = 2048, H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  const toXY = (lat: number, lon: number) => ({
    x: ((lon + 180) / 360) * W,
    y: ((90 - lat) / 180) * H,
  });

  const paintCity = (lat: number, lon: number, r: number, alpha: number) => {
    if (r <= 0) return;
    const { x, y } = toXY(lat, lon);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0,    `rgba(255,248,220,${alpha})`);
    g.addColorStop(0.2,  `rgba(255,225,160,${alpha * 0.75})`);
    g.addColorStop(0.5,  `rgba(255,190,110,${alpha * 0.35})`);
    g.addColorStop(0.8,  `rgba(255,150, 70,${alpha * 0.10})`);
    g.addColorStop(1,    `rgba(255,120, 30,0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };

  const CITIES: [number, number, number, number][] = [
    // North America
    [ 40.7,  -74.0, 30, 0.95], [ 41.8,  -87.6, 24, 0.88], [ 34.0, -118.2, 26, 0.88],
    [ 37.7, -122.4, 16, 0.78], [ 29.7,  -95.3, 18, 0.78], [ 33.4, -112.0, 14, 0.72],
    [ 25.7,  -80.2, 14, 0.72], [ 33.7,  -84.3, 14, 0.72], [ 32.7,  -97.3, 16, 0.75],
    [ 39.9,  -75.1, 13, 0.70], [ 38.9,  -77.0, 13, 0.70], [ 42.3,  -71.0, 12, 0.68],
    [ 47.6, -122.3, 12, 0.68], [ 45.5,  -73.5, 15, 0.76], [ 43.7,  -79.4, 17, 0.80],
    [ 49.2, -123.1, 11, 0.66], [ 39.7, -104.9, 10, 0.65], [ 36.1, -115.1, 10, 0.65],
    // Europe
    [ 51.5,   -0.1, 30, 0.95], [ 48.8,    2.3, 26, 0.92], [ 52.5,   13.4, 22, 0.86],
    [ 41.9,   12.4, 18, 0.82], [ 40.4,   -3.7, 18, 0.80], [ 41.3,    2.1, 16, 0.78],
    [ 52.3,    4.9, 18, 0.80], [ 50.8,    4.3, 15, 0.76], [ 48.1,   11.5, 15, 0.76],
    [ 50.1,    8.6, 15, 0.76], [ 55.7,   37.6, 26, 0.90], [ 41.0,   28.9, 22, 0.86],
    [ 48.2,   16.3, 12, 0.68], [ 59.3,   18.0, 12, 0.65], [ 55.6,   12.5,  8, 0.62],
    // Middle East
    [ 25.2,   55.3, 16, 0.82], [ 24.6,   46.7, 14, 0.76], [ 30.0,   31.2, 22, 0.86],
    [ 35.6,   51.4, 18, 0.80], [ 32.0,   34.7, 12, 0.70], [ 21.3,   39.1, 10, 0.68],
    // South Asia
    [ 28.6,   77.2, 28, 0.90], [ 19.0,   72.8, 24, 0.86], [ 22.5,   88.3, 20, 0.82],
    [ 13.0,   80.2, 18, 0.78], [ 12.9,   77.5, 18, 0.78], [ 24.8,   67.0, 20, 0.82],
    [ 31.5,   74.3, 16, 0.76], [ 33.7,   73.0, 12, 0.72], [ 23.7,   90.4, 14, 0.72],
    // East Asia
    [ 35.6,  139.6, 34, 0.98], [ 34.6,  135.5, 22, 0.86], [ 37.5,  126.9, 26, 0.90],
    [ 31.2,  121.4, 26, 0.90], [ 39.9,  116.4, 28, 0.92], [ 23.1,  113.3, 22, 0.86],
    [ 22.3,  114.1, 18, 0.80], [ 25.0,  121.5, 18, 0.80], [ 30.6,  114.3, 18, 0.80],
    // Southeast Asia & Australia
    [ 13.7,  100.5, 18, 0.80], [ 14.5,  121.0, 16, 0.76], [  1.3,  103.8, 14, 0.74],
    [ -6.2,  106.8, 18, 0.80], [ 10.8,  106.6, 14, 0.72], [-33.8,  151.2, 16, 0.76],
    [-37.8,  145.0, 14, 0.72],
    // South America & Africa
    [-23.5,  -46.6, 26, 0.90], [-22.9,  -43.1, 20, 0.82], [-34.6,  -58.4, 20, 0.82],
    [-33.4,  -70.6, 14, 0.72], [  4.7,  -74.1, 12, 0.68], [  6.4,    3.4, 18, 0.80],
    [-25.9,   28.0, 16, 0.76], [-33.9,   18.4, 12, 0.68], [ 33.9,   -6.8, 12, 0.68],
  ];

  for (const [lat, lon, r, a] of CITIES) paintCity(lat, lon, r, a);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/* ─── Procedural cloud texture ─── */
function makeCloudTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) return null;

  let seed = 41;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  const octaves = [8, 16, 32, 64, 128, 256].map((width) => {
    const height = width / 2;
    return { width, height, values: Float32Array.from({ length: width * height }, random) };
  });
  const smooth = (v: number) => v * v * (3 - 2 * v);
  const sample = (grid: (typeof octaves)[number], x: number, y: number) => {
    const gx = (x / canvas.width) * grid.width;
    const gy = (y / canvas.height) * grid.height;
    const x0 = Math.floor(gx) % grid.width, x1 = (x0 + 1) % grid.width;
    const y0 = Math.min(Math.floor(gy), grid.height - 1), y1 = Math.min(y0 + 1, grid.height - 1);
    const tx = smooth(gx - Math.floor(gx)), ty = smooth(gy - Math.floor(gy));
    return THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(grid.values[y0 * grid.width + x0], grid.values[y0 * grid.width + x1], tx),
      THREE.MathUtils.lerp(grid.values[y1 * grid.width + x0], grid.values[y1 * grid.width + x1], tx),
      ty
    );
  };
  const image = context.createImageData(canvas.width, canvas.height);

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      let density = 0, amplitude = 0.5, amplitudeSum = 0;
      for (const oct of octaves) { density += sample(oct, x, y) * amplitude; amplitudeSum += amplitude; amplitude *= 0.5; }
      density /= amplitudeSum;
      const coverage = smooth(THREE.MathUtils.clamp((density - 0.54) / 0.17, 0, 1));
      const off = (y * canvas.width + x) * 4;
      const brightness = 210 + Math.round(45 * coverage);
      image.data[off] = brightness;
      image.data[off + 1] = brightness;
      image.data[off + 2] = brightness + 3;
      image.data[off + 3] = Math.round(coverage * 215);
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/* ─── Ocean colorizer + roughness extractor ─── */
function colorizeOceanTexture(source: THREE.Texture, anisotropy: number) {
  const image = source.image as HTMLImageElement;
  const canvas = document.createElement("canvas");
  canvas.width = image.width; canvas.height = image.height;
  const context = canvas.getContext("2d");
  if (!context) return { color: source, roughness: null };
  const roughnessCanvas = document.createElement("canvas");
  roughnessCanvas.width = image.width; roughnessCanvas.height = image.height;
  const roughnessContext = roughnessCanvas.getContext("2d");
  if (!roughnessContext) return { color: source, roughness: null };
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const roughnessPixels = roughnessContext.createImageData(canvas.width, canvas.height);
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

  for (let i = 0; i < pixels.data.length; i += 4) {
    const r = pixels.data[i], g = pixels.data[i + 1], b = pixels.data[i + 2];
    const lum = r * 0.2126 + g * 0.7152 + b * 0.0722;
    const darkWater = 1 - clamp01(lum / 64);
    const blueBias = clamp01((b - r + 24) / 38);
    const landBias = clamp01((g - Math.max(r, b) - 4) / 24);
    const amount = darkWater * blueBias * (1 - landBias);
    pixels.data[i]     = r * (1 - amount) + 12 * amount;
    pixels.data[i + 1] = g * (1 - amount) + 68 * amount;
    pixels.data[i + 2] = b * (1 - amount) + 118 * amount;
    // Oceans: soft smooth response, no plastic shine
    const roughness = Math.round(230 - amount * 90);
    roughnessPixels.data[i] = roughness;
    roughnessPixels.data[i + 1] = roughness;
    roughnessPixels.data[i + 2] = roughness;
    roughnessPixels.data[i + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  roughnessContext.putImageData(roughnessPixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  const roughnessTexture = new THREE.CanvasTexture(roughnessCanvas);
  roughnessTexture.colorSpace = THREE.NoColorSpace;
  roughnessTexture.anisotropy = anisotropy;
  return { color: texture, roughness: roughnessTexture };
}

/* ─── GLSL: Night-side city lights ─── */
const CITY_LIGHTS_VERT = /* glsl */`
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  void main() {
    vUv = uv;
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CITY_LIGHTS_FRAG = /* glsl */`
  uniform sampler2D cityMap;
  uniform vec3 sunDir;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  void main() {
    float dayDot = dot(normalize(vWorldNormal), normalize(sunDir));
    float nightMask = smoothstep(0.08, -0.22, dayDot);
    vec4 city = texture2D(cityMap, vUv);
    float lum = city.r * 0.6 + city.g * 0.3 + city.b * 0.1;
    gl_FragColor = vec4(city.rgb * nightMask * 2.2, lum * nightMask * 0.95);
  }
`;



export default function EarthGlobe() {
  const stageRef = useRef<HTMLDivElement>(null);
  const dayMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const earthRef = useRef<THREE.Group | null>(null);
  const visibleRef = useRef(true);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const scene = new THREE.Scene();

    // Camera framed so Earth is completely visible, perfectly spherical with no clipped sides
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 3.6);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch { return; }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setClearColor(0x000000, 0); // 100% transparent background
    renderer.domElement.className = "absolute inset-0 h-full w-full touch-none";
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.pointerEvents = "none";
    stage.appendChild(renderer.domElement);

    // Natural lighting: soft sun without harsh plastic glare
    const SUN_POS = new THREE.Vector3(-3.8, 1.6, 3.4);
    const SUN_DIR = SUN_POS.clone().normalize();

    scene.add(new THREE.AmbientLight(0x789cb8, 1.15));

    const sunlight = new THREE.DirectionalLight(0xfffaea, 2.8);
    sunlight.position.copy(SUN_POS);
    scene.add(sunlight);

    // Soft rim fill light
    const rimLight = new THREE.DirectionalLight(0x1a88dd, 0.65);
    rimLight.position.set(3, -0.8, -2.5);
    scene.add(rimLight);

    // Earth group
    const earth = new THREE.Group();
    earth.rotation.y = Math.PI * 0.95;
    earth.rotation.x = 0.12;
    scene.add(earth);
    earthRef.current = earth;

    // Realistic PBR surface: matte diffuse land, soft sheen oceans (no plastic circle)
    const dayMaterial = new THREE.MeshStandardMaterial({
      color: 0xf4f9ff,
      roughness: 0.72,
      metalness: 0.0,
    });
    const surface = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 72), dayMaterial);
    earth.add(surface);
    dayMaterialRef.current = dayMaterial;

    let disposed = false;
    const earthTextures: THREE.Texture[] = [];
    const textureLoader = new THREE.TextureLoader();

    // Load Blue Marble texture
    textureLoader.load(
      "/earth-blue-marble.jpg",
      (texture) => {
        if (disposed) { texture.dispose(); return; }
        const oceanTextures = colorizeOceanTexture(texture, renderer.capabilities.getMaxAnisotropy());
        if (oceanTextures.color !== texture) texture.dispose();
        earthTextures.push(oceanTextures.color);
        if (oceanTextures.roughness) earthTextures.push(oceanTextures.roughness);
        dayMaterial.map = oceanTextures.color;
        dayMaterial.roughnessMap = oceanTextures.roughness;
        dayMaterial.needsUpdate = true;
      },
      undefined,
      () => undefined
    );

    // Night-side city lights
    const cityLightsTexture = makeCityLightsTexture();
    if (cityLightsTexture) {
      earthTextures.push(cityLightsTexture);
      const cityMat = new THREE.ShaderMaterial({
        uniforms: {
          cityMap: { value: cityLightsTexture },
          sunDir:  { value: SUN_DIR },
        },
        vertexShader:   CITY_LIGHTS_VERT,
        fragmentShader: CITY_LIGHTS_FRAG,
        blending:   THREE.AdditiveBlending,
        transparent: true,
        depthWrite:  false,
        side: THREE.FrontSide,
      });
      const cityMesh = new THREE.Mesh(new THREE.SphereGeometry(1.002, 64, 48), cityMat);
      earth.add(cityMesh);
    }

    // Atmospheric cloud layer
    let cloudLayer: THREE.Mesh | null = null;
    const cloudTexture = makeCloudTexture();
    if (cloudTexture) {
      cloudLayer = new THREE.Mesh(
        new THREE.SphereGeometry(1.012, 64, 48),
        new THREE.MeshBasicMaterial({
          map: cloudTexture,
          color: 0xeff6ff,
          transparent: true,
          opacity: 0.42,
          depthWrite: false,
        })
      );
      earth.add(cloudLayer);
    }

    // Moon system (smaller, non-intrusive)
    const moonOrbitGroup = new THREE.Group();
    moonOrbitGroup.rotation.set(THREE.MathUtils.degToRad(28), 0, THREE.MathUtils.degToRad(14));
    scene.add(moonOrbitGroup);

    const moon = new THREE.Group();
    const moonColorTexture = textureLoader.load("/moon-lroc-color-2k.jpg");
    moonColorTexture.colorSpace = THREE.SRGBColorSpace;
    const moonMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      map: moonColorTexture,
      roughness: 0.95,
      metalness: 0,
    });
    moon.add(new THREE.Mesh(new THREE.SphereGeometry(MOON_RADIUS, 36, 24), moonMaterial));
    moon.position.copy(lunarOrbitPosition(0));
    moonOrbitGroup.add(moon);

    // Resize handling: Earth remains 100% complete and fully visible with breathing room on all sides
    const resize = () => {
      const w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;

      // Earth radius is 1.0, atmosphere is 1.035.
      // targetRadius 1.18 gives comfortable breathing margin so no sides are ever cut off
      const targetRadius = 1.18;
      const distance = 3.6;
      camera.position.set(0, 0, distance);

      // In Three.js fov is vertical. Scale so targetRadius fits in the tighter dimension:
      const minAspect = Math.min(1, camera.aspect);
      const halfFovRad = Math.atan(targetRadius / (distance * minAspect));
      camera.fov = THREE.MathUtils.radToDeg(2 * halfFovRad);

      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(stage);
    resize();

    const io = new IntersectionObserver(([e]) => { visibleRef.current = e.isIntersecting; });
    io.observe(stage);

    // Continuous rotation
    let frame = 0;
    const orbitStartedAt = performance.now();
    const animate = () => {
      frame = requestAnimationFrame(animate);
      if (document.hidden || !visibleRef.current) return;
      earth.rotation.y += 0.0014;
      if (cloudLayer) cloudLayer.rotation.y += 0.0003;
      const orbitProgress = (((performance.now() - orbitStartedAt) / 1000) % LUNAR_ORBIT_SECONDS) / LUNAR_ORBIT_SECONDS;
      moon.position.copy(lunarOrbitPosition(-orbitProgress * Math.PI * 2));
      moon.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    animate();

    // Smooth drag interaction
    let pointerX = 0, pointerY = 0, dragging = false;
    const onPointerDown = (e: PointerEvent) => {
      dragging = true; pointerX = e.clientX; pointerY = e.clientY;
      stage.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      earth.rotation.y += (e.clientX - pointerX) * 0.005;
      earth.rotation.x = THREE.MathUtils.clamp(earth.rotation.x + (e.clientY - pointerY) * 0.004, -0.65, 0.65);
      pointerX = e.clientX; pointerY = e.clientY;
    };
    const onPointerUp = () => { dragging = false; };
    stage.addEventListener("pointerdown", onPointerDown);
    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerup", onPointerUp);
    stage.addEventListener("pointercancel", onPointerUp);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      stage.removeEventListener("pointerdown", onPointerDown);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerup", onPointerUp);
      stage.removeEventListener("pointercancel", onPointerUp);
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => {
            Object.values(m).forEach((v) => { if (v instanceof THREE.Texture) v.dispose(); });
            m.dispose();
          });
        }
      });
      earthTextures.forEach((t) => t.dispose());
      renderer.dispose();
      renderer.domElement.remove();
      dayMaterialRef.current = null;
      earthRef.current = null;
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-visible select-none">
      <div ref={stageRef} className="relative h-full w-full cursor-grab active:cursor-grabbing overflow-visible" />
    </div>
  );
}
