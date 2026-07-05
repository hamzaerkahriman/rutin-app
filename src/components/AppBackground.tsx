import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { BackgroundDef } from '../theme/backgrounds';

export function AppBackground({
  background,
  children,
}: {
  background: BackgroundDef;
  children?: React.ReactNode;
}) {
  if (background.type === 'image') {
    return (
      <View style={StyleSheet.absoluteFill}>
        <Image source={background.source} style={StyleSheet.absoluteFill} resizeMode="cover" />
        {/* Metin okunabilirliği için hafif karartma */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.28)' }]} />
        {children}
      </View>
    );
  }

  return (
    <LinearGradient colors={background.colors} style={StyleSheet.absoluteFill}>
      {children}
    </LinearGradient>
  );
}
