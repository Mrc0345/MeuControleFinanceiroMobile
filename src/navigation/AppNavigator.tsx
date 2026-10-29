import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { IncomeScreen } from '../screens/IncomeScreen';
import { ExpensesScreen } from '../screens/ExpensesScreen';
import { TransactionsScreen } from '../screens/TransactionsScreen';
import { colors } from '../theme';
import type { RootTabParamList } from '../types/navigation';
import { LogoutButton } from '../components/LogoutButton';

const Tab = createBottomTabNavigator<RootTabParamList>();
const icons: Record<keyof RootTabParamList, string> = {
  Inicio: '⌂', Receitas: '+', Despesas: '−', Movimentacoes: '↔',
};

export function AppNavigator() {
  return (
    <NavigationContainer theme={{ ...DefaultTheme, colors: {
      ...DefaultTheme.colors, primary: colors.primary, background: colors.background,
      card: colors.surface, text: colors.text, border: colors.border,
    } }}>
      <Tab.Navigator screenOptions={({ route }) => ({
        headerRight: () => <LogoutButton />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ color }) => <Text accessible={false} style={{ color, fontSize: 24 }}>{icons[route.name]}</Text>,
      })}>
        <Tab.Screen name="Inicio" component={HomeScreen} options={{ title: 'Início' }} />
        <Tab.Screen name="Receitas" component={IncomeScreen} />
        <Tab.Screen name="Despesas" component={ExpensesScreen} />
        <Tab.Screen name="Movimentacoes" component={TransactionsScreen} options={{ title: 'Movimentações' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
