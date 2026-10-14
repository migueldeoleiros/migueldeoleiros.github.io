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
    href: 'mailto:hello@migueldeoleiros.com',
    text: 'hello@migueldeoleiros.com',
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

export const particleMotion = {
  measureFontSize: 'clamp(6rem, 18vw, 14rem)',
  maxTextWidthRatio: 0.92,
  sampleStep: 3,
  sampleStepRegular: 4,
  sampleStepNarrow: 5,
  viewportWideWidth: 1024,
  viewportRegularWidth: 640,
  density: 110,
  minParticleBudget: 650,
  maxParticleBudget: 3600,
  particleSize: 4,
  scatterRadius: 180,
  scatterSpread: 0.85,
  entranceDurationMs: 1600,
  entranceDelaySpread: 420,
  morphGatherStiffness: 0.01,
  morphGatherDamping: 0.86,
  morphGatherDurationMs: 1500,

  waveAmplitude: 1.2,
  waveTimeScale: 0.001,
  waveSpeed: 4,
  waveSpacingX: 0.028,
  waveSpacingY: 0.022,
  inertiaStiffness: 0.25,
  inertiaDamping: 0.78,
  pointerRadius: 120,
  pointerStrength: 40,
  minAlpha: 0.35,
  alphaRange: 0.65,
};
