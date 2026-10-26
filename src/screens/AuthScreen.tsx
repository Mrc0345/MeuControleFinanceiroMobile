import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import type { AuthFields, AuthMode } from '../auth/types';
import { validateAuthFields } from '../auth/validation';
import { register } from '../services/authService';
import { colors } from '../theme';

const emptyFields: AuthFields = { nome: '', email: '', senha: '', confirmarSenha: '' };

export function AuthScreen() {
  const { signIn } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [fields, setFields] = useState<AuthFields>(emptyFields);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const updateField = (key: keyof AuthFields, value: string) => {
    setFields((current) => ({ ...current, [key]: value }));
    setError(null);
    setNotice(null);
  };

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setNotice(null);
  };

  const submit = async () => {
    const validationError = validateAuthFields(mode, fields);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'login') {
        await signIn(fields.email, fields.senha);
      } else {
        await register(fields.nome, fields.email, fields.senha);
        setMode('login');
        setFields({ ...emptyFields, email: fields.email.trim() });
        setNotice('Cadastro concluído. Entre com seu e-mail e senha.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível conectar ao serviço.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>Meu Controle</Text>
          <Text style={styles.subtitle}>{mode === 'login' ? 'Entre para acessar suas finanças.' : 'Crie sua conta para começar.'}</Text>

          {mode === 'register' && <TextInput
            accessibilityLabel="Nome"
            autoCapitalize="words"
            autoComplete="name"
            onChangeText={(value) => updateField('nome', value)}
            placeholder="Nome completo"
            returnKeyType="next"
            style={styles.input}
            value={fields.nome}
          />}

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
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            onChangeText={(value) => updateField('senha', value)}
            placeholder="Senha"
            returnKeyType={mode === 'register' ? 'next' : 'done'}
            secureTextEntry
            style={styles.input}
            textContentType={mode === 'login' ? 'password' : 'newPassword'}
            value={fields.senha}
          />
          {mode === 'register' && <TextInput
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
          />}

          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          {!!notice && <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text>}

          <Pressable accessibilityRole="button" disabled={isSubmitting} onPress={() => void submit()} style={[styles.primaryButton, isSubmitting && styles.disabled]}>
            {isSubmitting ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryText}>{mode === 'login' ? 'Entrar' : 'Criar conta'}</Text>}
          </Pressable>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>{mode === 'login' ? 'Ainda não tem conta?' : 'Já tem uma conta?'}</Text>
            <Pressable accessibilityRole="button" disabled={isSubmitting} onPress={() => changeMode(mode === 'login' ? 'register' : 'login')}>
              <Text style={styles.link}>{mode === 'login' ? 'Cadastre-se' : 'Entrar'}</Text>
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
  notice: { color: colors.primary, fontSize: 14, lineHeight: 20 },
  switchRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6 },
  switchText: { color: colors.muted, fontSize: 14 },
  link: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});
