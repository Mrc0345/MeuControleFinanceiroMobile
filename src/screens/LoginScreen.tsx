import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { MockCredentialsError } from '../services/authService';
import { ApiError } from '../services/httpClient';
import { colors } from '../theme';
import { RegisterScreen } from './RegisterScreen';

function loginErrorMessage(error: unknown): string {
  if (error instanceof MockCredentialsError) return error.message;
  if (error instanceof ApiError) {
    if (error.kind === 'configuration') return 'O endereço da API não está configurado corretamente.';
    if (error.kind === 'connection') return 'Não foi possível conectar ao servidor. Verifique sua conexão.';
    if (error.kind === 'timeout') return 'O servidor demorou muito para responder. Tente novamente.';
    if (error.status === 401 || error.status === 403) return 'E-mail ou senha inválidos.';
    if (error.kind === 'invalid_response') return 'O servidor respondeu em um formato inesperado.';
  }
  return 'Não foi possível entrar. Tente novamente.';
}

export function LoginScreen() {
  const { login, error, authMode } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showRegistration, setShowRegistration] = useState(false);
  const [registrationNotice, setRegistrationNotice] = useState<string | null>(null);

  async function handleLogin() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !senha) {
      setValidationError('Informe seu e-mail e senha.');
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);
    try {
      await login(normalizedEmail, senha);
    } catch (error) {
      setValidationError(loginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  const contextError = error?.operation === 'login' ? error.message : null;
  const visibleError = validationError ?? contextError;

  if (showRegistration && authMode === 'api') {
    return <RegisterScreen onReturnToLogin={(registeredEmail) => {
      setShowRegistration(false);
      setValidationError(null);
      if (registeredEmail) {
        setEmail(registeredEmail);
        setSenha('');
        setRegistrationNotice('Cadastro concluído. Entre com seu e-mail e senha.');
      }
    }} />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>Meu Controle Financeiro</Text>
          <Text style={styles.subtitle}>Entre para acessar suas finanças</Text>
          {registrationNotice ? <Text accessibilityRole="alert" style={styles.passwordButtonText}>{registrationNotice}</Text> : null}
          {authMode === 'mock' ? (
            <Text accessibilityRole="text" style={styles.demoBadge}>Modo demonstração</Text>
          ) : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              accessibilityLabel="E-mail"
              autoCapitalize="none"
              autoComplete="email"
              editable={!isSubmitting}
              keyboardType="email-address"
              onChangeText={setEmail}
              onSubmitEditing={handleLogin}
              placeholder="seu@email.com"
              placeholderTextColor={colors.muted}
              returnKeyType="next"
              style={styles.input}
              textContentType="username"
              value={email}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Senha</Text>
            <View style={styles.passwordRow}>
              <TextInput
                accessibilityLabel="Senha"
                autoCapitalize="none"
                autoComplete="password"
                editable={!isSubmitting}
                onChangeText={setSenha}
                onSubmitEditing={handleLogin}
                placeholder="Sua senha"
                placeholderTextColor={colors.muted}
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
                textContentType="password"
                value={senha}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                disabled={isSubmitting}
                onPress={() => setShowPassword((visible) => !visible)}
                style={({ pressed }) => [styles.passwordButton, pressed && styles.pressed]}
              >
                <Text style={styles.passwordButtonText}>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
              </Pressable>
            </View>
          </View>

          {visibleError ? (
            <View accessibilityRole="alert" style={styles.errorBox}>
              <Text style={styles.errorText}>{visibleError}</Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Entrar"
            disabled={isSubmitting}
            onPress={handleLogin}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.pressed,
              isSubmitting && styles.buttonDisabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </Pressable>
          {authMode === 'api' ? <Pressable
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={() => { setRegistrationNotice(null); setShowRegistration(true); }}
            style={styles.passwordButton}
          >
            <Text style={styles.passwordButtonText}>Ainda não tem conta? Cadastre-se</Text>
          </Pressable> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 },
  card: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: 18, backgroundColor: colors.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: colors.border },
  title: { textAlign: 'center', color: colors.text, fontSize: 26, fontWeight: '700' },
  subtitle: { marginTop: -8, textAlign: 'center', color: colors.muted, fontSize: 16, lineHeight: 23 },
  demoBadge: { alignSelf: 'center', borderRadius: 999, backgroundColor: '#E6F4FE', color: '#175CD3', fontSize: 12, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 5 },
  fieldGroup: { gap: 8 },
  label: { color: colors.text, fontSize: 15, fontWeight: '600' },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: '#FFFFFF', color: colors.text, paddingHorizontal: 14, fontSize: 16 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: '#FFFFFF' },
  passwordInput: { flex: 1, minHeight: 48, color: colors.text, paddingHorizontal: 14, fontSize: 16 },
  passwordButton: { minWidth: 72, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  passwordButtonText: { color: colors.primary, fontWeight: '700' },
  errorBox: { borderRadius: 8, backgroundColor: '#FEE4E2', paddingHorizontal: 12, paddingVertical: 10 },
  errorText: { color: '#B42318', lineHeight: 20 },
  button: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.primary },
  buttonDisabled: { opacity: 0.7 },
  pressed: { opacity: 0.82 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
