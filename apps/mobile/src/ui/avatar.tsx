import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { AppText } from '@/src/ui/text';
import { radius, useTheme } from '@/src/ui/theme';

type AvatarProps = {
  name: string;
  badgeUri?: string | null;
  shape?: 'circle' | 'rounded';
  uri?: string | null;
  size?: number;
};

export function Avatar({ badgeUri, name, shape = 'rounded', size = 36, uri }: AvatarProps) {
  const { colors } = useTheme();
  const [imageFailed, setImageFailed] = useState(false);
  const [badgeFailed, setBadgeFailed] = useState(false);
  const borderRadius = shape === 'circle' ? radius.pill : radius.md;
  const frame = { borderRadius, height: size, width: size };
  const canShowImage = !!uri && /^https?:\/\//.test(uri) && !imageFailed;
  const canShowBadge = !!badgeUri && /^https?:\/\//.test(badgeUri) && !badgeFailed;

  const content = canShowImage ? (
    <Image
      accessibilityLabel={name}
      onError={() => setImageFailed(true)}
      source={{ uri }}
      style={frame}
    />
  ) : (
    <View style={[styles.fallback, frame, { backgroundColor: colors.tintSoft }]}>
      <AppText style={{ color: colors.tint, fontSize: Math.round(size * 0.42) }} variant="bodyStrong">
        {(name.trim() || '?').slice(0, 1).toUpperCase()}
      </AppText>
    </View>
  );

  if (!canShowBadge) {
    return content;
  }

  return (
    <View style={[frame, styles.badged]}>
      {content}
      <View
        style={[
          styles.badgeFrame,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.pill,
            height: Math.max(18, Math.round(size * 0.46)),
            width: Math.max(18, Math.round(size * 0.46)),
          },
        ]}>
        <Image
          accessibilityLabel={`${name} platform`}
          onError={() => setBadgeFailed(true)}
          source={{ uri: badgeUri }}
          style={styles.badgeImage}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badged: {
    overflow: 'visible',
  },
  badgeFrame: {
    borderWidth: 1,
    bottom: -4,
    overflow: 'hidden',
    position: 'absolute',
    right: -4,
  },
  badgeImage: {
    height: '100%',
    width: '100%',
  },
  fallback: {
    alignItems: 'center',
    borderCurve: 'continuous',
    justifyContent: 'center',
  },
});
