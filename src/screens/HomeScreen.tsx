import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { formatMoney, formatTransactionDate, loadDashboard, recentTransactions, type DashboardSummary } from '../services/dashboardService';
import { colors } from '../theme';

export function HomeScreen() {
  const { session } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const token = session?.token;
  const refresh = () => setRevision((current) => current + 1);

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    setSummary(null);
    setError(null);
    if (!token) { setLoading(false); return () => controller.abort(); }
    loadDashboard(process.env.EXPO_PUBLIC_API_URL, token, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setSummary(data); })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o resumo.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, revision]));

  return (
    <ScrollView contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} colors={[colors.primary]} />}>
      <Text accessibilityRole="header" style={styles.title}>Resumo financeiro</Text>
      <Text style={styles.subtitle}>Olá, {session?.usuario.nome}. Veja o total das suas movimentações cadastradas.</Text>
      {loading && <View style={styles.message}>
        <ActivityIndicator color={colors.primary} accessibilityLabel="Carregando resumo financeiro" />
        <Text style={styles.subtitle}>Carregando suas finanças...</Text>
      </View>}
      {error && <View style={styles.message}>
        <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
        <Pressable accessibilityRole="button" onPress={refresh} style={styles.button}>
          <Text style={styles.buttonText}>Tentar novamente</Text>
        </Pressable>
      </View>}
      {summary && <>
        <View style={styles.card}>
          <Text style={styles.label}>Saldo atual</Text>
          <Text style={[styles.balance, summary.saldo < 0 && styles.expense]}>{formatMoney(summary.saldo)}</Text>
          <Text style={styles.subtitle}>Receitas menos despesas · todo o período</Text>
        </View>
        <View style={styles.totals}>
          <View style={[styles.card, styles.total]}>
            <Text style={styles.label}>Receitas</Text>
            <Text style={[styles.amount, styles.income]}>{formatMoney(summary.receitas)}</Text>
          </View>
          <View style={[styles.card, styles.total]}>
            <Text style={styles.label}>Despesas</Text>
            <Text style={[styles.amount, styles.expense]}>{formatMoney(summary.despesas)}</Text>
          </View>
        </View>
        <Text accessibilityRole="header" style={styles.section}>Últimas movimentações</Text>
        {summary.transacoes.length === 0
          ? <View style={styles.card}><Text style={styles.subtitle}>Nenhuma movimentação cadastrada.</Text></View>
          : recentTransactions(summary.transacoes).map((item) => <View key={item.id} style={styles.card}>
            <Text style={styles.description}>{item.descricao}</Text>
            <Text style={styles.subtitle}>{item.tipo === 'receita' ? 'Receita' : 'Despesa'} · {formatTransactionDate(item.data)}</Text>
            <Text style={[styles.amount, item.tipo === 'receita' ? styles.income : styles.expense]}>
              {item.tipo === 'receita' ? '+' : '−'} {formatMoney(item.valor)}
            </Text>
          </View>)}
      </>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 32, gap: 14, backgroundColor: colors.background, flexGrow: 1 },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, lineHeight: 21, color: colors.muted },
  card: { padding: 18, gap: 8, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  label: { fontSize: 16, color: colors.muted, fontWeight: '600' },
  balance: { fontSize: 32, fontWeight: '700', color: colors.primary },
  totals: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  total: { flexGrow: 1, flexBasis: 140, minWidth: 140 },
  amount: { fontSize: 20, fontWeight: '700' },
  income: { color: colors.primary },
  expense: { color: '#B42318' },
  section: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 8 },
  description: { fontSize: 16, fontWeight: '600', color: colors.text },
  message: { paddingVertical: 24, gap: 14, alignItems: 'center' },
  error: { color: '#B42318', fontSize: 16, lineHeight: 24 },
  button: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, backgroundColor: colors.primary },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
