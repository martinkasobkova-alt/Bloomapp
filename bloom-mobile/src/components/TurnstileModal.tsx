import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { WEB_URL, TURNSTILE_SITE_KEY } from '../config/api';

const COLORS = {
  violet: '#8A7CFF',
  text: '#2F3441',
  sub: '#5D6472',
  bg: '#F8F7FC',
  white: '#FFFFFF',
  border: '#E5E3ED',
};

interface TurnstileModalProps {
  visible: boolean;
  onToken: (token: string) => void;
  onCancel: () => void;
}

export function TurnstileModal({ visible, onToken, onCancel }: TurnstileModalProps) {
  const turnstileUrl = WEB_URL && TURNSTILE_SITE_KEY
    ? `${WEB_URL.replace(/\/$/, '')}/turnstile.html?sitekey=${encodeURIComponent(TURNSTILE_SITE_KEY)}`
    : '';

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.token) {
        onToken(data.token);
      }
    } catch {
      // ignore parse errors
    }
  };

  if (!turnstileUrl) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>Ověření proti robotům</Text>
          <Text style={styles.subtitle}>Prosím dokončete ověření</Text>
          <View style={styles.webviewWrap}>
            <WebView
              source={{ uri: turnstileUrl }}
              onMessage={handleMessage}
              style={styles.webview}
              originWhitelist={['*']}
              javaScriptEnabled
            />
          </View>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>Zrušit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  box: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.sub,
    marginBottom: 16,
  },
  webviewWrap: {
    height: 80,
    marginBottom: 16,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  cancelBtn: {
    padding: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: COLORS.violet,
  },
});
