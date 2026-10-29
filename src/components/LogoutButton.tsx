import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

export function LogoutButton() {
  const { logout, error } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <View style={styles.container}>
      {error?.operation === 'logout' ? (
        <Text accessibilityRole="alert" style={styles.error}>Não foi possível sair</Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sair"
        disabled={isLoggingOut}
        onPress={handleLogout}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        {isLoggingOut ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={styles.label}>Sair</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 8 },
  button: { minWidth: 52, minHeight: 36, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  pressed: { opacity: 0.65 },
  label: { color: colors.primary, fontWeight: '700' },
  error: { maxWidth: 120, color: '#B42318', fontSize: 12, textAlign: 'right' },
});
