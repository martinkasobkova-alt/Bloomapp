import React from 'react';
import { Image, StyleSheet } from 'react-native';

interface LotusLogoProps {
  size?: number;
}

export function LotusLogo({ size = 40 }: LotusLogoProps) {
  return (
    <Image
      source={require('../../assets/lotus-logo.png')}
      style={[styles.logo, { width: size, height: size }]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  logo: {},
});
