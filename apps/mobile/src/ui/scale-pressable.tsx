import type { ReactNode } from 'react';
import {
  Pressable,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { motion } from '@/src/ui/motion';

type ScalePressableProps = Omit<PressableProps, 'style'> & {
  children: ReactNode;
  pressScale?: number;
  style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
};

export function ScalePressable({
  children,
  pressScale = motion.pressScale,
  style,
  ...props
}: ScalePressableProps) {
  return (
    <Pressable
      {...props}
      style={(state) => [
        typeof style === 'function' ? style(state) : style,
        state.pressed ? { transform: [{ scale: pressScale }] } : null,
      ]}>
      {children}
    </Pressable>
  );
}
