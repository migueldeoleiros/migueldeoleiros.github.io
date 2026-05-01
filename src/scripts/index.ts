import { initGardenReveal } from './gardenReveal';
import { initHeroReveal } from './heroReveal';
import { initThemeToggle } from './themeToggle';

export const initSiteInteractions = (): void => {
  initThemeToggle();
  initHeroReveal();
  initGardenReveal();
};

export { initThemeToggle, initHeroReveal, initGardenReveal };
