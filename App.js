import React from 'react'
import { StatusBar, ActivityIndicator, View, Text } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { AuthProvider, useAuth } from './src/contexts/AuthContext'
import { FamiliaProvider } from './src/contexts/FamiliaContext'
import { NotificationProvider } from './src/contexts/NotificationContext'

import LoginScreen from './src/screens/LoginScreen'
import RegisterScreen from './src/screens/RegisterScreen'
import DashboardScreen from './src/screens/DashboardScreen'
import GastosFijosScreen from './src/screens/GastosFijosScreen'
import GastosDinamicosScreen from './src/screens/GastosDinamicosScreen'
import AhorrosScreen from './src/screens/AhorrosScreen'
import CasaScreen from './src/screens/CasaScreen'
import ConfigScreen from './src/screens/ConfigScreen'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

function getTabBarIcon(routeName, focused) {
  const icons = {
    Dashboard: '📊',
    GastosFijos: '📋',
    GastosDinamicos: '🛒',
    Ahorros: '🐷',
    Casa: '🏠',
    Config: '⚙️',
  }
  return icons[routeName] || '📦'
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          const icon = getTabBarIcon(route.name, focused)
          return (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 22 }}>{icon}</Text>
            </View>
          )
        },
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 4,
          paddingTop: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: 'Inicio' }} />
      <Tab.Screen name="GastosFijos" component={GastosFijosScreen} options={{ tabBarLabel: 'Fijos' }} />
      <Tab.Screen name="GastosDinamicos" component={GastosDinamicosScreen} options={{ tabBarLabel: 'Gastos' }} />
      <Tab.Screen name="Ahorros" component={AhorrosScreen} options={{ tabBarLabel: 'Ahorros' }} />
      <Tab.Screen name="Casa" component={CasaScreen} options={{ tabBarLabel: 'Casa' }} />
      <Tab.Screen name="Config" component={ConfigScreen} options={{ tabBarLabel: 'Ajustes' }} />
    </Tab.Navigator>
  )
}

function Navigation() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#4F46E5' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    )
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <FamiliaProvider>
        <NotificationProvider>
          <NavigationContainer>
            <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
            <Navigation />
          </NavigationContainer>
        </NotificationProvider>
      </FamiliaProvider>
    </AuthProvider>
  )
}
