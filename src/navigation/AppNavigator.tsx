import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { AuthScreen } from '../screens/AuthScreen';
import { useAuth } from '../auth/AuthContext';
import { HomeScreen } from '../screens/HomeScreen';
import { IncomeScreen } from '../screens/IncomeScreen';
import { ExpensesScreen } from '../screens/ExpensesScreen';
import { TransactionsScreen } from '../screens/TransactionsScreen';
import { colors } from '../theme';
import type { RootTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<RootTabParamList>();
const icons: Record<keyof RootTabParamList, string> = {
  Inicio: '⌂', Receitas: '+', Despesas: '−', Movimentacoes: '↔',
};

export function AppNavigator() {
  const { session, isRestoring, signOut } = useAuth();

  if (isRestoring) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.primary} accessibilityLabel="Carregando sessão" />
    </View>;
  }

  if (!session) return <AuthScreen />;

  return (
    <NavigationContainer theme={{ ...DefaultTheme, colors: {
      ...DefaultTheme.colors, primary: colors.primary, background: colors.background,
      card: colors.surface, text: colors.text, border: colors.border,
    } }}>
      <Tab.Navigator screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ color }) => <Text accessible={false} style={{ color, fontSize: 24 }}>{icons[route.name]}</Text>,
        headerRight: () => <Pressable onPress={() => void signOut()} accessibilityRole="button" accessibilityLabel="Sair da conta" style={{ marginRight: 16 }}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Sair</Text>
        </Pressable>,
      })}>
        <Tab.Screen name="Inicio" component={HomeScreen} options={{ title: 'Início' }} />
        <Tab.Screen name="Receitas" component={IncomeScreen} />
        <Tab.Screen name="Despesas" component={ExpensesScreen} />
        <Tab.Screen name="Movimentacoes" component={TransactionsScreen} options={{ title: 'Movimentações' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
