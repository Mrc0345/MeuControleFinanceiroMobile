import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { formatMoney, formatTransactionDate } from '../services/dashboardService';
import { ApiError } from '../services/httpClient';
import { deleteTransaction, filterTransactions, listTransactions, saveTransaction, type Transaction, type TransactionFields, type TransactionKind } from '../services/transactionService';
import { colors } from '../theme';

type Editor = { id?: number; tipo: TransactionKind; fields: TransactionFields };

function blankFields(): TransactionFields {
  const today = new Date();
  return { descricao: '', valor: '', categoria: '', forma_pagamento: '',
    data: `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}` };
}

function messageFor(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) return 'Sua sessão expirou ou é inválida. Saia e entre novamente.';
  if (error instanceof ApiError && (error.kind === 'timeout' || error.kind === 'connection')) {
    return `${error.message} Se estava salvando ou excluindo, atualize a lista antes de repetir: a operação pode ter sido recebida.`;
  }
  return error instanceof Error ? error.message : 'Não foi possível concluir a operação.';
}

function Button({ title, onPress, disabled = false, secondary = false, danger = false }: {
  title: string; onPress: () => void; disabled?: boolean; secondary?: boolean; danger?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={[styles.button, secondary && styles.secondary, danger && styles.danger, disabled && styles.disabled]}>
    <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{title}</Text>
  </Pressable>;
}

export function TransactionsManager({ tipo }: { tipo?: TransactionKind }) {
  const { session } = useAuth();
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [month, setMonth] = useState('');
  const [category, setCategory] = useState('');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [busy, setBusy] = useState(false);
  const mutationLock = useRef(false);
  const listRef = useRef<FlatList<Transaction>>(null);
  const mounted = useRef(true);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const accessAllowed = session?.source === 'api' && !!session.token;
  const title = tipo === 'receita' ? 'Receitas' : tipo === 'despesa' ? 'Despesas' : 'Movimentações';
  const refresh = () => { if (!mutationLock.current) setRevision(value => value + 1); };

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setItems([]);
    setLoadError(null);
    setEditor(null);
    setDeleting(null);
    setOperationError(null);
    setLoading(true);
    if (!accessAllowed) {
      setLoading(false);
      return () => controller.abort();
    }
    listTransactions(session, controller.signal)
      .then(data => { if (!controller.signal.aborted) setItems(data); })
      .catch(error => { if (!controller.signal.aborted) setLoadError(messageFor(error)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [session, accessAllowed, revision]));

  let visible: Transaction[] = [];
  let filterError: string | null = null;
  try { visible = filterTransactions(items, month, category, tipo); }
  catch (error) { filterError = messageFor(error); }
  const incomeCents = visible.filter(item => item.tipo === 'receita').reduce((sum, item) => sum + Math.round(item.valor * 100), 0);
  const expenseCents = visible.filter(item => item.tipo === 'despesa').reduce((sum, item) => sum + Math.round(item.valor * 100), 0);

  const start = (kind: TransactionKind, item?: Transaction) => {
    if (mutationLock.current) return;
    setOperationError(null); setNotice(null); setDeleting(null);
    setEditor({ id: item?.id, tipo: kind, fields: item ? {
      descricao: item.descricao, valor: item.valor.toFixed(2).replace('.', ','), data: formatTransactionDate(item.data),
      categoria: item.categoria ?? '', forma_pagamento: item.forma_pagamento ?? '',
    } : blankFields() });
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const mutate = async (operation: () => Promise<void>, success: string) => {
    if (mutationLock.current) return;
    mutationLock.current = true;
    setBusy(true); setOperationError(null); setNotice(null);
    const currentToken = session?.token;
    const stillCurrent = () => mounted.current && sessionRef.current?.token === currentToken;
    try {
      await operation();
      if (stillCurrent()) {
        setEditor(null); setDeleting(null); setNotice(success);
        setRevision(value => value + 1);
      }
    } catch (error) {
      if (stillCurrent()) setOperationError(messageFor(error));
    } finally {
      mutationLock.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const change = (key: keyof TransactionFields, value: string) => {
    setEditor(current => current ? { ...current, fields: { ...current.fields, [key]: value } } : null);
    setOperationError(null);
  };

  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <FlatList<Transaction> ref={listRef} data={accessAllowed && !loading && !loadError && !filterError ? visible : []}
      keyExtractor={item => String(item.id)} contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled" refreshing={loading} onRefresh={refresh}
      ListHeaderComponent={<View style={styles.stack}>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        <Text style={styles.hint}>Organize seus lançamentos e acompanhe cada mês.</Text>
        {!accessAllowed ? <Text accessibilityRole="alert" style={styles.error}>
          As movimentações exigem uma conta real. Configure o modo API e entre novamente.
        </Text> : <>
          <View style={styles.row}>
            {tipo !== 'despesa' && <Button title="Nova receita" disabled={busy || loading || !!loadError} onPress={() => start('receita')} />}
            {tipo !== 'receita' && <Button title="Nova despesa" disabled={busy || loading || !!loadError} onPress={() => start('despesa')} />}
            <Button title="Atualizar lista" secondary disabled={busy || loading} onPress={refresh} />
          </View>
          {notice && <Text accessibilityLiveRegion="polite" style={styles.success}>{notice}</Text>}
          {operationError && <Text accessibilityRole="alert" style={styles.error}>{operationError}</Text>}
          {busy && <ActivityIndicator accessibilityLabel="Salvando alterações" color={colors.primary} />}
          {editor && <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.heading}>
              {editor.id === undefined ? 'Cadastrar' : 'Editar'} {editor.tipo === 'receita' ? 'receita' : 'despesa'}
            </Text>
            <Text style={styles.label}>Descrição</Text>
            <TextInput accessibilityLabel="Descrição" value={editor.fields.descricao} onChangeText={value => change('descricao', value)}
              editable={!busy} maxLength={200} style={styles.input} placeholder="Ex.: mercado ou salário" />
            <Text style={styles.label}>Valor (R$)</Text>
            <TextInput accessibilityLabel="Valor em reais" value={editor.fields.valor} onChangeText={value => change('valor', value)}
              editable={!busy} keyboardType="decimal-pad" style={styles.input} placeholder="Ex.: 1250,50 (sem milhar)" />
            <Text style={styles.label}>Data (DD/MM/AAAA)</Text>
            <TextInput accessibilityLabel="Data DD/MM/AAAA" value={editor.fields.data} onChangeText={value => change('data', value)}
              editable={!busy} maxLength={10} style={styles.input} placeholder="DD/MM/AAAA" />
            <Text style={styles.label}>Categoria (opcional)</Text>
            <TextInput accessibilityLabel="Categoria" value={editor.fields.categoria} onChangeText={value => change('categoria', value)}
              editable={!busy} maxLength={100} style={styles.input} placeholder="Ex.: alimentação" />
            <Text style={styles.label}>Forma de pagamento (opcional)</Text>
            <TextInput accessibilityLabel="Forma de pagamento" value={editor.fields.forma_pagamento} onChangeText={value => change('forma_pagamento', value)}
              editable={!busy} maxLength={50} style={styles.input} placeholder="Ex.: Pix" />
            <View style={styles.row}>
              <Button title="Salvar" disabled={busy} onPress={() => void mutate(
                () => saveTransaction(session, editor.fields, editor.tipo, editor.id), 'Movimentação salva. A lista será atualizada.',
              )} />
              <Button title="Cancelar edição" secondary disabled={busy} onPress={() => { setEditor(null); setOperationError(null); }} />
            </View>
          </View>}
          {deleting && <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.heading}>Excluir movimentação?</Text>
            <Text style={styles.label}>{deleting.descricao} · {formatMoney(deleting.valor)}</Text>
            <Text style={styles.hint}>Esta exclusão não pode ser desfeita.</Text>
            <View style={styles.row}>
              <Button title="Confirmar exclusão" danger disabled={busy} onPress={() => void mutate(
                () => deleteTransaction(session, deleting.id), 'Movimentação excluída. A lista será atualizada.',
              )} />
              <Button title="Manter movimentação" secondary disabled={busy} onPress={() => { setDeleting(null); setOperationError(null); }} />
            </View>
          </View>}
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.heading}>Filtrar lançamentos</Text>
            <Text style={styles.label}>Mês (MM/AAAA; vazio = todo o período)</Text>
            <TextInput accessibilityLabel="Filtrar mês MM/AAAA" value={month} onChangeText={setMonth} maxLength={7}
              placeholder="Ex.: 11/2026" style={styles.input} />
            <Text style={styles.label}>Buscar categoria</Text>
            <TextInput accessibilityLabel="Buscar categoria" value={category} onChangeText={setCategory} style={styles.input} placeholder="Todas as categorias" />
            <Button title="Limpar filtros" secondary onPress={() => { setMonth(''); setCategory(''); }} />
            {filterError && <Text accessibilityRole="alert" style={styles.error}>{filterError}</Text>}
          </View>
          {loading && <ActivityIndicator accessibilityLabel="Carregando movimentações" color={colors.primary} />}
          {loadError && <Text accessibilityRole="alert" style={styles.error}>{loadError} Use Atualizar lista para tentar novamente.</Text>}
          {!loading && !loadError && !filterError && <View style={styles.card}>
            <Text style={styles.heading}>{visible.length} lançamento(s) no filtro</Text>
            {tipo !== 'despesa' && <Text style={styles.success}>Receitas: {formatMoney(incomeCents / 100)}</Text>}
            {tipo !== 'receita' && <Text style={styles.error}>Despesas: {formatMoney(expenseCents / 100)}</Text>}
            {!tipo && <Text style={styles.label}>Saldo do filtro: {formatMoney((incomeCents - expenseCents) / 100)}</Text>}
            <Text style={styles.hint}>O resumo da aba Início continua abrangendo todo o período.</Text>
          </View>}
        </>}
      </View>}
      ListEmptyComponent={accessAllowed && !loading && !loadError && !filterError
        ? <Text style={styles.hint}>Nenhuma movimentação encontrada. Cadastre um lançamento ou ajuste os filtros.</Text> : undefined}
      renderItem={({ item }) => <View style={styles.card}>
        <Text style={styles.heading}>{item.descricao}</Text>
        <Text style={styles.hint}>{item.tipo === 'receita' ? 'Receita' : 'Despesa'} · {formatTransactionDate(item.data)}</Text>
        <Text style={[styles.amount, item.tipo === 'receita' ? styles.success : styles.error]}>{formatMoney(item.valor)}</Text>
        <Text style={styles.hint}>Categoria: {item.categoria || 'Sem categoria'} · Pagamento: {item.forma_pagamento || 'Não informado'}</Text>
        <View style={styles.row}>
          <Button title="Editar" secondary disabled={busy} onPress={() => start(item.tipo, item)} />
          <Button title="Excluir" danger disabled={busy} onPress={() => {
            setEditor(null); setOperationError(null); setNotice(null); setDeleting(item);
            listRef.current?.scrollToOffset({ offset: 0, animated: true });
          }} />
        </View>
      </View>} />
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40, gap: 14, flexGrow: 1 },
  stack: { gap: 14 },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  heading: { fontSize: 18, fontWeight: '600', color: colors.text },
  hint: { fontSize: 14, lineHeight: 21, color: colors.muted },
  label: { fontSize: 16, color: colors.text },
  card: { padding: 18, gap: 10, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.text, backgroundColor: colors.surface, fontSize: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  amount: { fontSize: 22, fontWeight: '700' },
  button: { minHeight: 44, justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: '#B42318' },
  disabled: { opacity: 0.5 },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  secondaryText: { color: colors.text },
  success: { color: colors.primary, fontSize: 16, lineHeight: 24 },
  error: { color: '#B42318', fontSize: 16, lineHeight: 24 },
});
