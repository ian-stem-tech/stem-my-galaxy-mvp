import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { PositionedTrack, DarkMatterNode } from 'src/utils/position-tracks';
import { getWorldBounds } from 'src/utils/position-tracks';
import './styles.scss';

const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
const isMobile = /iPhone|iPad|iPod|Android/.test(navigator.userAgent);
const STAR_COUNT = 30000;
const STAR_SPREAD = 3;

interface ConstellationEdge { from: number; to: number; }

interface GalaxyCanvasProps {
  tracks: PositionedTrack[];
  edges?: ConstellationEdge[];
  darkMatterNodes?: DarkMatterNode[];
  onTrackSelect?: (track: PositionedTrack | null) => void;
}

interface ConstellationEdge { from: number; to: number; }

function generateStarField(count: number) {
  const width = Math.ceil(Math.sqrt(count));
  const height = Math.ceil(count / width);
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    // Uniform distribution -- fills entire range like infinite space
    const nx = Math.random();
    const ny = Math.random();
    const xv = Math.floor(nx * 65535);
    const yv = Math.floor(ny * 65535);
    data[i * 4] = (xv >> 8) & 0xff;
    data[i * 4 + 1] = xv & 0xff;
    data[i * 4 + 2] = (yv >> 8) & 0xff;
    data[i * 4 + 3] = yv & 0xff;
  }
  return { data, width, height };
}

