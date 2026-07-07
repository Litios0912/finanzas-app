import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator, RefreshControl
} from 'react-native'
import { useFamilia } from '../contexts/FamiliaContext'
import { gastosDinamicosDb, categoriasDb } from '../services/db'

const COLORS = { primary: '#F59E0B', bg: '#F3F4F6', cardBg: '#fff', text: '#111827', textSecondary: '#6B7280' }

export default function GastosDinamicosScreen() {
  const { familiaId } = useFamilia()
  const [gastos, setGastos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editando, setEditando] = useState(null)
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [categoriaId, setCategoriaId] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    if (!familiaId) return
    const [gRes, cRes] = await Promise.all([
      gastosDinamicosDb.listar(familiaId),
      categoriasDb.listar(familiaId),
    ])
    setGastos(gRes.data || [])
    setCategorias((cRes.data || []).filter(c => c.tipo === 'dinamico'))
    setLoading(false)
  }, [familiaId])

  useEffect(() => { cargar() }, [cargar])

  const onRefresh = async () => { setRefreshing(true); await cargar(); setRefreshing(false) }

  const abrirModal = (gasto = null) => {
    if (gasto) {
      setEditando(gasto); setConcepto(gasto.concepto); setMonto(String(gasto.monto)); setCategoriaId(gasto.categoria_id)
    } else {
      setEditando(null); setConcepto(''); setMonto(''); setCategoriaId(null)
    }
    setModalVisible(true)
  }

  const guardar = async () => {
    if (!concepto || !monto) { Alert.alert('Error', 'Concepto y monto son obligatorios'); return }
    setGuardando(true)
    try {
      const datos = { familia_id: familiaId, concepto, monto: parseFloat(monto), categoria_id: categoriaId, fecha: new Date().toISOString().split('T')[0] }
      if (editando) {
        await gastosDinamicosDb.actualizar(editando.id, { concepto, monto: parseFloat(monto), categoria_id: categoriaId })
      } else {
        await gastosDinamicosDb.crear(datos)
      }
      setModalVisible(false)
      await cargar()
    } catch (e) { Alert.alert('Error', e.message) }
    finally { setGuardando(false) }
  }

  const eliminar = (id) => {
    Alert.alert('Eliminar', '¿Eliminar este gasto?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await gastosDinamicosDb.eliminar(id); await cargar() }},
    ])
  }

  const total = gastos.reduce((s, g) => s + Number(g.monto), 0)

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>

  return (
    <View style={styles.container}>
      <View style={styles.totalBar}>
        <Text style={styles.totalLabel}>Total del mes</Text>
        <Text style={styles.totalAmount}>${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
        <Text style={styles.totalCount}>{gastos.length} gastos</Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        style={{ flex: 1 }}
      >
        {gastos.map(gasto => (
          <TouchableOpacity key={gasto.id} style={styles.gastoItem} onPress={() => abrirModal(gasto)}>
            <View style={styles.gastoInfo}>
              <Text style={styles.gastoConcepto}>{gasto.concepto}</Text>
              <Text style={styles.gastoFecha}>{new Date(gasto.fecha).toLocaleDateString('es-MX')}</Text>
            </View>
            <Text style={styles.gastoMonto}>-${Number(gasto.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
            <TouchableOpacity onPress={() => eliminar(gasto.id)} style={styles.deleteBtn}>
              <Text style={styles.deleteIcon}>🗑️</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
        {gastos.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🛒</Text>
            <Text style={styles.emptyText}>Sin gastos este mes</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => abrirModal()}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editando ? 'Editar Gasto' : 'Nuevo Gasto'}</Text>
            <TextInput style={styles.input} placeholder="Concepto (ej: Cena, Gasolina)" value={concepto} onChangeText={setConcepto} />
            <TextInput style={styles.input} placeholder="Monto" value={monto} onChangeText={setMonto} keyboardType="decimal-pad" />

            <Text style={styles.label}>Categoría</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriaRow}>
              {categorias.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoriaChip, categoriaId === cat.id && styles.categoriaChipActive]}
                  onPress={() => setCategoriaId(cat.id)}
                >
                  <Text>{cat.icono} {cat.nombre}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

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
  totalBar: { backgroundColor: COLORS.primary, padding: 20, paddingTop: 50, alignItems: 'center' },
  totalLabel: { fontSize: 14, color: '#FEF3C7' },
  totalAmount: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginTop: 4 },
  totalCount: { fontSize: 12, color: '#FEF3C7', marginTop: 2 },
  emptyState: { alignItems: 'center', padding: 60 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  gastoItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, marginHorizontal: 16, marginVertical: 4, borderRadius: 12, padding: 16, elevation: 1 },
  gastoInfo: { flex: 1 },
  gastoConcepto: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  gastoFecha: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  gastoMonto: { fontSize: 16, fontWeight: 'bold', color: '#DC2626', marginRight: 8 },
  deleteBtn: { padding: 4 },
  deleteIcon: { fontSize: 18 },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: COLORS.primary, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6 },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 30 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginBottom: 16 },
  input: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, fontSize: 16, color: COLORS.text, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8, marginTop: 4 },
  categoriaRow: { marginBottom: 12 },
  categoriaChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  categoriaChipActive: { backgroundColor: '#FEF3C7', borderColor: COLORS.primary },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 12 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: '#F3F4F6' },
  cancelBtnText: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '600' },
  saveBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: COLORS.primary, minWidth: 100, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
