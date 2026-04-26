import { heroMotion } from '../data/site';

export const initHeroReveal = (): void => {
  const hero = document.querySelector('.hero-surface');

  if (!(hero instanceof HTMLElement)) {
    return;
  }

  hero.dataset.interactive = 'true';

  const getTargetRadius = () =>
    window.matchMedia(heroMotion.mobileBreakpointQuery).matches
      ? heroMotion.mobileRadius
      : heroMotion.desktopRadius;

  const isMobileReveal = () => window.matchMedia(heroMotion.mobileBreakpointQuery).matches;

  const bounds = hero.getBoundingClientRect();
  let targetX = bounds.width / 2;
  let targetY = bounds.height / 2;
  let headX = targetX;
  let headY = targetY;
  let tailX = targetX;
  let tailY = targetY;
  let targetRadius = 0;
  let currentRadius = 0;
  let rafId = 0;
  let lastTime = 0;
  let isHovering = false;
  let exitFadeTimer = 0;
  const invertLayer = hero.querySelector('.hero-invert');

  if (!(invertLayer instanceof HTMLElement)) {
    return;
  }

  hero.style.setProperty('--mx', `${headX}px`);
  hero.style.setProperty('--my', `${headY}px`);
  hero.style.setProperty('--radius', '0px');
  invertLayer.style.clipPath = `circle(0px at ${headX}px ${headY}px)`;
  invertLayer.style.webkitClipPath = `circle(0px at ${headX}px ${headY}px)`;

  const setTargetPosition = (event: MouseEvent | PointerEvent) => {
    const nextBounds = hero.getBoundingClientRect();
    targetX = event.clientX - nextBounds.left;
    targetY = event.clientY - nextBounds.top;
  };

  const getNearestEdgeDirection = (x: number, y: number, bounds: DOMRect) => {
    const fromLeft = x;
    const fromRight = bounds.width - x;
    const fromTop = y;
    const fromBottom = bounds.height - y;
    const nearest = Math.min(fromLeft, fromRight, fromTop, fromBottom);

    if (nearest === fromLeft) {
      return { x: 1, y: 0 };
    }

    if (nearest === fromRight) {
      return { x: -1, y: 0 };
    }

    if (nearest === fromTop) {
      return { x: 0, y: 1 };
    }

    return { x: 0, y: -1 };
  };

  const getPointerExitDirection = (event: MouseEvent, bounds: DOMRect) => {
    const localX = event.clientX - bounds.left;
    const localY = event.clientY - bounds.top;
    const overflowLeft = Math.max(0, -localX);
    const overflowRight = Math.max(0, localX - bounds.width);
    const overflowTop = Math.max(0, -localY);
    const overflowBottom = Math.max(0, localY - bounds.height);

    if (overflowLeft === 0 && overflowRight === 0 && overflowTop === 0 && overflowBottom === 0) {
      return null;
    }

    const horizontalExit = overflowLeft > 0 ? -overflowLeft : overflowRight;
    const verticalExit = overflowTop > 0 ? -overflowTop : overflowBottom;

    if (Math.abs(horizontalExit) > Math.abs(verticalExit)) {
      return { x: Math.sign(horizontalExit), y: 0 };
    }

    return { x: 0, y: Math.sign(verticalExit) };
  };

  const updateRevealShape = () => {
    const radius = Math.max(0, currentRadius);
    const dx = headX - tailX;
    const dy = headY - tailY;
    const distance = Math.hypot(dx, dy);

    if (radius < heroMotion.collapseThreshold) {
      const collapsed = `circle(0px at ${headX}px ${headY}px)`;
      invertLayer.style.clipPath = collapsed;
      invertLayer.style.webkitClipPath = collapsed;
      return;
    }

    if (distance < heroMotion.circleThreshold) {
      const circle = `circle(${radius}px at ${headX}px ${headY}px)`;
      invertLayer.style.clipPath = circle;
      invertLayer.style.webkitClipPath = circle;
      return;
    }

    const unitX = dx / distance;
    const unitY = dy / distance;
    const normalX = -unitY;
    const normalY = unitX;
    const maxTrail = radius * heroMotion.maxTrailMultiplier;
    const clampedDistance = Math.min(distance, maxTrail);
    const tailAnchorX = headX - unitX * clampedDistance;
    const tailAnchorY = headY - unitY * clampedDistance;
    const points: string[] = [];

    for (let index = 0; index <= heroMotion.capSegments; index += 1) {
      const t = (index / heroMotion.capSegments) * Math.PI;
      const x = headX + normalX * Math.cos(t) * radius + unitX * Math.sin(t) * radius;
      const y = headY + normalY * Math.cos(t) * radius + unitY * Math.sin(t) * radius;
      points.push(`${x} ${y}`);
    }

    for (let index = 0; index <= heroMotion.capSegments; index += 1) {
      const t = (index / heroMotion.capSegments) * Math.PI;
      const x = tailAnchorX - normalX * Math.cos(t) * radius - unitX * Math.sin(t) * radius;
      const y = tailAnchorY - normalY * Math.cos(t) * radius - unitY * Math.sin(t) * radius;
      points.push(`${x} ${y}`);
    }

    const capsulePath = `path('M ${points.join(' L ')} Z')`;
    invertLayer.style.clipPath = capsulePath;
    invertLayer.style.webkitClipPath = capsulePath;
  };

  const stopIfSettled = () => {
    const isPositionSettled =
      Math.abs(targetX - headX) < 0.35 &&
      Math.abs(targetY - headY) < 0.35 &&
      Math.abs(headX - tailX) < 0.35 &&
      Math.abs(headY - tailY) < 0.35;
    const isRadiusSettled = Math.abs(targetRadius - currentRadius) < 0.5;

    if (!(isPositionSettled && isRadiusSettled)) {
      return false;
    }

    rafId = 0;
    lastTime = 0;
    return true;
  };

  const animate = (time: number) => {
    if (lastTime === 0) {
      lastTime = time;
    }

    const delta = Math.min(heroMotion.maxDeltaMs, time - lastTime);
    lastTime = time;

    const tailAlpha = 1 - Math.exp(-delta / heroMotion.tailLerpMs);
    const radiusAlpha = 1 - Math.exp(-delta / heroMotion.radiusLerpMs);

    headX = targetX;
    headY = targetY;
    tailX += (headX - tailX) * tailAlpha;
    tailY += (headY - tailY) * tailAlpha;
    currentRadius += (targetRadius - currentRadius) * radiusAlpha;

    hero.style.setProperty('--mx', `${headX}px`);
    hero.style.setProperty('--my', `${headY}px`);
    hero.style.setProperty('--radius', `${Math.max(0, currentRadius)}px`);
    updateRevealShape();

    if (stopIfSettled()) {
      return;
    }

    rafId = requestAnimationFrame(animate);
  };

  const ensureAnimation = () => {
    if (rafId !== 0) {
      return;
    }

    rafId = requestAnimationFrame(animate);
  };

  const beginReveal = (event: MouseEvent | PointerEvent) => {
    isHovering = true;
    if (exitFadeTimer !== 0) {
      window.clearTimeout(exitFadeTimer);
      exitFadeTimer = 0;
    }
    hero.dataset.hover = 'true';
    setTargetPosition(event);
    const bounds = hero.getBoundingClientRect();
    const localX = event.clientX - bounds.left;
    const localY = event.clientY - bounds.top;
    const entryRadius = getTargetRadius();
    const shouldSkipEntrySlide = event.pointerType === 'touch' || isMobileReveal();

    if (shouldSkipEntrySlide) {
      headX = targetX;
      headY = targetY;
    } else {
      const direction = getNearestEdgeDirection(localX, localY, bounds);
      const slideDistance = entryRadius * heroMotion.entrySlideMultiplier;
      headX = targetX - direction.x * slideDistance;
      headY = targetY - direction.y * slideDistance;
    }

    tailX = headX;
    tailY = headY;
    currentRadius = entryRadius;
    hero.style.setProperty('--mx', `${headX}px`);
    hero.style.setProperty('--my', `${headY}px`);
    hero.style.setProperty('--radius', `${currentRadius}px`);
    updateRevealShape();
    targetRadius = entryRadius;
    ensureAnimation();
  };

  const endReveal = (event: MouseEvent | PointerEvent) => {
    isHovering = false;
    hero.dataset.hover = 'true';

    if (event.pointerType === 'touch' || isMobileReveal()) {
      targetX = headX;
      targetY = headY;
      targetRadius = 0;
      ensureAnimation();
      exitFadeTimer = window.setTimeout(() => {
        hero.dataset.hover = 'false';
        exitFadeTimer = 0;
      }, heroMotion.exitFadeDelayMs);
      return;
    }

    const bounds = hero.getBoundingClientRect();
    const pointerExitDirection = getPointerExitDirection(event as MouseEvent, bounds);
    const movementX = headX - tailX;
    const movementY = headY - tailY;
    const movementLength = Math.hypot(movementX, movementY);
    let exitX = 0;
    let exitY = 0;

    if (pointerExitDirection !== null) {
      exitX = pointerExitDirection.x;
      exitY = pointerExitDirection.y;
    } else if (movementLength > 0.1) {
      exitX = movementX / movementLength;
      exitY = movementY / movementLength;
    } else {
      const inwardDirection = getNearestEdgeDirection(headX, headY, bounds);
      exitX = -inwardDirection.x;
      exitY = -inwardDirection.y;
    }

    const slideDistance = Math.max(
      heroMotion.exitSlideMinimum,
      currentRadius * heroMotion.exitSlideMultiplier,
    );
    targetX = headX + exitX * slideDistance;
    targetY = headY + exitY * slideDistance;
    targetRadius = currentRadius;
    ensureAnimation();
    exitFadeTimer = window.setTimeout(() => {
      hero.dataset.hover = 'false';
      exitFadeTimer = 0;
    }, heroMotion.exitFadeDelayMs);
  };

  hero.addEventListener('mouseenter', beginReveal);

  const handleMove = (event: MouseEvent | PointerEvent) => {
    setTargetPosition(event);
    ensureAnimation();
  };

  if ('PointerEvent' in window) {
    hero.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'touch') {
        beginReveal(event);
      }
    });

    hero.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
        handleMove(event);
        return;
      }

      if (event.pointerType === 'touch' && isHovering) {
        handleMove(event);
      }
    });

    hero.addEventListener('pointerup', (event) => {
      if (event.pointerType === 'touch' && isHovering) {
        endReveal(event);
      }
    });

    hero.addEventListener('pointercancel', (event) => {
      if (event.pointerType === 'touch' && isHovering) {
        endReveal(event);
      }
    });
  } else {
    hero.addEventListener('mousemove', handleMove);
  }

  hero.addEventListener('mouseleave', endReveal);

  window.addEventListener('resize', () => {
    if (isHovering) {
      targetRadius = getTargetRadius();
      ensureAnimation();
    }
  });
};