const GalaxyCanvas: React.FC<GalaxyCanvasProps> = ({ tracks, edges: propEdges, darkMatterNodes: propDarkMatter, onTrackSelect }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const artLayerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dmLayerRef = useRef<HTMLDivElement>(null);
  const tracksRef = useRef<PositionedTrack[]>([]);
  tracksRef.current = tracks;

  const onTrackSelectRef = useRef(onTrackSelect);
  onTrackSelectRef.current = onTrackSelect;

  const edgesRef = useRef<ConstellationEdge[]>([]);
  edgesRef.current = propEdges || [];

  const [selectedTrack, setSelectedTrack] = useState<PositionedTrack | null>(null);
  const [labelPos, setLabelPos] = useState<{ x: number; y: number } | null>(null);
  const [tracksMounted, setTracksMounted] = useState(false);
  const [dmTooltip, setDmTooltip] = useState<string | null>(null);
  const camRef = useRef({ x: 0, y: 0, zoom: 1, targetX: 0, targetY: 0, targetZoom: 1 });
  const baseZoomRef = useRef(1);
  const canvasSizeRef = useRef({ w: 0, h: 0, clientW: 0, clientH: 0 });

  const worldToScreen = useCallback((wx: number, wy: number) => {
    const cam = camRef.current;
    const { w, h, clientW, clientH } = canvasSizeRef.current;
    const aspect = w / h;
    const sc = Math.min(w, h) / 2;
    const resX = sc * aspect, resY = sc;
    const clipX = ((wx + cam.x) * cam.zoom) / resX;
    const clipY = ((wy + cam.y) * cam.zoom) / resY;
    return { x: ((clipX + 1) / 2) * clientW, y: ((1 + clipY) / 2) * clientH };
  }, []);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const cam = camRef.current;
    const { w, h, clientW, clientH } = canvasSizeRef.current;
    const aspect = w / h;
    const sc = Math.min(w, h) / 2;
    const resX = sc * aspect, resY = sc;
    return {
      x: (((sx / clientW) * 2 - 1) * resX) / cam.zoom - cam.x,
      y: (((sy / clientH) * 2 - 1) * resY) / cam.zoom - cam.y,
    };
  }, []);

  // Mount track images and SVG lines when tracks change
  useEffect(() => {
    if (tracks.length === 0) { setTracksMounted(false); return; }
    setTracksMounted(true);
  }, [tracks]);

  // WebGL star field + direct DOM position updates in rAF
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    canvas.style.cursor = 'grab';
    canvas.style.touchAction = 'none';
    container.insertBefore(canvas, container.firstChild);

    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false, antialias: true });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; }
      return s;
    };
    const link = (vs: string, fs: string) => {
      const v = compile(gl.VERTEX_SHADER, vs), f = compile(gl.FRAGMENT_SHADER, fs);
      if (!v || !f) return null;
      const p = gl.createProgram()!;
      gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(p)); return null; }
      return p;
    };

    const pointProg = link(
      `#version 300 es
      precision highp float;
      in float a_index;
      uniform sampler2D u_tex;
      uniform vec2 u_xRange, u_yRange, u_res, u_offset;
      uniform float u_zoom, u_ptSize, u_wave;
      uniform vec2 u_center; uniform float u_radius;
      out float v_alpha;
      out float v_brightness;
      float d16(float h,float l){return(h*255.0*256.0+l*255.0)/65535.0;}
      float hash(float n){return fract(sin(n)*43758.5453);}
      void main(){
        ivec2 ts=textureSize(u_tex,0); int i=int(a_index);
        vec4 px=texelFetch(u_tex,ivec2(i%ts.x,i/ts.x),0);
        float x=u_xRange.x+d16(px.r,px.g)*(u_xRange.y-u_xRange.x);
        float y=u_yRange.x+d16(px.b,px.a)*(u_yRange.y-u_yRange.x);
        vec2 pos=vec2(x,y);
        vec2 fc=pos-u_center; float cd=length(fc); float nd=cd/u_radius;
        v_alpha=smoothstep(nd-0.15,nd+0.05,u_wave);
        float sizeVar=0.4+hash(a_index)*1.2;
        v_brightness=0.5+hash(a_index*3.7)*0.5;
        pos=(pos+u_offset)*u_zoom; vec2 cs=pos/u_res; cs.y*=-1.0;
        gl_Position=vec4(cs,0,1); gl_PointSize=u_ptSize*v_alpha*sizeVar;
      }`,
      `#version 300 es
      precision mediump float; in float v_alpha; in float v_brightness; uniform float u_opacity; out vec4 o;
      void main(){vec2 c=gl_PointCoord-0.5;float d=length(c);if(d>0.5)discard;
        vec3 col=mix(vec3(0.6,0.65,0.8),vec3(1.0),v_brightness);
        o=vec4(col,smoothstep(0.5,0.3,d)*u_opacity*v_alpha*v_brightness);}`
    );
    if (!pointProg) return;

    const pL = {
      index: gl.getAttribLocation(pointProg, 'a_index'),
      tex: gl.getUniformLocation(pointProg, 'u_tex'),
      xRange: gl.getUniformLocation(pointProg, 'u_xRange'),
      yRange: gl.getUniformLocation(pointProg, 'u_yRange'),
      res: gl.getUniformLocation(pointProg, 'u_res'),
      offset: gl.getUniformLocation(pointProg, 'u_offset'),
      zoom: gl.getUniformLocation(pointProg, 'u_zoom'),
      ptSize: gl.getUniformLocation(pointProg, 'u_ptSize'),
      opacity: gl.getUniformLocation(pointProg, 'u_opacity'),
      wave: gl.getUniformLocation(pointProg, 'u_wave'),
      center: gl.getUniformLocation(pointProg, 'u_center'),
      radius: gl.getUniformLocation(pointProg, 'u_radius'),
    };

    const bounds = getWorldBounds();
    // Extend star field range far beyond constellation bounds
    const starBounds = {
      minX: bounds.minX * STAR_SPREAD,
      maxX: bounds.maxX * STAR_SPREAD,
      minY: bounds.minY * STAR_SPREAD,
      maxY: bounds.maxY * STAR_SPREAD,
    };

    const stars = generateStarField(STAR_COUNT);
    const starTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, starTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, stars.width, stars.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, stars.data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const starCount = stars.width * stars.height;

    const idxArr = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) idxArr[i] = i;
    const idxBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, idxBuf);
    gl.bufferData(gl.ARRAY_BUFFER, idxArr, gl.STATIC_DRAW);

    const cam = camRef.current;
    const initCamera = () => {
      const dw = bounds.maxX - bounds.minX, dh = bounds.maxY - bounds.minY;
      baseZoomRef.current = Math.min(canvas.width / (dw * 1.4), canvas.height / (dh * 1.4));
      cam.x = cam.targetX = -((bounds.minX + bounds.maxX) / 2);
      cam.y = cam.targetY = -((bounds.minY + bounds.maxY) / 2);
      cam.zoom = cam.targetZoom = baseZoomRef.current;
    };

    let cameraReady = false;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = container.clientWidth * dpr;
      canvas.height = container.clientHeight * dpr;
      canvas.style.width = `${container.clientWidth}px`;
      canvas.style.height = `${container.clientHeight}px`;
      canvasSizeRef.current = { w: canvas.width, h: canvas.height, clientW: container.clientWidth, clientH: container.clientHeight };
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (!cameraReady) { initCamera(); cameraReady = true; }
      else {
        const dw = bounds.maxX - bounds.minX, dh = bounds.maxY - bounds.minY;
        baseZoomRef.current = Math.min(canvas.width / (dw * 1.4), canvas.height / (dh * 1.4));
      }
    };
    resize();
    window.addEventListener('resize', resize);

    // --- Interaction ---
    const mouse = { x: 0, y: 0, inBounds: false };
    const drag = { active: false, lastX: 0, lastY: 0 };
    const vel = { x: 0, y: 0 };
    const touch = { active: false, pinch: false, lx: 0, ly: 0, lastDist: 0, startX: 0, startY: 0, startTime: 0, pcx: 0, pcy: 0 };

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top;
      mouse.inBounds = true;
      if (drag.active) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const dx = ((e.clientX - drag.lastX) * dpr) / cam.zoom, dy = ((e.clientY - drag.lastY) * dpr) / cam.zoom;
        vel.x = dx; vel.y = dy;
        cam.x += dx; cam.y += dy; cam.targetX += dx; cam.targetY += dy;
        drag.lastX = e.clientX; drag.lastY = e.clientY;
        canvas.style.cursor = 'grabbing';
      }
    };
    const onMouseDown = (e: MouseEvent) => { drag.active = true; drag.lastX = e.clientX; drag.lastY = e.clientY; vel.x = 0; vel.y = 0; canvas.style.cursor = 'grabbing'; };
    const onMouseUp = () => { drag.active = false; canvas.style.cursor = 'grab'; };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isMac && !(e.ctrlKey || e.metaKey)) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        cam.x -= (e.deltaX * dpr) / cam.zoom; cam.y -= (e.deltaY * dpr) / cam.zoom;
        cam.targetX -= (e.deltaX * dpr) / cam.zoom; cam.targetY -= (e.deltaY * dpr) / cam.zoom;
        return;
      }
      const zf = (isMac && (e.ctrlKey || e.metaKey)) ? Math.pow(2, -e.deltaY * 0.03) : (e.deltaY > 0 ? 0.89 : 1.12);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * dpr, my = (e.clientY - rect.top) * dpr;
      const aspect = canvas.width / canvas.height, sc = Math.min(canvas.width, canvas.height) / 2;
      const rx = sc * aspect, ry = sc;
      const cx = (mx - canvas.width / 2) / rx, cy = (my - canvas.height / 2) / ry;
      const wx = (cx * rx) / cam.targetZoom - cam.targetX, wy = (cy * ry) / cam.targetZoom - cam.targetY;
      const nz = cam.targetZoom * zf;
      cam.targetX = (cx * rx) / nz - wx; cam.targetY = (cy * ry) / nz - wy; cam.targetZoom = nz;
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault(); vel.x = 0; vel.y = 0;
      if (e.touches.length === 1 && e.touches[0]) {
        touch.active = true; touch.pinch = false;
        touch.lx = e.touches[0].clientX; touch.ly = e.touches[0].clientY;
        touch.startX = e.touches[0].clientX; touch.startY = e.touches[0].clientY;
        touch.startTime = Date.now();
      } else if (e.touches.length === 2 && e.touches[0] && e.touches[1]) {
        touch.active = false; touch.pinch = true;
        touch.lastDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        touch.pcx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        touch.pcy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && touch.active && !touch.pinch && e.touches[0]) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const dx = ((e.touches[0].clientX - touch.lx) * dpr) / cam.zoom, dy = ((e.touches[0].clientY - touch.ly) * dpr) / cam.zoom;
        vel.x = dx; vel.y = dy;
        cam.x += dx; cam.y += dy; cam.targetX += dx; cam.targetY += dy;
        touch.lx = e.touches[0].clientX; touch.ly = e.touches[0].clientY;
      } else if (e.touches.length === 2 && touch.pinch && e.touches[0] && e.touches[1]) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        const ncx = (e.touches[0].clientX + e.touches[1].clientX) / 2, ncy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        cam.x += ((ncx - touch.pcx) * dpr) / cam.zoom; cam.y += ((ncy - touch.pcy) * dpr) / cam.zoom;
        cam.targetX += ((ncx - touch.pcx) * dpr) / cam.zoom; cam.targetY += ((ncy - touch.pcy) * dpr) / cam.zoom;
        touch.pcx = ncx; touch.pcy = ncy;
        if (touch.lastDist > 0) {
          const zf = d / touch.lastDist;
          const rect = canvas.getBoundingClientRect();
          const mx = (ncx - rect.left) * dpr, my = (ncy - rect.top) * dpr;
          const aspect = canvas.width / canvas.height, sc = Math.min(canvas.width, canvas.height) / 2;
          const rx = sc * aspect, ry = sc;
          const cx = (mx - canvas.width / 2) / rx, cy = (my - canvas.height / 2) / ry;
          const wx = (cx * rx) / cam.targetZoom - cam.targetX, wy = (cy * ry) / cam.targetZoom - cam.targetY;
          cam.targetX = (cx * rx) / (cam.targetZoom * zf) - wx; cam.targetY = (cy * ry) / (cam.targetZoom * zf) - wy;
          cam.targetZoom *= zf;
        }
        touch.lastDist = d;
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 0 && touch.active && !touch.pinch) {
        const dt = Date.now() - touch.startTime;
        if (dt < 300 && Math.hypot(touch.lx - touch.startX, touch.ly - touch.startY) < 15) {
          const rect = container.getBoundingClientRect();
          const wp = screenToWorld(touch.startX - rect.left, touch.startY - rect.top);
          let bestD = 2, best: PositionedTrack | null = null;
          for (const t of tracksRef.current) { const d = Math.hypot(t.x - wp.x, t.y - wp.y); if (d < bestD) { bestD = d; best = t; } }
          if (best) {
            setSelectedTrack(best); onTrackSelectRef.current?.(best);
            setLabelPos(worldToScreen(best.x, best.y));
            cam.targetX = -best.x; cam.targetY = -best.y;
            cam.targetZoom = Math.max(cam.targetZoom, baseZoomRef.current * 3);
          } else { setSelectedTrack(null); setLabelPos(null); onTrackSelectRef.current?.(null); }
        }
      }
      if (e.touches.length === 0) { touch.active = false; touch.pinch = false; touch.lastDist = 0; }
      else if (e.touches.length === 1 && e.touches[0]) { touch.pinch = false; touch.lastDist = 0; touch.active = true; touch.lx = e.touches[0].clientX; touch.ly = e.touches[0].clientY; }
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    canvas.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    // --- Render loop ---
    const waveStart = performance.now();
    const worldW = bounds.maxX - bounds.minX, worldH = bounds.maxY - bounds.minY;
    const starW = starBounds.maxX - starBounds.minX, starH = starBounds.maxY - starBounds.minY;
    const starCX = (starBounds.minX + starBounds.maxX) / 2, starCY = (starBounds.minY + starBounds.maxY) / 2;
    const starR = Math.sqrt((starW / 2) ** 2 + (starH / 2) ** 2);
    const pad = Math.max(worldW, worldH) * 2;
    const worldCX = (bounds.minX + bounds.maxX) / 2, worldCY = (bounds.minY + bounds.maxY) / 2;
    const panLimits = {
      minX: -(worldCX + worldW / 2 + pad), maxX: -(worldCX - worldW / 2 - pad),
      minY: -(worldCY + worldH / 2 + pad), maxY: -(worldCY - worldH / 2 - pad),
    };

    let rafId: number;
    let frameCount = 0;
    const render = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const baseZoom = baseZoomRef.current;

      // Inertia
      if (!drag.active && !touch.active && (Math.abs(vel.x) > 0.01 || Math.abs(vel.y) > 0.01)) {
        cam.targetX += vel.x; cam.targetY += vel.y; cam.x += vel.x; cam.y += vel.y;
        vel.x *= 0.92; vel.y *= 0.92;
        if (Math.abs(vel.x) < 0.01) vel.x = 0;
        if (Math.abs(vel.y) < 0.01) vel.y = 0;
      }

      cam.targetZoom = Math.max(baseZoom * 0.3, Math.min(baseZoom * 8, cam.targetZoom));
      cam.targetX = Math.max(panLimits.minX, Math.min(panLimits.maxX, cam.targetX));
      cam.targetY = Math.max(panLimits.minY, Math.min(panLimits.maxY, cam.targetY));
      // Faster lerp for snappier feel
      cam.zoom += (cam.targetZoom - cam.zoom) * 0.25;
      cam.x += (cam.targetX - cam.x) * 0.2;
      cam.y += (cam.targetY - cam.y) * 0.2;

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      const aspect = canvas.width / canvas.height, sc = Math.min(canvas.width, canvas.height) / 2;
      const resX = sc * aspect, resY = sc;
      const zr = cam.zoom / baseZoom;

      // Draw star field
      gl.useProgram(pointProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, starTex);
      gl.uniform1i(pL.tex, 0);
      gl.uniform2f(pL.xRange, starBounds.minX, starBounds.maxX);
      gl.uniform2f(pL.yRange, starBounds.minY, starBounds.maxY);
      gl.uniform2f(pL.res, resX, resY);
      gl.uniform2f(pL.offset, cam.x, cam.y);
      gl.uniform1f(pL.zoom, cam.zoom);
      const ps = 1.5 * ((dpr * dpr) / 2) * Math.sqrt(zr);
      gl.uniform1f(pL.ptSize, Math.max(2.5, Math.min(10, ps)));
      gl.uniform1f(pL.opacity, 0.7);
      const elapsed = performance.now() - waveStart;
      gl.uniform1f(pL.wave, (1 - Math.pow(1 - Math.min(elapsed / 2500, 1), 3)) * 1.5);
      gl.uniform2f(pL.center, starCX, starCY);
      gl.uniform1f(pL.radius, starR);
      gl.bindBuffer(gl.ARRAY_BUFFER, idxBuf);
      gl.enableVertexAttribArray(pL.index);
      gl.vertexAttribPointer(pL.index, 1, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.POINTS, 0, starCount);
      gl.disableVertexAttribArray(pL.index);

      // --- Direct DOM updates for art + lines (no React state) ---
      frameCount++;
      const artLayer = artLayerRef.current;
      const svgEl = svgRef.current;
      const currentTracks = tracksRef.current;

      if (artLayer && currentTracks.length > 0) {
        const artSizePx = Math.max(18, Math.min(56, 18 * Math.sqrt(zr)));
        const imgs = artLayer.children;
        for (let i = 0; i < imgs.length && i < currentTracks.length; i++) {
          const t = currentTracks[i];
          const { x: sx, y: sy } = worldToScreen(t.x, t.y);
          const el = imgs[i] as HTMLElement;
          el.style.left = `${sx}px`;
          el.style.top = `${sy}px`;
          el.style.width = `${artSizePx}px`;
          el.style.height = `${artSizePx}px`;
        }
      }

      if (svgEl) {
        const lines = svgEl.querySelectorAll('line');
        const edges = edgesRef.current;
        for (let i = 0; i < lines.length && i < edges.length; i++) {
          const e = edges[i];
          const a = currentTracks[e.from], b = currentTracks[e.to];
          if (a && b) {
            const sa = worldToScreen(a.x, a.y), sb = worldToScreen(b.x, b.y);
            const line = lines[i];
            line.setAttribute('x1', String(sa.x)); line.setAttribute('y1', String(sa.y));
            line.setAttribute('x2', String(sb.x)); line.setAttribute('y2', String(sb.y));
          }
        }
      }

      // Constellation SVG fade-in
      if (svgEl && !svgEl.classList.contains('galaxy-constellation-svg--visible')) {
        svgEl.classList.add('galaxy-constellation-svg--visible');
      }

      // Dark matter node positions (direct DOM)
      const dmLayer = dmLayerRef.current;
      if (dmLayer && propDarkMatter && propDarkMatter.length > 0) {
        const dmSize = Math.max(16, Math.min(36, 14 * Math.sqrt(zr)));
        const dmEls = dmLayer.children;
        for (let i = 0; i < dmEls.length && i < propDarkMatter.length; i++) {
          const dm = propDarkMatter[i];
          const { x: sx, y: sy } = worldToScreen(dm.x, dm.y);
          const el = dmEls[i] as HTMLElement;
          el.style.left = `${sx}px`;
          el.style.top = `${sy}px`;
          el.style.width = `${dmSize}px`;
          el.style.height = `${dmSize}px`;
        }
      }

      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      if (container.contains(canvas)) container.removeChild(canvas);
      gl.deleteTexture(starTex); gl.deleteBuffer(idxBuf); gl.deleteProgram(pointProg);
    };
  }, [worldToScreen, screenToWorld]);

  const handleTrackClick = useCallback((track: PositionedTrack) => {
    setSelectedTrack(track); onTrackSelectRef.current?.(track);
    setLabelPos(worldToScreen(track.x, track.y));
    camRef.current.targetX = -track.x; camRef.current.targetY = -track.y;
    camRef.current.targetZoom = Math.max(camRef.current.targetZoom, baseZoomRef.current * 3);
  }, [worldToScreen]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'CANVAS' || (e.target as HTMLElement).classList.contains('galaxy-backdrop')) {
      setSelectedTrack(null); setLabelPos(null); onTrackSelectRef.current?.(null);
    }
  }, []);

  return (
    <div className="galaxy-backdrop" ref={containerRef} onClick={handleBackdropClick}>
      <div className="galaxy-backdrop__vignette" />

      {/* SVG lines -- mounted once, positions updated directly in rAF, fades in via CSS class */}
      {tracksMounted && edgesRef.current.length > 0 && (
        <svg className="galaxy-constellation-svg" ref={svgRef}>
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {edgesRef.current.map((_, i) => (
            <line key={i} x1="0" y1="0" x2="0" y2="0" className="galaxy-constellation-line" />
          ))}
        </svg>
      )}

      {/* Art images -- mounted once, positions updated directly in rAF */}
      <div className="galaxy-art-layer" ref={artLayerRef}>
        {tracksMounted && tracks.map((t) => (
          <img
            key={t.id}
            className={`galaxy-art-item ${selectedTrack?.id === t.id ? 'galaxy-art-item--selected' : ''}`}
            src={t.artwork ?? undefined}
            alt={t.name}
            title={`${t.name} — ${t.artist}`}
            draggable={false}
            style={{ left: 0, top: 0, width: 24, height: 24 }}
            onClick={(e) => { e.stopPropagation(); handleTrackClick(t); }}
          />
        ))}
      </div>

      {/* Dark matter nodes */}
      {tracksMounted && propDarkMatter && propDarkMatter.length > 0 && (
        <div className="galaxy-art-layer" ref={dmLayerRef}>
          {propDarkMatter.map((dm, i) => (
            <div
              key={`dm-${i}`}
              className="galaxy-dm-node"
              style={{ left: 0, top: 0, width: 24, height: 24 }}
              onClick={(e) => {
                e.stopPropagation();
                setDmTooltip(dm.label);
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
          ))}
        </div>
      )}

      {selectedTrack && labelPos && (
        <div className="galaxy-track-label" style={{ left: labelPos.x + 50, top: labelPos.y, opacity: 1, pointerEvents: 'auto' }}>
          <div className="galaxy-track-label__title">{selectedTrack.name}</div>
          <div className="galaxy-track-label__artist">{selectedTrack.artist}</div>
          <div className="galaxy-track-label__album">{selectedTrack.album}</div>
          <div className="galaxy-track-label__actions">
            <button className="galaxy-track-label__btn" onClick={() => window.open(selectedTrack.spotifyUrl, '_blank')}>Open in Spotify</button>
          </div>
        </div>
      )}

      {/* Dark matter tooltip -- fixed bottom-left */}
      {dmTooltip && (
        <div className="galaxy-dm-tooltip" onClick={() => setDmTooltip(null)}>
          {dmTooltip} — unlock by exploring new sounds
        </div>
      )}

    </div>
  );
};

export default GalaxyCanvas;
