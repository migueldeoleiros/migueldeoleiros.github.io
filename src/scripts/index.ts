import { initHeroReveal } from './heroReveal';
import { initThemeToggle } from './themeToggle';

export const initSiteInteractions = (): void => {
	initThemeToggle();
	initHeroReveal();
};

export { initThemeToggle, initHeroReveal };
