import { particleMotion } from '../data/site';

interface Rgb {
  r: number;
  g: number;
  b: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  size: number;
  seed: number;
  depth: number;
  delay: number;
  wavePhase: number;
  colorT: number;
  color: string;
}

interface SamplePoint {
  x: number;
  y: number;
  alpha: number;
}

interface ShapeTarget {
  element: HTMLElement;
  icon: SVGSVGElement;
  points: SamplePoint[];
  hoverOrder: number;
  focusOrder: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const easeOutCubic = (value: number): number => 1 - (1 - value) ** 3;

const parseColor = (value: string): Rgb | null => {
  const match = value.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);

  if (!match) {
    return null;
  }

  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
  };
};

const mixColor = (from: Rgb, to: Rgb, t: number): string => {
  const ratio = clamp(t, 0, 1);
  const r = Math.round(from.r + (to.r - from.r) * ratio);
  const g = Math.round(from.g + (to.g - from.g) * ratio);
  const b = Math.round(from.b + (to.b - from.b) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
};

/**
 * Renders the hero name as a field of particles that scatter, assemble into the
 * text, drift while idle and are pushed away from the pointer.
 */
export const initParticleText = (): void => {
  const wrap = document.querySelector('.hero-particles');

  if (!(wrap instanceof HTMLElement)) {
    return;
  }

  const canvas = wrap.querySelector('[data-particle-canvas]');
  const title = wrap.querySelector('[data-particle-title]');

  if (!(canvas instanceof HTMLCanvasElement) || !(title instanceof HTMLElement)) {
    return;
  }

  const text = wrap.dataset.particleText?.trim();
  const altText = wrap.dataset.particleAltText?.trim() ?? '';

  if (!text) {
    return;
  }

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return;
  }

  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const hoverQuery = window.matchMedia('(any-hover: hover)');
  const gardenCard = document.querySelector<HTMLElement>('.garden-card');
  const gardenIcon = gardenCard?.querySelector('.garden-base svg');
  const shapeTargets: ShapeTarget[] = [];
  for (const element of document.querySelectorAll<HTMLElement>(
    '.garden-card, .hero-particles [data-particle-shape]',
  )) {
    const icon = element.querySelector(element === gardenCard ? '.garden-base svg' : 'svg');
    if (icon instanceof SVGSVGElement) {
      shapeTargets.push({ element, icon, points: [], hoverOrder: 0, focusOrder: 0 });
    }
  }
  const tagline = wrap.querySelector('.hero-tagline');

  let reduceMotion = reduceMotionQuery.matches;
  let width = 0;
  let height = 0;
  let particles: Particle[] = [];
  let colorFrom: Rgb = { r: 63, g: 63, b: 63 };
  let colorTo: Rgb = { r: 17, g: 17, b: 17 };
  let entranceStart = 0;
  let entranceActive = false;
  let frameId = 0;
  let resizeId = 0;
  let lastFrameTime = 0;
  let visible = true;
  let builtWidth = 0;
  let builtHeight = 0;
  let currentText = text;
  let showingAlt = false;
  let morphing = false;
  let morphStartedAt = 0;
  let activeShape: ShapeTarget | null = null;
  let interactionOrder = 0;
  let buildVersion = 0;
  const textPoints = new Map<string, SamplePoint[]>();

  const pointer = { active: false, id: -1, x: 0, y: 0 };

  const readPalette = (): void => {
    const fromColor = parseColor(getComputedStyle(tagline ?? title).color);
    const toColor = parseColor(getComputedStyle(title).color);

    if (fromColor) {
      colorFrom = fromColor;
    }

    if (toColor) {
      colorTo = toColor;
    }

    for (const particle of particles) {
      particle.color = mixColor(colorFrom, colorTo, particle.colorT);
    }
  };

  const measureProbeFontSize = (fontFamily: string, fontWeight: string): number => {
    const probe = document.createElement('span');
    probe.textContent = 'M';
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    probe.style.fontFamily = fontFamily;
    probe.style.fontWeight = fontWeight;
    probe.style.fontSize = particleMotion.measureFontSize;
    wrap.append(probe);
    const fontSize = Number.parseFloat(getComputedStyle(probe).fontSize) || 96;
    probe.remove();
    return fontSize;
  };

  const sampleStepSize = (): number =>
    width >= particleMotion.viewportWideWidth
      ? Math.max(1, particleMotion.sampleStep)
      : width >= particleMotion.viewportRegularWidth
        ? Math.max(1, particleMotion.sampleStepRegular)
        : Math.max(1, particleMotion.sampleStepNarrow);

  const sampleOffscreen = (
    source: HTMLCanvasElement,
    sourceCtx: CanvasRenderingContext2D,
    offsetX: number,
    offsetY: number,
  ): SamplePoint[] => {
    const data = sourceCtx.getImageData(0, 0, source.width, source.height).data;
    const points: SamplePoint[] = [];
    const step = sampleStepSize();

    for (let y = 0; y < source.height; y += step) {
      const rowPhase = ((y / step) % 2) * (step / 2);
      for (let x = 0; x < source.width; x += step) {
        const alpha = data[(y * source.width + x + rowPhase) * 4 + 3];

        if (alpha > 40) {
          points.push({
            x: offsetX + x,
            y: offsetY + y,
            alpha: alpha / 255,
          });
        }
      }
    }

    return points;
  };

  const collectPoints = (targetText: string): SamplePoint[] => {
    const cached = textPoints.get(targetText);

    if (cached) {
      return cached;
    }

    const styles = getComputedStyle(title);
    const fontFamily = styles.fontFamily || 'sans-serif';
    const fontWeight = styles.fontWeight || '700';
    let fontSize = measureProbeFontSize(fontFamily, fontWeight);
    let font = `${fontWeight} ${fontSize}px ${fontFamily}`;

    const offscreen = document.createElement('canvas');
    const offscreenCtx = offscreen.getContext('2d', { willReadFrequently: true });

    if (!offscreenCtx) {
      return [];
    }

    const maxWidth = width * particleMotion.maxTextWidthRatio;
    offscreenCtx.font = font;
    let metrics = offscreenCtx.measureText(targetText);

    if (metrics.width > maxWidth && metrics.width > 0) {
      fontSize = Math.max(18, (maxWidth / metrics.width) * fontSize);
      font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      offscreenCtx.font = font;
      metrics = offscreenCtx.measureText(targetText);
    }

    const left = Math.ceil(metrics.actualBoundingBoxLeft || 0);
    const right = Math.ceil(metrics.actualBoundingBoxRight || metrics.width);
    const ascent = Math.ceil(metrics.actualBoundingBoxAscent || fontSize * 0.78);
    const descent = Math.ceil(metrics.actualBoundingBoxDescent || fontSize * 0.22);
    const padding = Math.max(12, Math.ceil(fontSize * 0.08));
    const textWidth = Math.max(1, left + right);
    const textHeight = Math.max(1, ascent + descent);

    offscreen.width = textWidth + padding * 2;
    offscreen.height = textHeight + padding * 2;
    offscreenCtx.font = font;
    offscreenCtx.textAlign = 'left';
    offscreenCtx.textBaseline = 'alphabetic';
    offscreenCtx.fillStyle = '#fff';
    offscreenCtx.fillText(targetText, padding - left, padding + ascent);

    const offsetX = width / 2 - offscreen.width / 2;
    const offsetY = height / 2 - offscreen.height / 2;

    const points = sampleOffscreen(offscreen, offscreenCtx, offsetX, offsetY);
    textPoints.set(targetText, points);
    return points;
  };

  const collectTreePoints = (): SamplePoint[] => {
    if (!(gardenIcon instanceof SVGSVGElement) || typeof Path2D === 'undefined') {
      return [];
    }

    const box = gardenIcon.viewBox.baseVal;
    const offscreen = document.createElement('canvas');
    const offscreenCtx = offscreen.getContext('2d', { willReadFrequently: true });

    if (!offscreenCtx || box.width <= 0 || box.height <= 0) {
      return [];
    }

    // Fit the original icon's stroked outline inside the existing hero canvas.
    const scale = Math.min((width * 0.65) / box.width, (height * 0.75) / box.height);
    offscreen.width = Math.max(1, Math.ceil(box.width * scale));
    offscreen.height = Math.max(1, Math.ceil(box.height * scale));
    offscreenCtx.scale(scale, scale);
    offscreenCtx.translate(-box.x, -box.y);
    offscreenCtx.strokeStyle = '#fff';
    offscreenCtx.lineWidth = Number(gardenIcon.getAttribute('stroke-width')) || 2;
    offscreenCtx.lineCap = 'round';
    offscreenCtx.lineJoin = 'round';

    try {
      for (const path of gardenIcon.querySelectorAll('path')) {
        offscreenCtx.stroke(new Path2D(path.getAttribute('d') ?? ''));
      }
    } catch {
      return [];
    }

    return sampleOffscreen(
      offscreen,
      offscreenCtx,
      (width - offscreen.width) / 2,
      (height - offscreen.height) / 2,
    );
  };

  const collectIconPoints = async (
    icon: SVGSVGElement,
    version: number,
  ): Promise<SamplePoint[]> => {
    const box = icon.viewBox.baseVal;
    if (box.width <= 0 || box.height <= 0) {
      return [];
    }

    // Rasterize the actual self-contained SVG: preserve circles/rectangles,
    // strokes and filled brand silhouettes rather than treating every path as a stroke.
    const scale = Math.min((width * 0.65) / box.width, (height * 0.75) / box.height);
    const offscreen = document.createElement('canvas');
    offscreen.width = Math.max(1, Math.ceil(box.width * scale));
    offscreen.height = Math.max(1, Math.ceil(box.height * scale));
    const offscreenCtx = offscreen.getContext('2d', { willReadFrequently: true });
    if (!offscreenCtx) {
      return [];
    }

    const svg = icon.cloneNode(true) as SVGSVGElement;
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('width', String(offscreen.width));
    svg.setAttribute('height', String(offscreen.height));
    svg.style.color = '#fff';
    let url: string | undefined;
    try {
      url = URL.createObjectURL(
        new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }),
      );
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Particle icon could not load'));
        image.src = url!;
      });
      // A resize/font/motion rebuild owns new dimensions and samples now.
      if (version !== buildVersion) {
        return [];
      }
      offscreenCtx.drawImage(image, 0, 0, offscreen.width, offscreen.height);
      return sampleOffscreen(
        offscreen,
        offscreenCtx,
        (width - offscreen.width) / 2,
        (height - offscreen.height) / 2,
      );
    } catch {
      return [];
    } finally {
      if (url) {
        URL.revokeObjectURL(url);
      }
    }
  };

  // Bind the shortest candidate pairs first, then reuse all remaining dots.
  // Some long trips are necessary when the new text has a different footprint.
  const assignNearest = (targets: SamplePoint[], origin: Particle[]): (Particle | null)[] => {
    const cell = 56;
    const cols = Math.max(1, Math.ceil(width / cell) + 2);
    const rows = Math.max(1, Math.ceil(height / cell) + 2);
    const grid: number[][] = Array.from({ length: cols * rows }, () => []);
    const cellIndexOf = (x: number, y: number): number => {
      const gx = clamp(Math.floor(x / cell) + 1, 0, cols - 1);
      const gy = clamp(Math.floor(y / cell) + 1, 0, rows - 1);
      return gy * cols + gx;
    };

    for (let index = 0; index < origin.length; index += 1) {
      grid[cellIndexOf(origin[index].x, origin[index].y)].push(index);
    }

    const maxRing = Math.max(cols, rows);
    const candidatesPerTarget = 16;
    const candidates: { target: number; origin: number; distance: number }[] = [];

    // Collect the nearest handful of origins for every target.
    for (let target = 0; target < targets.length; target += 1) {
      const point = targets[target];
      const gx0 = clamp(Math.floor(point.x / cell) + 1, 0, cols - 1);
      const gy0 = clamp(Math.floor(point.y / cell) + 1, 0, rows - 1);
      const nearest: { target: number; origin: number; distance: number }[] = [];

      for (let ring = 0; ring <= maxRing && nearest.length < candidatesPerTarget; ring += 1) {
        for (let gy = gy0 - ring; gy <= gy0 + ring; gy += 1) {
          if (gy < 0 || gy >= rows) {
            continue;
          }

          for (let gx = gx0 - ring; gx <= gx0 + ring; gx += 1) {
            if (gx < 0 || gx >= cols) {
              continue;
            }

            if (ring > 0 && Math.abs(gx - gx0) !== ring && Math.abs(gy - gy0) !== ring) {
              continue;
            }

            for (const index of grid[gy * cols + gx]) {
              const dx = origin[index].x - point.x;
              const dy = origin[index].y - point.y;
              const distance = dx * dx + dy * dy;
              // Finish the ring, but retain only its nearest candidates. Dense
              // buckets must not inflate the global distance sort unboundedly.
              if (
                nearest.length === candidatesPerTarget &&
                distance >= nearest[nearest.length - 1].distance
              ) {
                continue;
              }

              let position = nearest.length;
              while (position > 0 && distance < nearest[position - 1].distance) {
                position -= 1;
              }
              nearest.splice(position, 0, { target, origin: index, distance });
              if (nearest.length > candidatesPerTarget) {
                nearest.pop();
              }
            }
          }
        }
      }
      candidates.push(...nearest);
    }

    candidates.sort((a, b) => a.distance - b.distance);

    const taken = new Uint8Array(origin.length);
    const matches: (Particle | null)[] = new Array(targets.length).fill(null);

    for (const candidate of candidates) {
      if (taken[candidate.origin] || matches[candidate.target]) {
        continue;
      }

      taken[candidate.origin] = 1;
      matches[candidate.target] = origin[candidate.origin];
    }

    // No distance cap: equal target/origin counts must produce a full bijection.
    for (let target = 0; target < targets.length; target += 1) {
      if (matches[target]) {
        continue;
      }

      const point = targets[target];
      let best = -1;
      let bestDistance = Infinity;

      for (let index = 0; index < origin.length; index += 1) {
        if (taken[index]) {
          continue;
        }

        const dx = origin[index].x - point.x;
        const dy = origin[index].y - point.y;
        const distance = dx * dx + dy * dy;

        if (distance < bestDistance) {
          bestDistance = distance;
          best = index;
        }
      }

      if (best >= 0) {
        taken[best] = 1;
        matches[target] = origin[best];
      }
    }

    return matches;
  };

  const createParticles = (points: SamplePoint[], origin?: Particle[]): Particle[] => {
    if (origin && origin.length > 0) {
      // Evenly cover the sampled text at a fixed population. Sparse text repeats
      // samples instead of dropping dots; dense text is evenly downsampled.
      const targets = origin.map(
        (_, index) => points[Math.floor((index * points.length) / origin.length)],
      );
      const matches = assignNearest(targets, origin);

      return targets.map((point, index) => {
        // Equal counts and the uncapped leftover pass guarantee a match.
        const previous = matches[index]!;
        previous.startX = previous.x;
        previous.startY = previous.y;
        previous.targetX = point.x;
        previous.targetY = point.y;
        return previous;
      });
    }

    const budget = clamp(
      Math.floor((width * height) / particleMotion.density),
      particleMotion.minParticleBudget,
      particleMotion.maxParticleBudget,
    );
    const next: Particle[] = [];
    const indexes: number[] = [];
    const narrow = width < particleMotion.viewportRegularWidth;
    if (narrow) {
      // Use the full capped population without repeating ink coordinates.
      const count = Math.min(points.length, budget);
      for (let index = 0; index < count; index += 1) {
        indexes.push(Math.floor((index * points.length) / count));
      }
    } else {
      // Preserve the existing regular/wide population and appearance.
      const stride = Math.max(1, Math.ceil(points.length / budget));
      points.forEach((_, index) => {
        if (index % stride === 0) {
          indexes.push(index);
        }
      });
    }

    const targets = indexes.map((index) => points[index]);

    targets.forEach((point, order) => {
      const index = indexes[order];
      const seed = ((9301 * index + 49297) % 233280) / 233280;
      const depth = 0.45 + (((233 * index + 97) % 1000) / 1000) * 0.9;
      const colorT = clamp(point.x / Math.max(1, width) + (seed - 0.5) * 0.35, 0, 1);
      const angle = seed * Math.PI * 2;
      const scatter = particleMotion.scatterRadius * (0.35 + depth * particleMotion.scatterSpread);
      const targetX = point.x;
      const targetY = point.y;
      const startX = targetX + Math.cos(angle) * scatter + (seed - 0.5) * 81;
      const startY = targetY + Math.sin(angle) * scatter + (depth - 0.9) * 81;

      next.push({
        x: startX,
        y: startY,
        vx: 0,
        vy: 0,
        startX,
        startY,
        targetX,
        targetY,
        size: narrow ? particleMotion.particleSizeNarrow : particleMotion.particleSize,
        seed,
        depth,
        delay: particleMotion.entranceDelaySpread * seed,
        wavePhase: seed * Math.PI * 2,
        colorT,
        color: mixColor(colorFrom, colorTo, colorT),
      });
    });

    return next;
  };

  const build = (force = false): void => {
    const rect = canvas.getBoundingClientRect();
    const nextWidth = Math.floor(rect.width);
    const nextHeight = Math.floor(rect.height);

    if (nextWidth <= 0 || nextHeight <= 0) {
      return;
    }

    if (!force && nextWidth === builtWidth && nextHeight === builtHeight && particles.length > 0) {
      return;
    }

    builtWidth = nextWidth;
    builtHeight = nextHeight;
    width = nextWidth;
    height = nextHeight;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    readPalette();

    // Samples belong to this dimensions/typography build, not a hover cycle.
    const version = ++buildVersion;
    textPoints.clear();
    const points = collectPoints(currentText);
    collectPoints(text);
    if (altText) {
      collectPoints(altText);
    }
    for (const target of shapeTargets) {
      target.points = !reduceMotion && target.element === gardenCard ? collectTreePoints() : [];
    }
    const gardenEnabled =
      points.length > 0 &&
      shapeTargets.some((target) => target.element === gardenCard && target.points.length > 0) &&
      !reduceMotion &&
      hoverQuery.matches;

    if (gardenCard) {
      gardenCard.toggleAttribute('data-particle-morph', gardenEnabled);
    }

    activeShape = selectShape();
    if (!activeShape?.points.length) {
      activeShape = null;
    }
    morphing = false;

    if (points.length === 0) {
      particles = [];
      return;
    }

    particles = createParticles(points);

    if (activeShape) {
      particles = createParticles(activeShape.points, particles);
    }

    pointer.x = width / 2;
    pointer.y = height / 2;
    pointer.active = false;
    pointer.id = -1;

    if (reduceMotion) {
      for (const particle of particles) {
        particle.x = particle.targetX;
        particle.y = particle.targetY;
      }

      entranceActive = false;
    } else {
      entranceStart = performance.now();
      entranceActive = true;
    }

    if (!reduceMotion && hoverQuery.matches) {
      for (const target of shapeTargets) {
        if (target.element === gardenCard) {
          continue;
        }
        // Warm per-build caches, never rasterize on a pointer/focus event.
        void collectIconPoints(target.icon, version).then((samples) => {
          if (version !== buildVersion) {
            return;
          }
          target.points = samples;
          updateShapes();
        });
      }
    }
  };

  const draw = (time: number): void => {
    ctx.clearRect(0, 0, width, height);

    const frameDelta = lastFrameTime ? Math.min(64, time - lastFrameTime) : 16.67;
    lastFrameTime = time;
    const dt = frameDelta / 16.67;
    // Ease into idle during the latter half of gathering, not after its timeout.
    const handoffProgress = morphing
      ? clamp(((time - morphStartedAt) / particleMotion.morphGatherDurationMs) * 2 - 1, 0, 1)
      : 1;
    const idleBlend = handoffProgress ** 2 * (3 - 2 * handoffProgress);
    const damping = Math.pow(
      particleMotion.morphGatherDamping +
        (particleMotion.inertiaDamping - particleMotion.morphGatherDamping) * idleBlend,
      dt,
    );
    const stiffness =
      particleMotion.morphGatherStiffness +
      (particleMotion.inertiaStiffness - particleMotion.morphGatherStiffness) * idleBlend;
    const elapsed = time - entranceStart;
    let stillEntering = false;

    for (const particle of particles) {
      let targetX = particle.targetX;
      let targetY = particle.targetY;
      let alpha = 1;

      if (entranceActive) {
        const progress = clamp(
          (elapsed - particle.delay) / particleMotion.entranceDurationMs,
          0,
          1,
        );
        const eased = easeOutCubic(progress);
        targetX = particle.startX + (particle.targetX - particle.startX) * eased;
        targetY = particle.startY + (particle.targetY - particle.startY) * eased;
        alpha = progress;

        if (progress < 1) {
          stillEntering = true;
        }
      } else if (!reduceMotion) {
        const waveTime = time * particleMotion.waveTimeScale;
        const phase =
          particle.targetX * particleMotion.waveSpacingX +
          particle.targetY * particleMotion.waveSpacingY +
          particle.wavePhase * 0.25;
        targetX +=
          particleMotion.waveAmplitude *
          idleBlend *
          Math.sin(waveTime * particleMotion.waveSpeed + phase) *
          particle.depth;
        targetY +=
          particleMotion.waveAmplitude *
          idleBlend *
          0.6 *
          Math.cos(waveTime * particleMotion.waveSpeed * 0.85 + phase * 1.1) *
          particle.depth;
      }

      if (pointer.active && !reduceMotion) {
        const dx = particle.x - pointer.x;
        const dy = particle.y - pointer.y;
        const distance = Math.hypot(dx, dy);

        if (distance < particleMotion.pointerRadius && distance > 0.1) {
          const push =
            (1 - distance / particleMotion.pointerRadius) * particleMotion.pointerStrength;
          targetX += (dx / distance) * push;
          targetY += (dy / distance) * push;
        }
      }

      particle.vx += (targetX - particle.x) * stiffness * dt;
      particle.vy += (targetY - particle.y) * stiffness * dt;
      particle.vx *= damping;
      particle.vy *= damping;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;

      ctx.globalAlpha = clamp(particleMotion.minAlpha + particleMotion.alphaRange * alpha, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    if (morphing && time - morphStartedAt >= particleMotion.morphGatherDurationMs) {
      morphing = false;
    }

    if (entranceActive && !stillEntering) {
      entranceActive = false;
    }

    frameId = reduceMotion ? 0 : requestAnimationFrame(draw);
  };

  const start = (): void => {
    if (frameId === 0 && visible && particles.length > 0) {
      frameId = requestAnimationFrame(draw);
    }
  };

  const stop = (): void => {
    if (frameId !== 0) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    }
  };

  const scheduleBuild = (): void => {
    cancelAnimationFrame(resizeId);
    resizeId = requestAnimationFrame(() => {
      build();
      start();
    });
  };

  const updatePointer = (event: PointerEvent): void => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
  };

  const handlePointerDown = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse') {
      return;
    }

    pointer.id = event.pointerId;
    updatePointer(event);
    pointer.active = true;
  };

  const handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse') {
      updatePointer(event);
      pointer.active = true;
      return;
    }

    if (event.pointerId === pointer.id) {
      updatePointer(event);
    }
  };

  const handlePointerEnd = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse') {
      return;
    }

    if (event.pointerId === pointer.id) {
      pointer.id = -1;
      pointer.active = false;
    }
  };

  const handlePointerLeave = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse') {
      pointer.active = false;
    }
  };

  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerleave', handlePointerLeave);
  window.addEventListener('pointerup', handlePointerEnd);
  window.addEventListener('pointercancel', handlePointerEnd);

  const applyMorph = (points: SamplePoint[]): void => {
    if (points.length === 0) {
      return;
    }

    entranceActive = false;
    particles = createParticles(points, particles);

    if (reduceMotion) {
      for (const particle of particles) {
        particle.x = particle.targetX;
        particle.y = particle.targetY;
      }

      morphing = false;
      start();
      return;
    }

    morphing = true;
    morphStartedAt = performance.now();
    start();
  };

  const morphTo = (nextText: string): void => {
    applyMorph(collectPoints(nextText));
  };

  const selectShape = (): ShapeTarget | null => {
    if (reduceMotion || !hoverQuery.matches) {
      return null;
    }
    let selected: ShapeTarget | null = null;
    let latest = 0;
    for (const target of shapeTargets) {
      const order = Math.max(
        target.hoverOrder,
        target.element.matches(':focus-visible') ? target.focusOrder : 0,
      );
      if (order > latest) {
        latest = order;
        selected = target;
      }
    }
    return selected;
  };

  const updateShapes = (): void => {
    const selected = selectShape();
    // An unready latest target falls back to text; an older async completion
    // must never steal the current interaction. Focus survives pointer leave.
    const next = selected?.points.length ? selected : null;
    if (next === activeShape) {
      return;
    }
    activeShape = next;
    applyMorph(next ? next.points : collectPoints(currentText));
  };

  for (const target of shapeTargets) {
    target.element.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
        target.hoverOrder = ++interactionOrder;
        updateShapes();
      }
    });
    const leaveShape = (): void => {
      target.hoverOrder = 0;
      updateShapes();
    };
    target.element.addEventListener('pointerleave', leaveShape);
    target.element.addEventListener('pointercancel', leaveShape);
    target.element.addEventListener('focus', () => {
      target.focusOrder = ++interactionOrder;
      updateShapes();
    });
    target.element.addEventListener('blur', () => {
      target.focusOrder = 0;
      updateShapes();
    });
  }

  const handleHeroToggle = (event: Event): void => {
    if (!altText) {
      return;
    }

    const target = event.target;

    if (target instanceof Element && target.closest('a, button')) {
      return;
    }

    showingAlt = !showingAlt;
    currentText = showingAlt ? altText : text;
    if (!activeShape) {
      morphTo(currentText);
    }
  };

  wrap.addEventListener('click', handleHeroToggle);

  const visibilityObserver = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);

    if (visible) {
      start();
    } else {
      stop();
    }
  });
  visibilityObserver.observe(wrap);

  const themeObserver = new MutationObserver(readPalette);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  colorSchemeQuery.addEventListener('change', readPalette);
  hoverQuery.addEventListener('change', () => {
    for (const target of shapeTargets) {
      target.hoverOrder = 0;
    }
    build(true);
    start();
  });

  reduceMotionQuery.addEventListener('change', (event) => {
    reduceMotion = event.matches;
    build(true);
    start();
  });

  const resizeObserver = new ResizeObserver(scheduleBuild);
  resizeObserver.observe(wrap);

  const initialize = (): void => {
    // A resize may have built with fallback fonts before fonts.ready resolved.
    build(true);
    start();
  };

  if (document.fonts) {
    document.fonts.ready.then(initialize).catch(initialize);
  } else {
    initialize();
  }
};
