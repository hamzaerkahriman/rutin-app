import { Alert, Platform } from 'react-native';

// react-native-web'in Alert.alert() implementasyonu tamamen no-op
// (`static alert() {}`) — web'de hiçbir şey göstermiyor, hiçbir buton
// callback'i tetiklenmiyor. Onay gerektiren (silme gibi geri alınamaz)
// eylemler için bu yüzden platforma göre gerçek bir dialog kullanıyoruz.
export function confirmAction(title: string, message: string, confirmLabel = 'Tamam'): Promise<boolean> {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      resolve(typeof window !== 'undefined' ? window.confirm(`${title}\n\n${message}`) : false);
      return;
    }
    Alert.alert(title, message, [
      { text: 'Vazgeç', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

// Aynı no-op sorunu basit bilgi/hata mesajları için de geçerli —
// web'de en azından bir şey görünsün diye window.alert'e düşüyor.
export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
