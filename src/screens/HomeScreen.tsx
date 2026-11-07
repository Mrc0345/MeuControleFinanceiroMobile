import { useCallback, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getApiBaseUrl } from '../config/api';
import { DashboardRequestError, formatMoney, formatTransactionDate, getDashboardFailure, loadDashboard, recentTransactions, type DashboardFailure, type DashboardSummary } from '../services/dashboardService';
import type { RootTabParamList } from '../types/navigation';
import { colors } from '../theme';

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
  const stacked = width < 380 || fontScale > 1.2;
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
      <Text accessibilityRole="header" style={styles.title}>Resumo financeiro</Text>
      <Text style={styles.subtitle}>Olá, {session?.usuario.nome}. Acompanhe suas movimentações cadastradas.</Text>

      {demo ? <View style={styles.notice}>
        <Text accessibilityRole="header" style={styles.heading}>Você está na demonstração</Text>
        <Text style={styles.copy}>Para consultar e cadastrar suas movimentações, entre com uma conta real. A demonstração não contém dados financeiros.</Text>
        <Action label="Sair da demonstração" disabled={leaving} onPress={() => void leave()} />
      </View> : !token ? <View style={styles.notice}>
        <Text style={styles.copy}>Entre novamente para consultar suas movimentações.</Text>
        <Action label="Voltar ao login" disabled={leaving} onPress={() => void leave()} />
      </View> : <>
        <View style={styles.actions}>
          <Action label="Receitas" onPress={() => navigation.navigate('Receitas')} />
          <Action label="Despesas" secondary onPress={() => navigation.navigate('Despesas')} />
          <Action label="Histórico" secondary onPress={() => navigation.navigate('Movimentacoes')} />
        </View>
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
        {summary && <>
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.heading}>Saldo das movimentações</Text>
            <Text style={styles.period}>Todo o período</Text>
            <Text style={[styles.balance, summary.saldo < 0 && styles.expense]}>{formatMoney(summary.saldo)}</Text>
            <Text style={styles.subtitle}>Receitas menos despesas cadastradas. Este valor não representa o saldo da sua conta bancária.</Text>
          </View>
          <View style={[styles.totals, stacked && styles.stacked]}>
            <View style={[styles.card, styles.total, stacked && styles.stackedBasis]} accessible accessibilityLabel={`Receitas, todo o período, ${formatMoney(summary.receitas)}`}>
              <Text style={styles.label}>Receitas</Text>
              <Text style={[styles.amount, styles.income]}>{formatMoney(summary.receitas)}</Text>
              <Text style={styles.period}>Todo o período</Text>
            </View>
            <View style={[styles.card, styles.total, stacked && styles.stackedBasis]} accessible accessibilityLabel={`Despesas, todo o período, ${formatMoney(summary.despesas)}`}>
              <Text style={styles.label}>Despesas</Text>
              <Text style={[styles.amount, styles.expense]}>{formatMoney(summary.despesas)}</Text>
              <Text style={styles.period}>Todo o período</Text>
            </View>
          </View>
          {summary.transacoes.length === 0 ? <View style={styles.notice}>
            <Text accessibilityRole="header" style={styles.heading}>Comece pela primeira movimentação</Text>
            <Text style={styles.copy}>Abra Receitas ou Despesas e toque em Nova receita ou Nova despesa para cadastrar um lançamento. Ele aparecerá aqui após ser salvo.</Text>
          </View> : <>
            <View style={styles.sectionHeader}>
              <Text accessibilityRole="header" style={styles.section}>Últimas movimentações</Text>
              <Action label="Ver todas" secondary onPress={() => navigation.navigate('Movimentacoes')} />
            </View>
            <View style={styles.list}>
              {recentTransactions(summary.transacoes).map(item => <View key={item.id}
                accessible accessibilityLabel={`${item.tipo === 'receita' ? 'Receita' : 'Despesa'}, ${item.descricao}, ${formatMoney(item.valor)}, ${formatTransactionDate(item.data)}`}
                style={[styles.transaction, stacked && styles.stacked]}>
                <View style={[styles.transactionDescription, stacked && styles.stackedBasis]}>
                  <Text style={styles.description}>{item.descricao}</Text>
                  <Text style={styles.subtitle}>{item.tipo === 'receita' ? 'Receita' : 'Despesa'} · {formatTransactionDate(item.data)}</Text>
                </View>
                <Text style={[styles.transactionAmount, item.tipo === 'receita' ? styles.income : styles.expense, stacked && styles.stackedAmount]}>
                  {item.tipo === 'receita' ? '+' : '−'} {formatMoney(item.valor)}
                </Text>
              </View>)}
            </View>
          </>}
        </>}
      </>}
      {authError?.operation === 'logout' && <Text accessibilityRole="alert" style={styles.errorTitle}>
        Não foi possível sair. Tente novamente no botão Sair.
      </Text>}
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 36, backgroundColor: colors.background, flexGrow: 1 },
  body: { gap: 16, width: '100%', maxWidth: 900, alignSelf: 'center' },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  heading: { fontSize: 18, fontWeight: '600', color: colors.text },
  subtitle: { fontSize: 14, lineHeight: 21, color: colors.muted, flexShrink: 1 },
  copy: { fontSize: 16, lineHeight: 24, color: colors.text },
  period: { fontSize: 14, lineHeight: 21, color: colors.muted },
  card: { padding: 18, gap: 8, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  label: { fontSize: 16, color: colors.text, fontWeight: '600' },
  balance: { fontSize: 30, fontWeight: '700', color: colors.primary, fontVariant: ['tabular-nums'], flexShrink: 1 },
  totals: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  total: { flexGrow: 1, flexBasis: 150, minWidth: 0 },
  amount: { fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  income: { color: colors.primary },
  expense: { color: '#B42318' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  updateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' },
  updateStatus: { flexDirection: 'row', gap: 8, alignItems: 'center', flexGrow: 1, flexBasis: 180 },
  notice: { padding: 18, gap: 12, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  errorTitle: { color: '#B42318', fontSize: 18, fontWeight: '600', lineHeight: 26 },
  sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  section: { fontSize: 20, fontWeight: '700', color: colors.text, flexShrink: 1 },
  list: { backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 16 },
  transaction: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'center' },
  transactionDescription: { flexGrow: 1, flexShrink: 1, flexBasis: 160, gap: 4, minWidth: 0 },
  description: { fontSize: 16, fontWeight: '600', color: colors.text },
  transactionAmount: { fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'], textAlign: 'right', flexShrink: 1 },
  stacked: { flexDirection: 'column', alignItems: 'stretch', flexWrap: 'nowrap' },
  stackedBasis: { flexBasis: 'auto' },
  stackedAmount: { textAlign: 'left' },
  button: { minHeight: 48, minWidth: 48, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  secondaryButton: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  secondaryButtonText: { color: colors.primary },
  dimmed: { opacity: 0.65 },
});
