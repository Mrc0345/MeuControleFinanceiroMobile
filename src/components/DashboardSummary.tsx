import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMoney, formatTransactionDate, recentTransactions, type DashboardSummary as Summary } from '../services/dashboardService';
import { colors } from '../theme';
import type { RootTabParamList } from '../types/navigation';

type Props = {
  summary: Summary;
  width: number;
  fontScale: number;
  onNavigate: (destination: keyof RootTabParamList) => void;
};

export function DashboardActions({ onNavigate }: Pick<Props, 'onNavigate'>) {
  return <View style={styles.actions}>
    {(['Receitas', 'Despesas', 'Movimentacoes'] as const).map(destination => <Pressable
      key={destination} accessibilityRole="button" onPress={() => onNavigate(destination)}
      style={({ pressed }) => [styles.action, destination === 'Receitas' && styles.primaryAction, pressed && styles.pressed]}>
      <Text style={[styles.actionText, destination === 'Receitas' && styles.primaryActionText]}>
        {destination === 'Movimentacoes' ? 'Histórico' : destination}
      </Text>
    </Pressable>)}
  </View>;
}

export function DashboardSummary({ summary, width, fontScale, onNavigate }: Props) {
  const contentWidth = Math.min(width - 40, 720);
  // Reserve room for the complete currency string; use the same text size at every width.
  // This deliberately conservative estimate supplements wrapping and system font scaling.
  const totalWidth = Math.max(...[summary.receitas, summary.despesas].map(value => formatMoney(value).length)) * 22 * 0.62 * fontScale + 32;
  const stackTotals = fontScale > 1.2 || (contentWidth - 12) / 2 < totalWidth;
  const transactions = recentTransactions(summary.transacoes);

  return <View style={styles.sections}>
    <View style={styles.overview}>
      <View style={styles.balanceCard}>
        <View style={styles.balanceHeading}>
          <Text accessibilityRole="header" style={styles.heading}>Saldo das movimentações</Text>
          <Text style={styles.secondary}>Todo o período</Text>
        </View>
        <Text style={[styles.balance, summary.saldo < 0 && styles.expense]}>{formatMoney(summary.saldo)}</Text>
        <Text style={styles.secondary}>Receitas menos despesas cadastradas. Este valor não representa o saldo da sua conta bancária.</Text>
      </View>
      <View style={[styles.totals, stackTotals && styles.stacked]}>
        {(['receitas', 'despesas'] as const).map(kind => <View key={kind}
          style={[styles.total, stackTotals && styles.stackedTotal]} accessible accessibilityLabel={`${kind === 'receitas' ? 'Receitas' : 'Despesas'}, todo o período, ${formatMoney(summary[kind])}`}>
          <Text style={styles.label}>{kind === 'receitas' ? 'Receitas' : 'Despesas'}</Text>
          <Text style={[styles.amount, kind === 'receitas' ? styles.income : styles.expense]}>{formatMoney(summary[kind])}</Text>
          <Text style={styles.secondary}>Todo o período</Text>
        </View>)}
      </View>
    </View>
    <DashboardActions onNavigate={onNavigate} />
    {transactions.length === 0 ? <View style={styles.empty}>
      <Text accessibilityRole="header" style={styles.heading}>Comece pela primeira movimentação</Text>
      <Text style={styles.copy}>Abra Receitas ou Despesas e toque em Nova receita ou Nova despesa para cadastrar um lançamento. Ele aparecerá aqui após ser salvo.</Text>
    </View> : <View style={styles.history}>
      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" style={styles.section}>Últimas movimentações</Text>
        <Pressable accessibilityRole="button" onPress={() => onNavigate('Movimentacoes')}
          style={({ pressed }) => [styles.historyAction, pressed && styles.pressed]}>
          <Text style={styles.actionText}>Ver todas</Text>
        </Pressable>
      </View>
      <View style={styles.list}>
        {transactions.map((item, index) => {
          const amount = `${item.tipo === 'receita' ? '+' : '−'} ${formatMoney(item.valor)}`;
          const stackRow = width < 380 || fontScale > 1.2 || amount.length * 17 * 0.62 * fontScale + 160 + 12 + 32 > contentWidth;
          return <View key={item.id} accessible
            accessibilityLabel={`${item.tipo === 'receita' ? 'Receita' : 'Despesa'}, ${item.descricao}, ${formatMoney(item.valor)}, ${formatTransactionDate(item.data)}`}
            style={[styles.transaction, index > 0 && styles.separator, stackRow && styles.stacked]}>
            <View style={[styles.transactionDescription, stackRow && styles.stackedDescription]}>
              <Text style={styles.description}>{item.descricao}</Text>
              <Text style={styles.secondary}>{item.tipo === 'receita' ? 'Receita' : 'Despesa'} · {formatTransactionDate(item.data)}</Text>
            </View>
            <Text style={[styles.transactionAmount, item.tipo === 'receita' ? styles.income : styles.expense, stackRow && styles.stackedAmount]}>{amount}</Text>
          </View>;
        })}
      </View>
    </View>}
  </View>;
}

// Four-point spacing scale: 4/8 within items, 12 within groups, 24 between sections.
const styles = StyleSheet.create({
  sections: { gap: 24 },
  overview: { gap: 12 },
  balanceCard: { padding: 24, gap: 16, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  balanceHeading: { gap: 4 },
  heading: { fontSize: 18, fontWeight: '600', color: colors.text },
  secondary: { fontSize: 14, lineHeight: 21, color: colors.muted, flexShrink: 1 },
  copy: { fontSize: 16, lineHeight: 24, color: colors.text },
  balance: { fontSize: 32, fontWeight: '700', color: colors.primary, fontVariant: ['tabular-nums'], flexShrink: 1 },
  totals: { flexDirection: 'row', gap: 12 },
  total: { flex: 1, minWidth: 0, padding: 16, gap: 8, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  stackedTotal: { flexGrow: 0, flexBasis: 'auto' },
  label: { fontSize: 16, color: colors.text, fontWeight: '600' },
  amount: { fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  income: { color: colors.primary },
  expense: { color: '#B42318' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { minHeight: 48, minWidth: 48, flexGrow: 1, flexShrink: 1, flexBasis: 96, padding: 12, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: colors.primary, fontSize: 16, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
  primaryAction: { backgroundColor: colors.primary, borderColor: colors.primary },
  primaryActionText: { color: '#FFFFFF' },
  pressed: { opacity: 0.65 },
  empty: { padding: 24, gap: 12, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  history: { gap: 8 },
  sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' },
  section: { fontSize: 20, fontWeight: '700', color: colors.text, flexShrink: 1 },
  historyAction: { minHeight: 48, minWidth: 48, padding: 12, alignItems: 'center', justifyContent: 'center' },
  list: { backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 16 },
  transaction: { flexDirection: 'row', gap: 12, paddingVertical: 16, alignItems: 'center' },
  separator: { borderTopWidth: 1, borderTopColor: colors.border },
  transactionDescription: { flexGrow: 1, flexShrink: 1, flexBasis: 160, gap: 4, minWidth: 0 },
  description: { fontSize: 16, fontWeight: '600', color: colors.text },
  transactionAmount: { fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'], textAlign: 'right', flexShrink: 1 },
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  stackedDescription: { flexBasis: 'auto' },
  stackedAmount: { textAlign: 'left' },
});
