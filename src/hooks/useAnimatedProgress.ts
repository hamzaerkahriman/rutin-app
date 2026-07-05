import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

// İlerleme değeri her değiştiğinde (0'dan ya da önceki değerden) hedefe doğru
// yumuşakça akan bir Animated.Value döner — halka/bar dolum animasyonlarının
// hepsi bunu paylaşıyor.
export function useAnimatedProgress(target: number, duration = 700) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(value, {
      toValue: target,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [target, duration, value]);

  return value;
}
