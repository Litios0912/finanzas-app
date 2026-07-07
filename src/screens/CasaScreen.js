import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, Switch, ActivityIndicator, RefreshControl
} from 'react-native'
import { useFamilia } from '../contexts/FamiliaContext'
import { casaDb } from '../services/db'

const COLORS = { primary: '#3B82F6', bg: '#F3F4F6', cardBg: '#fff', text: '#111827', textSecondary: '#6B7280' }

const TIPOS_CASA = [
  { value: 'hipoteca', label: 'Hipoteca', icon: '🏦' },
  { value: 'renta', label: 'Renta', icon: '🏠' },
  { value: 'servicio', label: 'Servicio', icon: '💡' },
  { value: 'mantenimiento', label: 'Mantenimiento', icon: '🔧' },
]

export default function CasaScreen() {
  const { familiaId } = useFamilia()
  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editando, setEditando] = useState(null)
  const [nombre, setNombre] = useState('')
  const [monto, setMonto] = useState('')
  const [diaPago, setDiaPago] = useState('1')
  const [tipo, setTipo] = useState('renta')
  const [activo, setActivo] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    if (!familiaId) return
    const { data } = await casaDb.listar(familiaId)
    setGastos(data || [])
    setLoading(false)
  }, [familiaId])

  useEffect(() => { cargar() }, [cargar])

  const onRefresh = async () => { setRefreshing(true); await cargar(); setRefreshing(false) }

  const abrirModal = (gasto = null) => {
    if (gasto) {
      setEditando(gasto); setNombre(gasto.nombre); setMonto(String(gasto.monto))
      setDiaPago(String(gasto.dia_pago)); setTipo(gasto.tipo); setActivo(gasto.activo)
    } else {
      setEditando(null); setNombre(''); setMonto(''); setDiaPago('1'); setTipo('renta'); setActivo(true)
    }
    setModalVisible(true)
  }

  const guardar = async () => {
    if (!nombre || !monto) { Alert.alert('Error', 'Nombre y monto son obligatorios'); return }
    setGuardando(true)
    try {
      const datos = { familia_id: familiaId, nombre, monto: parseFloat(monto), dia_pago: parseInt(diaPago), tipo, activo }
      if (editando) {
        await casaDb.actualizar(editando.id, { nombre, monto: parseFloat(monto), dia_pago: parseInt(diaPago), tipo, activo })
      } else {
        await casaDb.crear(datos)
      }
      setModalVisible(false)
      await cargar()
    } catch (e) { Alert.alert('Error', e.message) }
    finally { setGuardando(false) }
  }

  const eliminar = (id) => {
    Alert.alert('Eliminar', '¿Eliminar este gasto de casa?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await casaDb.eliminar(id); await cargar() }},
    ])
  }

  const getTipoInfo = (t) => TIPOS_CASA.find(tc => tc.value === t) || { label: t, icon: '📦' }
  const total = gastos.filter(g => g.activo).reduce((s, g) => s + Number(g.monto), 0)

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>🏠 Gastos de Casa</Text>
        <Text style={styles.headerSub}>Total mensual: ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        style={{ flex: 1 }}
      >
        {gastos.map(gasto => {
          const tipoInfo = getTipoInfo(gasto.tipo)
          return (
            <TouchableOpacity key={gasto.id} style={styles.gastoItem} onPress={() => abrirModal(gasto)}>
              <View style={styles.gastoIcon}>
                <Text style={styles.gastoIconText}>{tipoInfo.icon}</Text>
              </View>
              <View style={styles.gastoInfo}>
                <Text style={styles.gastoNombre}>{gasto.nombre}</Text>
                <Text style={styles.gastoMeta}>{tipoInfo.label} • Día {gasto.dia_pago} • {gasto.activo ? 'Activo' : 'Inactivo'}</Text>
              </View>
              <Text style={styles.gastoMonto}>${Number(gasto.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
              <TouchableOpacity onPress={() => eliminar(gasto.id)} style={styles.deleteBtn}>
                <Text style={styles.deleteIcon}>🗑️</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )
        })}
        {gastos.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏠</Text>
            <Text style={styles.emptyText}>Sin gastos de casa</Text>
            <Text style={styles.emptySubtext}>Agrega renta/hipoteca, servicios, mantenimiento</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => abrirModal()}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editando ? 'Editar Gasto' : 'Nuevo Gasto de Casa'}</Text>

            <Text style={styles.label}>Tipo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tipoRow}>
              {TIPOS_CASA.map(t => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.tipoChip, tipo === t.value && styles.tipoChipActive]}
                  onPress={() => setTipo(t.value)}
                >
                  <Text style={styles.tipoText}>{t.icon} {t.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput style={styles.input} placeholder="Nombre (ej: Renta depto, CFE)" value={nombre} onChangeText={setNombre} />
            <TextInput style={styles.input} placeholder="Monto mensual" value={monto} onChangeText={setMonto} keyboardType="decimal-pad" />
            <TextInput style={styles.input} placeholder="Día de pago (1-31)" value={diaPago} onChangeText={setDiaPago} keyboardType="number-pad" />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Activo</Text>
              <Switch value={activo} onValueChange={setActivo} trackColor={{ false: '#D1D5DB', true: '#93C5FD' }} thumbColor={activo ? COLORS.primary : '#9CA3AF'} />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, guardando && { opacity: 0.6 }]} onPress={guardar} disabled={guardando}>
                {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centered: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
  headerBar: { backgroundColor: COLORS.primary, padding: 20, paddingTop: 50, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 14, color: '#DBEAFE', marginTop: 4 },
  emptyState: { alignItems: 'center', padding: 60 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  emptySubtext: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  gastoItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, marginHorizontal: 16, marginVertical: 4, borderRadius: 12, padding: 16, elevation: 1 },
  gastoIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  gastoIconText: { fontSize: 20 },
  gastoInfo: { flex: 1 },
  gastoNombre: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  gastoMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  gastoMonto: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, marginRight: 8 },
  deleteBtn: { padding: 4 },
  deleteIcon: { fontSize: 18 },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: COLORS.primary, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6 },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 30 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  tipoRow: { marginBottom: 12 },
  tipoChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  tipoChipActive: { backgroundColor: '#EFF6FF', borderColor: COLORS.primary },
  tipoText: { fontSize: 14, color: COLORS.text },
  input: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, fontSize: 16, color: COLORS.text, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  switchLabel: { fontSize: 16, color: COLORS.text },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 12 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: '#F3F4F6' },
  cancelBtnText: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '600' },
  saveBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: COLORS.primary, minWidth: 100, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
