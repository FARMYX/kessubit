import { useReducedMotion } from 'react-native-reanimated';

/**
 * Motion is feedback, not decoration. When the OS asks for reduced motion we
 * keep state changes instant and skip entrances/staggers.
 */
export function useMotionPref() {
  const reduced = useReducedMotion() ?? false;
  return { reduced };
}
