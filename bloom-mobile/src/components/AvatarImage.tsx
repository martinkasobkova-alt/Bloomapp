/**
 * Avatar zobrazení – podporuje SVG data URI (react-native Image nepodporuje SVG)
 */
import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { getAvatarImageUri } from '../constants/avatarImages';

function extractSvgFromDataUri(uri: string): string | null {
  if (!uri || !uri.startsWith('data:image/svg+xml')) return null;
  try {
    const commaIdx = uri.indexOf(',');
    if (commaIdx === -1) return null;
    return decodeURIComponent(uri.slice(commaIdx + 1));
  } catch {
    return null;
  }
}

interface AvatarImageProps {
  avatar: string;
  customImage?: string | null;
  size?: number;
  style?: object;
}

export function AvatarImage({ avatar, customImage, size = 44, style }: AvatarImageProps) {
  const uri = getAvatarImageUri(avatar, customImage);
  if (!uri) {
    return <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }, style]} />;
  }
  const svgXml = extractSvgFromDataUri(uri);
  if (svgXml) {
    return (
      <View style={[{ width: size, height: size, overflow: 'hidden' }, style]}>
        <SvgXml xml={svgXml} width={size} height={size} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#9DA3AE',
  },
});
