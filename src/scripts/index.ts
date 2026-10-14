import { initParticleText } from './particleText';
import { initThemeToggle } from './themeToggle';

export const initSiteInteractions = (): void => {
  initThemeToggle();
  initParticleText();
};

export { initThemeToggle, initParticleText };
