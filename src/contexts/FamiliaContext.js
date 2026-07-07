import React, { createContext, useState, useContext, useCallback, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../services/supabase'

const FamiliaContext = createContext({})

export function FamiliaProvider({ children }) {
  const { user, perfil } = useAuth()
  const [familiaId, setFamiliaId] = useState(null)
  const [miembros, setMiembros] = useState([])
  const [codigoInvitacion, setCodigoInvitacion] = useState(null)

  const actualizarFamilia = useCallback(async (fid) => {
    const targetId = fid || perfil?.familia_id
    if (!targetId) return

    setFamiliaId(targetId)

    const [familiaRes, miembrosRes] = await Promise.all([
      supabase.from('familias').select('codigo_invitacion').eq('id', targetId).single(),
      supabase.from('perfiles').select('*').eq('familia_id', targetId),
    ])
    setCodigoInvitacion(familiaRes.data?.codigo_invitacion)
    setMiembros(miembrosRes.data || [])
  }, [perfil])

  useEffect(() => {
    if (perfil?.familia_id) {
      actualizarFamilia()
    }
  }, [perfil?.familia_id])

  const crearFamilia = async () => {
    const codigo = Math.random().toString(36).substring(2, 10).toUpperCase()

    const { data: familia, error } = await supabase
      .from('familias')
      .insert({ codigo_invitacion: codigo })
      .select()
      .single()
    if (error) throw error

    const { error: updateError } = await supabase
      .from('perfiles')
      .update({ familia_id: familia.id })
      .eq('id', user.id)
    if (updateError) throw updateError

    await actualizarFamilia(familia.id)
  }

  const unirseAFamilia = async (codigo) => {
    const { data: familia, error } = await supabase
      .from('familias')
      .select('id')
      .eq('codigo_invitacion', codigo.toUpperCase())
      .single()
    if (error) throw new Error('Código inválido')

    const { error: updateError } = await supabase
      .from('perfiles')
      .update({ familia_id: familia.id })
      .eq('id', user.id)
    if (updateError) throw updateError

    await actualizarFamilia(familia.id)
  }

  return (
    <FamiliaContext.Provider value={{
      familiaId, miembros, codigoInvitacion,
      crearFamilia, unirseAFamilia, actualizarFamilia
    }}>
      {children}
    </FamiliaContext.Provider>
  )
}

export const useFamilia = () => useContext(FamiliaContext)
