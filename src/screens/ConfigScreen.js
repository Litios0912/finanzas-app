import React, { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator
} from 'react-native'
import { useAuth } from '../contexts/AuthContext'
import { useFamilia } from '../contexts/FamiliaContext'
import { supabase } from '../services/supabase'

const COLORS = { primary: '#4F46E5', bg: '#F3F4F6', cardBg: '#fff', text: '#111827', textSecondary: '#6B7280' }

export default function ConfigScreen() {
  const { user, perfil, logout } = useAuth()
  const { familiaId, miembros, codigoInvitacion, crearFamilia, unirseAFamilia } = useFamilia()
  const [codigoInput, setCodigoInput] = useState('')
  const [cargando, setCargando] = useState(false)
  const [categorias, setCategorias] = useState([])
  const [catModalVisible, setCatModalVisible] = useState(false)
  const [catNombre, setCatNombre] = useState('')
  const [catTipo, setCatTipo] = useState('dinamico')
  const [catIcono, setCatIcono] = useState('📦')
  const [catColor, setCatColor] = useState('#6B7280')

  const cargarCategorias = async () => {
    if (!familiaId) return
    const { data } = await supabase.from('categorias').select('*').eq('familia_id', familiaId)
    setCategorias(data || [])
  }

  useEffect(() => { cargarCategorias() }, [familiaId])

  const handleCrearFamilia = async () => {
    setCargando(true)
    try {
      await crearFamilia()

      const defaultCats = [
        'Vivienda|fijo|🏠', 'Suscripciones|fijo|📺', 'Seguros|fijo|🛡️',
        'Alimentación|dinamico|🍎', 'Transporte|dinamico|🚗',
        'Entretenimiento|dinamico|🎬', 'Salud|dinamico|💊', 'Ropa|dinamico|👕',
        'Emergencia|ahorro|🆘', 'Viaje|ahorro|✈️',
        'Hipoteca|casa|🏦', 'Renta|casa|🏠', 'Servicios|casa|💡',
      ]

      setTimeout(async () => {
        const { data: perfilActual } = await supabase
          .from('perfiles').select('familia_id').eq('id', user.id).single()
        const fid = perfilActual?.familia_id
        if (fid) {
          for (const cat of defaultCats) {
            const [nombre, tipo, icono] = cat.split('|')
            await supabase.from('categorias').insert({
              familia_id: fid, nombre, tipo, icono, color: '#6B7280'
            })
          }
        }
        await cargarCategorias()
      }, 500)

      Alert.alert('Éxito', 'Familia creada. Comparte el código con tu pareja.')
    } catch (e) { Alert.alert('Error', e.message) }
    finally { setCargando(false) }
  }
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚙️ Ajustes</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Perfil</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Nombre</Text>
          <Text style={styles.infoValue}>{perfil?.nombre}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{perfil?.email}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Familia</Text>
        {familiaId ? (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Miembros</Text>
              <Text style={styles.infoValue}>{miembros.map(m => m.nombre).join(', ')}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Código</Text>
              <Text style={styles.codeValue}>{codigoInvitacion || '---'}</Text>
            </View>
            <Text style={styles.hint}>Comparte este código con tu pareja para que se una desde su cuenta</Text>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleCrearFamilia} disabled={cargando}>
              {cargando ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Crear Familia</Text>}
            </TouchableOpacity>
            <Text style={styles.orText}>ó</Text>
            <TextInput
              style={styles.input}
              placeholder="Código de invitación"
              placeholderTextColor="#9CA3AF"
              value={codigoInput}
              onChangeText={setCodigoInput}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={async () => {
                if (!codigoInput) { Alert.alert('Error', 'Ingresa un código'); return }
                setCargando(true)
                try {
                  await unirseAFamilia(codigoInput)
                  Alert.alert('Éxito', 'Te has unido a la familia')
                } catch (e) { Alert.alert('Error', e.message) }
                finally { setCargando(false) }
              }}
              disabled={cargando}
            >
              <Text style={styles.secondaryBtnText}>Unirse a Familia</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categorías</Text>
          <TouchableOpacity onPress={() => {
            setCatNombre(''); setCatTipo('dinamico'); setCatIcono('📦'); setCatColor('#6B7280')
            setCatModalVisible(true)
          }}>
            <Text style={styles.addText}>+ Agregar</Text>
          </TouchableOpacity>
        </View>
        {categorias.map(cat => (
          <View key={cat.id} style={styles.catItem}>
            <Text style={styles.catIcon}>{cat.icono}</Text>
            <View style={styles.catInfo}>
              <Text style={styles.catNombre}>{cat.nombre}</Text>
              <Text style={styles.catTipo}>{cat.tipo}</Text>
            </View>
            <TouchableOpacity onPress={async () => {
              await supabase.from('categorias').delete().eq('id', cat.id)
              await cargarCategorias()
            }}>
              <Text style={styles.deleteIcon}>🗑️</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      <Modal visible={catModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nueva Categoría</Text>
            <TextInput style={styles.input} placeholder="Nombre" value={catNombre} onChangeText={setCatNombre} />
            
            <Text style={styles.label}>Tipo</Text>
            {['fijo', 'dinamico', 'ahorro', 'casa'].map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.tipoOption, catTipo === t && styles.tipoOptionActive]}
                onPress={() => setCatTipo(t)}
              >
                <Text style={[styles.tipoOptionText, catTipo === t && styles.tipoOptionTextActive]}>
                  {t === 'fijo' ? '📋 Fijo' : t === 'dinamico' ? '🛒 Dinámico' : t === 'ahorro' ? '🐷 Ahorro' : '🏠 Casa'}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.label}>Icono (emojis)</Text>
            <TextInput style={styles.input} placeholder="🎯" value={catIcono} onChangeText={setCatIcono} />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCatModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={async () => {
                if (!catNombre) { Alert.alert('Error', 'Nombre obligatorio'); return }
                await supabase.from('categorias').insert({
                  familia_id: familiaId, nombre: catNombre, tipo: catTipo, icono: catIcono, color: catColor
                })
                setCatModalVisible(false)
                await cargarCategorias()
              }}>
                <Text style={styles.saveBtnText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { backgroundColor: COLORS.primary, padding: 20, paddingTop: 50 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  section: { backgroundColor: COLORS.cardBg, margin: 16, marginBottom: 8, borderRadius: 16, padding: 20, elevation: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 12 },
  addText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoLabel: { fontSize: 16, color: COLORS.textSecondary },
  infoValue: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  codeValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, letterSpacing: 2 },
  hint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8, lineHeight: 18 },
  input: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, fontSize: 16, color: COLORS.text, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  orText: { textAlign: 'center', color: COLORS.textSecondary, marginVertical: 8 },
  primaryBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { backgroundColor: '#EEF2FF', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#C7D2FE' },
  secondaryBtnText: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
  catItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  catIcon: { fontSize: 24, marginRight: 12 },
  catInfo: { flex: 1 },
  catNombre: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  catTipo: { fontSize: 12, color: COLORS.textSecondary, textTransform: 'capitalize' },
  deleteIcon: { fontSize: 18, padding: 4 },
  logoutBtn: { margin: 16, marginTop: 8, backgroundColor: '#FEE2E2', borderRadius: 12, padding: 16, alignItems: 'center' },
  logoutText: { color: '#DC2626', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8, marginTop: 4 },
  tipoOption: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#F3F4F6', borderRadius: 10, marginBottom: 6 },
  tipoOptionActive: { backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: COLORS.primary },
  tipoOptionText: { fontSize: 16, color: COLORS.text },
  tipoOptionTextActive: { color: COLORS.primary, fontWeight: '600' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 12 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: '#F3F4F6' },
  cancelBtnText: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '600' },
  saveBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: COLORS.primary, minWidth: 100, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
