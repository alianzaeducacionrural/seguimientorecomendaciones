import { useCallback, useEffect, useState } from 'react'
import { apiGet, crear, editar, eliminar } from '../../utils/api'

export function useEntidad(entidad) {
  const [datos, setDatos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const recargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const res = await apiGet(entidad)
      setDatos(res.datos || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }, [entidad])

  useEffect(() => {
    recargar()
  }, [recargar])

  const crearItem = useCallback(async (valores) => {
    const res = await crear(entidad, valores)
    await recargar()
    return res.id
  }, [entidad, recargar])

  const editarItem = useCallback(async (id, valores) => {
    await editar(entidad, id, valores)
    await recargar()
  }, [entidad, recargar])

  const eliminarItem = useCallback(async (id) => {
    await eliminar(entidad, id)
    await recargar()
  }, [entidad, recargar])

  return { datos, cargando, error, crearItem, editarItem, eliminarItem, recargar }
}
