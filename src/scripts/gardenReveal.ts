const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const hasHoverPointer = (): boolean => window.matchMedia('(any-hover: hover)').matches;

const supportsClipPath = (): boolean =>
  CSS.supports('clip-path', 'circle(1px at 50% 50%)') ||
  CSS.supports('-webkit-clip-path', 'circle(1px at 50% 50%)');

const getLocalPoint = (card: HTMLElement, event: PointerEvent): { x: number; y: number } => {
  const bounds = card.getBoundingClientRect();

  return {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  };
};

const getCoverRadius = (card: HTMLElement, x: number, y: number): number => {
  const bounds = card.getBoundingClientRect();
  const maxX = Math.max(x, bounds.width - x);
  const maxY = Math.max(y, bounds.height - y);

  return Math.hypot(maxX, maxY);
};

export const initGardenReveal = (): void => {
  const card = document.querySelector('.garden-card');

  if (
    !(card instanceof HTMLElement) ||
    !supportsClipPath() ||
    prefersReducedMotion() ||
    !hasHoverPointer()
  ) {
    return;
  }

  let currentRadius = 0;
  let startRadius = 0;
  let targetRadius = 0;
  let startTime = 0;
  let rafId = 0;
  let leaveTimeoutId = 0;
  const duration = 420;
  const leaveDelay = 150;

  const setReveal = (x: number, y: number, radius: number) => {
    card.style.setProperty('--garden-mx', `${x}px`);
    card.style.setProperty('--garden-my', `${y}px`);
    card.style.setProperty('--garden-radius', `${Math.max(0, radius)}px`);
  };

  const stopAnimation = () => {
    if (rafId !== 0) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };

  const stopLeaveDelay = () => {
    if (leaveTimeoutId !== 0) {
      window.clearTimeout(leaveTimeoutId);
      leaveTimeoutId = 0;
    }
  };

  const animateTo = (x: number, y: number, radius: number) => {
    stopLeaveDelay();
    stopAnimation();
    startRadius = currentRadius;
    targetRadius = radius;
    startTime = 0;

    const animate = (time: number) => {
      if (startTime === 0) {
        startTime = time;
      }

      const progress = Math.min(1, (time - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      currentRadius = startRadius + (targetRadius - startRadius) * eased;
      setReveal(x, y, currentRadius);

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
        return;
      }

      rafId = 0;
    };

    rafId = requestAnimationFrame(animate);
  };

  card.dataset.interactive = 'true';
  setReveal(0, 0, 0);

  card.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') {
      return;
    }

    const { x, y } = getLocalPoint(card, event);
    setReveal(x, y, currentRadius);
    animateTo(x, y, getCoverRadius(card, x, y));
  });

  card.addEventListener('pointerleave', (event) => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') {
      return;
    }

    const { x, y } = getLocalPoint(card, event);
    stopLeaveDelay();

    leaveTimeoutId = window.setTimeout(() => {
      leaveTimeoutId = 0;
      currentRadius = getCoverRadius(card, x, y);
      setReveal(x, y, currentRadius);
      animateTo(x, y, 0);
    }, leaveDelay);
  });
};
