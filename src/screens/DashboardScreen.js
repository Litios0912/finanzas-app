import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Switch
} from 'react-native'
import { useAuth } from '../contexts/AuthContext'
import { useFamilia } from '../contexts/FamiliaContext'
import { useNotificaciones } from '../contexts/NotificationContext'
import { obtenerResumen } from '../services/db'
import { supabase } from '../services/supabase'
import { PieChart, BarChart } from '../components/Charts'
import { sendTestNotification } from '../services/notifications'

const COLORS = {
  primary: '#4F46E5', fijo: '#EF4444', dinamico: '#F59E0B',
  casa: '#3B82F6', ahorro: '#10B981', cardBg: '#fff',
  bg: '#F3F4F6', text: '#111827', textSecondary: '#6B7280',
}

const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function DashboardScreen({ navigation }) {
  const { perfil } = useAuth()
  const { familiaId, miembros } = useFamilia()
  const { notificacionesActivas, toggleNotificaciones, permiso } = useNotificaciones()
  const [resumen, setResumen] = useState(null)
  const [historialMensual, setHistorialMensual] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [año, setAño] = useState(new Date().getFullYear())

  const cargarHistorial = useCallback(async () => {
    if (!familiaId) return
    const data = []
    for (let i = 5; i >= 0; i--) {
      let m = new Date().getMonth() + 1 - i
      let y = new Date().getFullYear()
      if (m <= 0) { m += 12; y-- }
      const r = await obtenerResumen(familiaId, m, y)
      data.push({ mes: m, año: y, label: `${meses[m - 1].substring(0, 3)}`, total: r.totalGastos })
    }
    setHistorialMensual(data)
  }, [familiaId])

  const cargarResumen = useCallback(async () => {
    if (!familiaId) return
    const data = await obtenerResumen(familiaId, mes, año)
    setResumen(data)
  }, [familiaId, mes, año])

  useEffect(() => {
    cargarResumen()
    cargarHistorial()
  }, [cargarResumen, cargarHistorial])

  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([cargarResumen(), cargarHistorial()])
    setRefreshing(false)
  }

  if (!familiaId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emoji}>👥</Text>
        <Text style={styles.emptyTitle}>Sin familia aún</Text>
        <Text style={styles.emptySubtitle}>Ve a Ajustes para crear o unirte a una familia</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Config')}>
          <Text style={styles.buttonText}>Ir a Ajustes</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!resumen) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    )
  }

  const cambiarMes = (delta) => {
    let nuevoMes = mes + delta
    let nuevoAño = año
    if (nuevoMes > 12) { nuevoMes = 1; nuevoAño++ }
    if (nuevoMes < 1) { nuevoMes = 12; nuevoAño-- }
    setMes(nuevoMes)
    setAño(nuevoAño)
  }

  const pieData = [
    { label: 'Fijos', value: resumen.totalFijos, color: COLORS.fijo },
    { label: 'Dinámicos', value: resumen.totalDinamicos, color: COLORS.dinamico },
    { label: 'Casa', value: resumen.totalCasa, color: COLORS.casa },
  ].filter(d => d.value > 0)

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hola, {perfil?.nombre}</Text>
        <Text style={styles.members}>
          {miembros.map(m => m.nombre).join(' & ') || 'Tu'}
        </Text>
      </View>

      <View style={styles.mesNav}>
        <TouchableOpacity onPress={() => cambiarMes(-1)}>
          <Text style={styles.mesArrow}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.mesText}>{meses[mes - 1]} {año}</Text>
        <TouchableOpacity onPress={() => cambiarMes(1)}>
          <Text style={styles.mesArrow}>▶</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Gastos del Mes</Text>
        <Text style={styles.totalAmount}>
          ${resumen.totalGastos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </Text>
      </View>

      <View style={styles.grid}>
        <ResumenCard title="Gastos Fijos" amount={resumen.totalFijos} color={COLORS.fijo} icon="📋" onPress={() => navigation.navigate('GastosFijos')} />
        <ResumenCard title="Gastos Dinámicos" amount={resumen.totalDinamicos} color={COLORS.dinamico} icon="🛒" onPress={() => navigation.navigate('GastosDinamicos')} />
        <ResumenCard title="Casa" amount={resumen.totalCasa} color={COLORS.casa} icon="🏠" onPress={() => navigation.navigate('Casa')} />
        <ResumenCard title="Ahorros" amount={(resumen.ahorros || []).reduce((s, a) => s + Number(a.monto_actual), 0)} color={COLORS.ahorro} icon="🐷" onPress={() => navigation.navigate('Ahorros')} />
      </View>

      {pieData.length > 0 && <PieChart data={pieData} />}

      {historialMensual.length > 0 && (
        <BarChart data={historialMensual} title="Últimos 6 Meses" />
      )}

      <View style={styles.section}>
        <View style={styles.notifRow}>
          <View style={styles.notifInfo}>
            <Text style={styles.notifTitle}>🔔 Recordatorios</Text>
            <Text style={styles.notifSub}>
              {permiso
                ? 'Te avisamos los días de pago'
                : 'Permiso no concedido'}
            </Text>
          </View>
          <Switch
            value={notificacionesActivas}
            onValueChange={toggleNotificaciones}
            trackColor={{ false: '#D1D5DB', true: '#A5B4FC' }}
            thumbColor={notificacionesActivas ? COLORS.primary : '#9CA3AF'}
            disabled={!permiso}
          />
        </View>
        {permiso && (
          <TouchableOpacity style={styles.testNotifBtn} onPress={sendTestNotification}>
            <Text style={styles.testNotifText}>Probar notificación</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

function ResumenCard({ title, amount, color, icon, onPress }) {
  return (
    <TouchableOpacity style={[styles.card, { borderLeftColor: color }]} onPress={onPress}>
      <Text style={styles.cardIcon}>{icon}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={[styles.cardAmount, { color }]}>
        ${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centered: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24 },
  loadingText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 14 },
  header: { padding: 20, paddingTop: 60, backgroundColor: COLORS.primary },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  members: { fontSize: 14, color: '#C7D2FE', marginTop: 4 },
  mesNav: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, backgroundColor: '#fff', marginHorizontal: 16, marginTop: -20, borderRadius: 12, elevation: 4 },
  mesArrow: { fontSize: 18, color: COLORS.primary, paddingHorizontal: 20 },
  mesText: { fontSize: 16, fontWeight: '600', color: COLORS.text, minWidth: 160, textAlign: 'center' },
  totalCard: { backgroundColor: COLORS.primary, margin: 16, borderRadius: 16, padding: 24, alignItems: 'center', elevation: 4 },
  totalLabel: { fontSize: 14, color: '#C7D2FE' },
  totalAmount: { fontSize: 36, fontWeight: 'bold', color: '#fff', marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  card: { backgroundColor: COLORS.cardBg, borderRadius: 16, padding: 16, margin: 8, width: '46%', borderLeftWidth: 4, elevation: 2 },
  cardIcon: { fontSize: 28, marginBottom: 8 },
  cardTitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 },
  cardAmount: { fontSize: 18, fontWeight: 'bold' },
  button: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, paddingHorizontal: 32 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  section: { backgroundColor: COLORS.cardBg, margin: 16, marginBottom: 8, borderRadius: 16, padding: 16, elevation: 1 },
  notifRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifInfo: { flex: 1 },
  notifTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  notifSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  testNotifBtn: { marginTop: 12, backgroundColor: '#EEF2FF', borderRadius: 10, padding: 10, alignItems: 'center' },
  testNotifText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
})
