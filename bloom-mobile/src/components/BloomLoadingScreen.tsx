/**
 * Bloom loading – logo + Bloom text (obrázek ve fialové) – font se načítá později
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, StyleSheet } from 'react-native';
import { LotusLogo } from './LotusLogo';

const BG = '#FCFBFF';
const SUB = '#9DA3AE';

export default function BloomLoadingScreen() {
  const fade = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.04, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoBlock, { opacity: fade, transform: [{ scale: pulse }] }]}>
        <View style={styles.logoRow}>
          <LotusLogo size={56} />
          <Image
            source={require('../../assets/bloom-text.png')}
            style={styles.titleImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.subtitle}>bezpečný prostor pro trans komunitu</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG,
  },
  logoBlock: {
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleImage: {
    height: 36,
    width: 120,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: SUB,
    marginTop: 8,
  },
});
