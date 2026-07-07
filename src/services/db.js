import { supabase } from './supabase'

const useDb = (tabla) => ({
  listar: (familiaId) =>
    supabase.from(tabla).select('*').eq('familia_id', familiaId).order('created_at', { ascending: false }),

  obtener: (id) =>
    supabase.from(tabla).select('*').eq('id', id).single(),

  crear: (datos) =>
    supabase.from(tabla).insert(datos).select().single(),

  actualizar: (id, datos) =>
    supabase.from(tabla).update(datos).eq('id', id).select().single(),

  eliminar: (id) =>
    supabase.from(tabla).delete().eq('id', id),
})

export const gastosFijosDb = useDb('gastos_fijos')
export const gastosDinamicosDb = useDb('gastos_dinamicos')
export const ahorrosDb = useDb('ahorros')
export const casaDb = useDb('casa')
export const categoriasDb = useDb('categorias')

export function useRealtime(tabla, familiaId, callback) {
  const subscription = supabase
    .channel(`${tabla}-changes`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: tabla, filter: `familia_id=eq.${familiaId}` },
      (payload) => callback(payload)
    )
    .subscribe()

  return () => subscription?.unsubscribe()
}

export const obtenerResumen = async (familiaId, mes, año) => {
  const inicioMes = `${año}-${String(mes).padStart(2, '0')}-01`
  const finMes = `${año}-${String(mes).padStart(2, '0')}-31`

  const [fijosRes, dinamicosRes, ahorrosRes, casaRes] = await Promise.all([
    supabase.from('gastos_fijos').select('*').eq('familia_id', familiaId).eq('activo', true),
    supabase.from('gastos_dinamicos').select('*')
      .eq('familia_id', familiaId)
      .gte('fecha', inicioMes)
      .lte('fecha', finMes),
    supabase.from('ahorros').select('*').eq('familia_id', familiaId),
    supabase.from('casa').select('*').eq('familia_id', familiaId).eq('activo', true),
  ])

  const totalFijos = (fijosRes.data || []).reduce((s, g) => s + Number(g.monto), 0)
  const totalDinamicos = (dinamicosRes.data || []).reduce((s, g) => s + Number(g.monto), 0)
  const totalCasa = (casaRes.data || []).reduce((s, g) => s + Number(g.monto), 0)
  const totalGastos = totalFijos + totalDinamicos + totalCasa

  return {
    totalGastos,
    totalFijos,
    totalDinamicos,
    totalCasa,
    ahorros: ahorrosRes.data || [],
    gastosDinamicos: dinamicosRes.data || [],
    gastosFijos: fijosRes.data || [],
    gastosCasa: casaRes.data || [],
  }
}
