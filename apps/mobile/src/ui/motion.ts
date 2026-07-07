import { Easing } from 'react-native-reanimated';

export const motion = {
  duration: {
    instant: 100,
    fast: 140,
    normal: 200,
    slow: 260,
  },
  easing: {
    /** Strong ease-out for entrances and responsive UI feedback. */
    standard: Easing.bezier(0.23, 1, 0.32, 1),
    /** Strong ease-in-out for on-screen movement and morphs. */
    move: Easing.bezier(0.77, 0, 0.175, 1),
  },
  pressScale: 0.97,
  /** Staggered list-entrance delay, capped so long lists never feel slow. */
  stagger(index: number, step = 24, max = 144) {
    return Math.min(index * step, max);
  },
};
