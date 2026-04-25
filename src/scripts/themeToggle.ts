import { themeLabels, themeStorageKey } from '../data/site';

type ThemeName = 'dark' | 'light';

type ThemeTransitionClass = 'theme-transition-expand' | 'theme-transition-retract';

interface ViewTransitionLike {
	ready: Promise<void>;
	finished: Promise<void>;
}

interface DocumentWithViewTransition extends Document {
	startViewTransition?: (updateCallback: () => void | Promise<void>) => ViewTransitionLike;
}

const getSystemTheme = (): ThemeName =>
	window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const prefersReducedMotion = (): boolean =>
	window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const getButtonCenter = (button: HTMLButtonElement): { x: number; y: number } => {
	const rect = button.getBoundingClientRect();
	return {
		x: rect.left + rect.width / 2,
		y: rect.top + rect.height / 2,
	};
};

const getMaxRadius = (x: number, y: number): number => {
	const maxX = Math.max(x, window.innerWidth - x);
	const maxY = Math.max(y, window.innerHeight - y);
	return Math.hypot(maxX, maxY);
};

export const initThemeToggle = (): void => {
	const root = document.documentElement;
	const documentWithTransitions = document as DocumentWithViewTransition;
	const themeToggle = document.querySelector('.theme-toggle');
	const currentTheme = (root.dataset.theme as ThemeName | undefined) || getSystemTheme();

	root.dataset.theme = currentTheme;

	if (!(themeToggle instanceof HTMLButtonElement)) {
		return;
	}

	const setToggleLabel = (theme: ThemeName) => {
		themeToggle.setAttribute(
			'aria-label',
			theme === 'dark' ? themeLabels.useLightMode : themeLabels.useDarkMode
		);
		themeToggle.title = theme === 'dark' ? themeLabels.useLightMode : themeLabels.useDarkMode;
		themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
	};

	const applyTheme = (theme: ThemeName) => {
		root.dataset.theme = theme;
		localStorage.setItem(themeStorageKey, theme);
		setToggleLabel(theme);
	};

	const clearTransitionClasses = () => {
		root.classList.remove('theme-transition-expand', 'theme-transition-retract');
	};

	setToggleLabel(currentTheme);

	themeToggle.addEventListener('click', async () => {
		const nextTheme: ThemeName = root.dataset.theme === 'dark' ? 'light' : 'dark';

		if (!documentWithTransitions.startViewTransition || prefersReducedMotion()) {
			applyTheme(nextTheme);
			return;
		}

		const { x, y } = getButtonCenter(themeToggle);
		const maxRadius = getMaxRadius(x, y);
		const transitionClass: ThemeTransitionClass =
			nextTheme === 'dark' ? 'theme-transition-expand' : 'theme-transition-retract';

		clearTransitionClasses();
		root.classList.add(transitionClass);

		try {
			const transition = documentWithTransitions.startViewTransition(() => {
				applyTheme(nextTheme);
			});

			await transition.ready;

			const keyframes =
				nextTheme === 'dark'
					? [
						{ clipPath: `circle(0px at ${x}px ${y}px)` },
						{ clipPath: `circle(${maxRadius}px at ${x}px ${y}px)` },
					]
					: [
						{ clipPath: `circle(${maxRadius}px at ${x}px ${y}px)` },
						{ clipPath: `circle(0px at ${x}px ${y}px)` },
					];

			const pseudoElement =
				nextTheme === 'dark' ? '::view-transition-new(root)' : '::view-transition-old(root)';

			const animation = document.documentElement.animate(keyframes, {
				duration: 850,
				easing: 'cubic-bezier(0.25, 1, 0.3, 1)',
				fill: 'both',
				pseudoElement,
			} as KeyframeAnimationOptions);

			await Promise.allSettled([transition.finished, animation.finished]);
		} catch {
			applyTheme(nextTheme);
		} finally {
			clearTransitionClasses();
		}
	});
};
