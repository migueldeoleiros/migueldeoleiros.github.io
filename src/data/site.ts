export const themeStorageKey = 'theme-preference';

export const pageMeta = {
	title: 'Miguel López López | Software Engineer',
	description:
		'Personal landing page of Miguel López López, software engineer and Linux enthusiast. Find my wiki, email, GitHub, and LinkedIn.',
};

export const themeLabels = {
	toggleControl: 'Switch color theme',
	useLightMode: 'Use light mode',
	useDarkMode: 'Use dark mode',
};

export const heroCopy = {
	title: 'Miguel López López',
	tagline: 'Software Engineer and Linux Enthusiast',
	invertTitle: 'migueldeoleiros',
	invertTagline: 'Building software and communities',
};

export type LinkIcon = 'globe' | 'mail' | 'github' | 'linkedin';

export interface SocialLink {
	label: string;
	href: string;
	text: string;
	icon: LinkIcon;
}

export const socialLinks: SocialLink[] = [
	{
		label: 'Wiki',
		href: 'https://wiki.migueldeoleiros.com/',
		text: 'wiki.migueldeoleiros.com',
		icon: 'globe',
	},
	{
		label: 'Email',
		href: 'mailto:migueldeoleiros@gmail.com',
		text: 'migueldeoleiros@gmail.com',
		icon: 'mail',
	},
	{
		label: 'GitHub',
		href: 'https://github.com/migueldeoleiros',
		text: 'github.com/migueldeoleiros',
		icon: 'github',
	},
	{
		label: 'LinkedIn',
		href: 'https://www.linkedin.com/in/migueldeoleiros',
		text: 'linkedin.com/in/migueldeoleiros',
		icon: 'linkedin',
	},
];

export const aboutCopy = {
	heading: 'About me',
	image: {
		src: '/images/profile_human.jpg',
		alt: 'Portrait of Miguel Lopez Lopez',
	},
};

export const heroMotion = {
	mobileBreakpointQuery: '(max-width: 52rem)',
	mobileRadius: 100,
	desktopRadius: 180,
	collapseThreshold: 0.25,
	circleThreshold: 0.75,
	maxTrailMultiplier: 2.6,
	capSegments: 24,
	tailLerpMs: 70,
	radiusLerpMs: 75,
	maxDeltaMs: 64,
	entrySlideMultiplier: 1.15,
	exitSlideMinimum: 16,
	exitSlideMultiplier: 0.9,
	exitFadeDelayMs: 45,
};
