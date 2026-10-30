import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AuthFields } from '../auth/types';
import { validateAuthFields } from '../auth/validation';
import { register } from '../services/authService';
import { colors } from '../theme';

const emptyFields: AuthFields = { nome: '', email: '', senha: '', confirmarSenha: '' };

export function RegisterScreen({ onReturnToLogin }: { onReturnToLogin: (registeredEmail?: string) => void }) {
  const insets = useSafeAreaInsets();
  const [fields, setFields] = useState<AuthFields>(emptyFields);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = (key: keyof AuthFields, value: string) => {
    setFields((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  const submit = async () => {
    const validationError = validateAuthFields('register', fields);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await register(fields.nome, fields.email, fields.senha);
      onReturnToLogin(fields.email.trim());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível conectar ao serviço.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>Meu Controle</Text>
          <Text style={styles.subtitle}>Crie sua conta para começar.</Text>

          <TextInput
            accessibilityLabel="Nome"
            autoCapitalize="words"
            autoComplete="name"
            onChangeText={(value) => updateField('nome', value)}
            placeholder="Nome completo"
            returnKeyType="next"
            style={styles.input}
            value={fields.nome}
          />

          <TextInput
            accessibilityLabel="E-mail"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={(value) => updateField('email', value)}
            placeholder="E-mail"
            returnKeyType="next"
            style={styles.input}
            textContentType="emailAddress"
            value={fields.email}
          />
          <TextInput
            accessibilityLabel="Senha"
            autoCapitalize="none"
            autoComplete="new-password"
            onChangeText={(value) => updateField('senha', value)}
            placeholder="Senha"
            returnKeyType="next"
            secureTextEntry
            style={styles.input}
            textContentType="newPassword"
            value={fields.senha}
          />
          <TextInput
            accessibilityLabel="Confirmar senha"
            autoCapitalize="none"
            autoComplete="new-password"
            onChangeText={(value) => updateField('confirmarSenha', value)}
            onSubmitEditing={() => void submit()}
            placeholder="Confirme sua senha"
            returnKeyType="go"
            secureTextEntry
            style={styles.input}
            textContentType="newPassword"
            value={fields.confirmarSenha}
          />

          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}

          <Pressable accessibilityRole="button" disabled={isSubmitting} onPress={() => void submit()} style={[styles.primaryButton, isSubmitting && styles.disabled]}>
            {isSubmitting ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryText}>Criar conta</Text>}
          </Pressable>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Já tem uma conta?</Text>
            <Pressable accessibilityRole="button" disabled={isSubmitting} onPress={() => onReturnToLogin()}>
              <Text style={styles.link}>Entrar</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 440, alignSelf: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 24, gap: 16 },
  title: { color: colors.text, fontSize: 28, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 23, marginBottom: 4 },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, color: colors.text, fontSize: 16, backgroundColor: colors.surface },
  primaryButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.primary, marginTop: 2 },
  disabled: { opacity: 0.65 },
  primaryText: { color: colors.surface, fontSize: 16, fontWeight: '700' },
  error: { color: '#B42318', fontSize: 14, lineHeight: 20 },
  switchRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6 },
  switchText: { color: colors.muted, fontSize: 14 },
  link: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});
