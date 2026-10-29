import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { AppNavigator } from '../navigation/AppNavigator';
import { LoginScreen } from '../screens/LoginScreen';
import { colors } from '../theme';

export function AuthGate() {
  const { status, retryRestore } = useAuth();
  const insets = useSafeAreaInsets();
  const [isRetrying, setIsRetrying] = useState(false);

  async function handleRetry() {
    if (isRetrying) return;
    setIsRetrying(true);
    try {
      await retryRestore();
    } finally {
      setIsRetrying(false);
    }
  }

  if (status === 'loading') {
    return (
      <View accessibilityRole="alert" style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.message}>Restaurando sessão...</Text>
      </View>
    );
  }

  if (status === 'authenticated') return <AppNavigator />;

  if (status === 'error') {
    return (
      <View style={[styles.centered, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.errorCard}>
          <Text accessibilityRole="header" style={styles.title}>Não foi possível acessar sua sessão</Text>
          <Text style={styles.message}>Tente novamente. Os dados financeiros só serão liberados após uma sessão válida.</Text>
          <Pressable
            accessibilityRole="button"
            disabled={isRetrying}
            onPress={handleRetry}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            {isRetrying ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Tentar novamente</Text>}
          </Pressable>
        </View>
      </View>
    );
  }

  return <LoginScreen />;
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, paddingHorizontal: 24 },
  errorCard: { width: '100%', maxWidth: 420, alignItems: 'center', gap: 16, backgroundColor: colors.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#F3C4BF' },
  title: { fontSize: 22, lineHeight: 28, textAlign: 'center', fontWeight: '700', color: colors.text },
  message: { marginTop: 12, textAlign: 'center', color: colors.muted, fontSize: 16, lineHeight: 23 },
  button: { minHeight: 48, minWidth: 180, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.primary, paddingHorizontal: 20 },
  pressed: { opacity: 0.85 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
