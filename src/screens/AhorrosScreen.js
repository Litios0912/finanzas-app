import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator, RefreshControl
} from 'react-native'
import { useFamilia } from '../contexts/FamiliaContext'
import { ahorrosDb } from '../services/db'

const COLORS = { primary: '#10B981', bg: '#F3F4F6', cardBg: '#fff', text: '#111827', textSecondary: '#6B7280' }

export default function AhorrosScreen() {
  const { familiaId } = useFamilia()
  const [ahorros, setAhorros] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editando, setEditando] = useState(null)
  const [nombre, setNombre] = useState('')
  const [metaMonto, setMetaMonto] = useState('')
  const [montoActual, setMontoActual] = useState('0')
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    if (!familiaId) return
    const { data } = await ahorrosDb.listar(familiaId)
    setAhorros(data || [])
    setLoading(false)
  }, [familiaId])

  useEffect(() => { cargar() }, [cargar])

  const onRefresh = async () => { setRefreshing(true); await cargar(); setRefreshing(false) }

  const abrirModal = (ahorro = null) => {
    if (ahorro) {
      setEditando(ahorro); setNombre(ahorro.nombre)
      setMetaMonto(String(ahorro.meta_monto)); setMontoActual(String(ahorro.monto_actual))
    } else {
      setEditando(null); setNombre(''); setMetaMonto(''); setMontoActual('0')
    }
    setModalVisible(true)
  }

  const guardar = async () => {
    if (!nombre || !metaMonto) { Alert.alert('Error', 'Nombre y meta son obligatorios'); return }
    setGuardando(true)
    try {
      const datos = { familia_id: familiaId, nombre, meta_monto: parseFloat(metaMonto), monto_actual: parseFloat(montoActual || '0') }
      if (editando) {
        await ahorrosDb.actualizar(editando.id, { nombre, meta_monto: parseFloat(metaMonto), monto_actual: parseFloat(montoActual || '0') })
      } else {
        await ahorrosDb.crear(datos)
      }
      setModalVisible(false)
      await cargar()
    } catch (e) { Alert.alert('Error', e.message) }
    finally { setGuardando(false) }
  }

  const eliminar = (id) => {
    Alert.alert('Eliminar', '¿Eliminar esta meta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await ahorrosDb.eliminar(id); await cargar() }},
    ])
  }

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        style={{ flex: 1 }}
      >
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>Metas de Ahorro</Text>
          <Text style={styles.headerSub}>
            Ahorrado: ${ahorros.reduce((s, a) => s + Number(a.monto_actual), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </Text>
        </View>

        {ahorros.map(ahorro => {
          const progreso = ahorro.meta_monto > 0 ? (Number(ahorro.monto_actual) / Number(ahorro.meta_monto)) * 100 : 0
          return (
            <TouchableOpacity key={ahorro.id} style={styles.ahorroItem} onPress={() => abrirModal(ahorro)}>
              <View style={styles.ahorroHeader}>
                <Text style={styles.ahorroNombre}>{ahorro.nombre}</Text>
                <TouchableOpacity onPress={() => eliminar(ahorro.id)}>
                  <Text style={styles.deleteIcon}>{'🗑️'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min(progreso, 100)}%` }]} />
              </View>

              <View style={styles.ahorroMontos}>
                <Text style={styles.ahorroActual}>${Number(ahorro.monto_actual).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
                <Text style={styles.ahorroMeta}>de ${Number(ahorro.meta_monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
                <Text style={styles.ahorroPct}>{progreso.toFixed(0)}%</Text>
              </View>

              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => {
                  setEditando(ahorro)
                  setNombre(ahorro.nombre)
                  setMetaMonto(String(ahorro.meta_monto))
                  setMontoActual(String(ahorro.monto_actual))
                  setModalVisible(true)
                }}
              >
                <Text style={styles.addBtnText}>Actualizar monto</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )
        })}

        {ahorros.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>{'🐷'}</Text>
            <Text style={styles.emptyText}>Sin metas de ahorro</Text>
            <Text style={styles.emptySubtext}>Define metas: viaje, fondo de emergencia, carro...</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => abrirModal()}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editando ? 'Editar Meta' : 'Nueva Meta'}</Text>
            <TextInput style={styles.input} placeholder="Nombre (ej: Viaje, Emergencia)" value={nombre} onChangeText={setNombre} />
            <TextInput style={styles.input} placeholder="Monto meta" value={metaMonto} onChangeText={setMetaMonto} keyboardType="decimal-pad" />
            <TextInput style={styles.input} placeholder="Monto actual" value={montoActual} onChangeText={setMontoActual} keyboardType="decimal-pad" />

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
  headerSub: { fontSize: 14, color: '#D1FAE5', marginTop: 4 },
  emptyState: { alignItems: 'center', padding: 60 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  emptySubtext: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  ahorroItem: { backgroundColor: COLORS.cardBg, margin: 16, marginBottom: 8, borderRadius: 16, padding: 20, elevation: 2 },
  ahorroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  ahorroNombre: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  deleteIcon: { fontSize: 18 },
  progressBar: { height: 12, backgroundColor: '#E5E7EB', borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 6 },
  ahorroMontos: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, alignItems: 'baseline' },
  ahorroActual: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  ahorroMeta: { fontSize: 14, color: COLORS.textSecondary, flex: 1, marginLeft: 4 },
  ahorroPct: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  addBtn: { marginTop: 12, backgroundColor: '#D1FAE5', borderRadius: 10, padding: 10, alignItems: 'center' },
  addBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: COLORS.primary, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6 },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 30 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginBottom: 16 },
  input: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, fontSize: 16, color: COLORS.text, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 12 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: '#F3F4F6' },
  cancelBtnText: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '600' },
  saveBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: COLORS.primary, minWidth: 100, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
