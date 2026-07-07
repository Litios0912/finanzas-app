import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { useFamilia } from './FamiliaContext'
import { supabase } from '../services/supabase'
import { setupNotifications, schedulePaymentReminders, cancelPaymentReminders } from '../services/notifications'

const NotificationContext = createContext({})

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const { familiaId } = useFamilia()
  const [permiso, setPermiso] = useState(false)
  const [notificacionesActivas, setNotificacionesActivas] = useState(true)

  useEffect(() => {
    setupNotifications().then(setPermiso)
  }, [])

  const programarRecordatorios = useCallback(async () => {
    if (!familiaId || !notificacionesActivas) return

    const [fijosRes, casaRes] = await Promise.all([
      supabase.from('gastos_fijos').select('*').eq('familia_id', familiaId).eq('activo', true),
      supabase.from('casa').select('*').eq('familia_id', familiaId).eq('activo', true),
    ])

    const fijosActivos = (fijosRes.data || []).filter(f => f.dia_pago >= 1 && f.dia_pago <= 31)
    const casaActivos = (casaRes.data || []).filter(c => c.dia_pago >= 1 && c.dia_pago <= 31)

    if (fijosActivos.length > 0) {
      await schedulePaymentReminders(fijosActivos, 'fijo')
    }
    if (casaActivos.length > 0) {
      await schedulePaymentReminders(casaActivos, 'casa')
    }
  }, [familiaId, notificacionesActivas])

  useEffect(() => {
    if (familiaId && notificacionesActivas) {
      programarRecordatorios()
    } else {
      cancelPaymentReminders('fijo')
      cancelPaymentReminders('casa')
    }
  }, [familiaId, notificacionesActivas, programarRecordatorios])

  const toggleNotificaciones = () => {
    setNotificacionesActivas(prev => !prev)
  }

  return (
    <NotificationContext.Provider value={{
      permiso, notificacionesActivas, toggleNotificaciones,
      programarRecordatorios,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotificaciones = () => useContext(NotificationContext)
