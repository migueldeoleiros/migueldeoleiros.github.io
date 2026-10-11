import { initGardenReveal } from './gardenReveal';
import { initHeroReveal } from './heroReveal';
import { initParticleText } from './particleText';
import { initThemeToggle } from './themeToggle';

export const initSiteInteractions = (): void => {
  initThemeToggle();
  initParticleText();
  initHeroReveal();
  initGardenReveal();
};

export { initThemeToggle, initParticleText, initHeroReveal, initGardenReveal };
