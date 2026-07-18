export const uiMotion = {
  durationSeconds: {
    fast: 0.12,
    standard: 0.18,
    slow: 0.24,
    celebration: 2,
  },
  press: {
    subtle: { scale: 0.98 },
    control: { scale: 0.96 },
    navigation: { scale: 0.94 },
  },
  spring: {
    navigation: {
      type: "spring",
      stiffness: 420,
      damping: 34,
    },
    overlay: {
      type: "spring",
      bounce: 0,
      duration: 0.24,
    },
    disclosure: {
      type: "spring",
      stiffness: 300,
      damping: 25,
      mass: 0.8,
    },
    disclosureIcon: {
      type: "spring",
      stiffness: 300,
      damping: 20,
    },
    progress: {
      type: "spring",
      stiffness: 200,
      damping: 20,
    },
  },
} as const;

export const reducedMotionTransition = { duration: 0 } as const;
