import { useCallback, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getApiBaseUrl } from '../config/api';
import { DashboardRequestError, getDashboardFailure, loadDashboard, type DashboardFailure, type DashboardSummary } from '../services/dashboardService';
import type { RootTabParamList } from '../types/navigation';
import { colors } from '../theme';
import { DashboardActions, DashboardSummary as DashboardSummaryView } from '../components/DashboardSummary';

type Snapshot = { token: string; summary: DashboardSummary; updatedAt: Date };

function Action({ label, onPress, secondary = false, disabled = false }: {
  label: string; onPress: () => void; secondary?: boolean; disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, secondary && styles.secondaryButton, (pressed || disabled) && styles.dimmed]}>
    <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{label}</Text>
  </Pressable>;
}

export function HomeScreen() {
  const { session, logout, error: authError } = useAuth();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList, 'Inicio'>>();
  const { width, fontScale } = useWindowDimensions();
  const onNavigate = (destination: keyof RootTabParamList) => navigation.navigate(destination);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<DashboardFailure | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [revision, setRevision] = useState(0);
  const token = session?.source === 'api' ? session.token : null;
  // Never render a previous user's snapshot, even before the focus effect runs.
  const current = token && snapshot?.token === token ? snapshot : null;
  const summary = current?.summary;
  const demo = session?.source === 'mock';
  const refresh = () => setRevision(value => value + 1);

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setFailure(null);
    if (!token) {
      setSnapshot(null);
      setLoading(false);
      return () => controller.abort();
    }
    setLoading(true);
    const request = async () => {
      let baseUrl: string;
      try { baseUrl = getApiBaseUrl(); }
      catch { throw new DashboardRequestError('Configuração da conexão inválida.', undefined, 'configuration'); }
      return loadDashboard(baseUrl, token, controller.signal);
    };
    request()
      .then(data => { if (!controller.signal.aborted) setSnapshot({ token, summary: data, updatedAt: new Date() }); })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        const next = getDashboardFailure(cause);
        if (next.kind === 'session' || next.kind === 'configuration') setSnapshot(null);
        setFailure(next);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, revision]));

  const leave = async () => {
    if (leaving) return;
    setLeaving(true);
    try { await logout(); } finally { setLeaving(false); }
  };
  const time = current?.updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const updateMessage = loading
    ? current ? `Atualizando. Valores da última consulta, às ${time}.` : 'Carregando suas movimentações…'
    : failure && current ? `Não atualizado. Exibindo a última consulta, às ${time}.`
      : current ? `Atualizado às ${time}.` : '';

  return <ScrollView contentContainerStyle={styles.content}
    refreshControl={<RefreshControl refreshing={loading && !!token} onRefresh={refresh} colors={[colors.primary]} />}>
    <View style={styles.body}>
      <View style={styles.introduction}>
        <Text accessibilityRole="header" style={styles.title}>Resumo financeiro</Text>
        <Text style={styles.subtitle}>Olá, {session?.usuario.nome}. Acompanhe suas movimentações cadastradas.</Text>
      </View>

      {demo ? <View style={styles.notice}>
        <Text accessibilityRole="header" style={styles.heading}>Você está na demonstração</Text>
        <Text style={styles.copy}>Para consultar e cadastrar suas movimentações, entre com uma conta real. A demonstração não contém dados financeiros.</Text>
        <Action label="Sair da demonstração" disabled={leaving} onPress={() => void leave()} />
      </View> : !token ? <View style={styles.notice}>
        <Text style={styles.copy}>Entre novamente para consultar suas movimentações.</Text>
        <Action label="Voltar ao login" disabled={leaving} onPress={() => void leave()} />
      </View> : <>
        <View style={styles.updateRow}>
          <View style={styles.updateStatus}>
            {loading && <ActivityIndicator color={colors.primary} accessibilityLabel="Atualizando resumo" />}
            <Text accessibilityLiveRegion="polite" style={styles.subtitle}>{updateMessage}</Text>
          </View>
          <Action label="Atualizar" secondary disabled={loading} onPress={refresh} />
        </View>
        {failure && <View style={styles.notice}>
          <Text accessibilityRole="alert" style={styles.errorTitle}>{failure.title}</Text>
          <Text style={styles.copy}>{failure.message}</Text>
          {failure.action === 'signOut'
            ? <Action label="Sair para entrar novamente" disabled={leaving} onPress={() => void leave()} />
            : <Action label={failure.action === 'checkConfiguration' ? 'Conferir conexão novamente' : 'Tentar novamente'} disabled={loading} onPress={refresh} />}
        </View>}
        {summary
          ? <DashboardSummaryView summary={summary} width={width} fontScale={fontScale} onNavigate={onNavigate} />
          : <DashboardActions onNavigate={onNavigate} />}
      </>}
      {authError?.operation === 'logout' && <Text accessibilityRole="alert" style={styles.errorTitle}>
        Não foi possível sair. Tente novamente no botão Sair.
      </Text>}
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 36, backgroundColor: colors.background, flexGrow: 1 },
  body: { gap: 24, width: '100%', maxWidth: 720, alignSelf: 'center' },
  introduction: { gap: 8 },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  heading: { fontSize: 18, fontWeight: '600', color: colors.text },
  subtitle: { fontSize: 14, lineHeight: 21, color: colors.muted, flexShrink: 1 },
  copy: { fontSize: 16, lineHeight: 24, color: colors.text },
  updateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' },
  updateStatus: { flexDirection: 'row', gap: 8, alignItems: 'center', flexGrow: 1, flexBasis: 180 },
  notice: { padding: 18, gap: 12, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  errorTitle: { color: '#B42318', fontSize: 18, fontWeight: '600', lineHeight: 26 },
  button: { minHeight: 48, minWidth: 48, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  secondaryButton: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  secondaryButtonText: { color: colors.primary },
  dimmed: { opacity: 0.65 },
});
