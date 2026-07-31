const GAS_URL = import.meta.env.VITE_GAS_URL

async function apiPost(body) {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    // GAS no responde el preflight CORS: text/plain evita que el navegador lo dispare.
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(body),
  })
  const datos = await res.json()
  if (!datos.ok) throw new Error(datos.error || 'Error desconocido')
  return datos
}

export async function apiGet(action, params = {}) {
  const url = new URL(GAS_URL)
  url.searchParams.set('action', action)
  Object.entries(params).forEach(([clave, valor]) => url.searchParams.set(clave, valor))
  const res = await fetch(url)
  const datos = await res.json()
  if (!datos.ok) throw new Error(datos.error || 'Error desconocido')
  return datos
}

export const crear = (entidad, datos) => apiPost({ accion: 'crear', entidad, datos })
export const editar = (entidad, id, datos) => apiPost({ accion: 'editar', entidad, id, datos })
export const eliminar = (entidad, id) => apiPost({ accion: 'eliminar', entidad, id })

export const asignarDestinatarios = (recomendacion_id, destinatario_ids) =>
  apiPost({ accion: 'asignar', recomendacion_id, destinatario_ids })

export const reportarAvance = (token, asignacion_id, campos) =>
  apiPost({ accion: 'reportarAvance', token, asignacion_id, ...campos })

export const subirEvidenciaEnlace = (token, asignacion_id, titulo, url) =>
  apiPost({ accion: 'subirEvidencia', token, asignacion_id, tipo: 'enlace', titulo, url })

export const subirEvidenciaArchivo = (token, asignacion_id, nombre, mimeType, base64) =>
  apiPost({ accion: 'subirEvidencia', token, asignacion_id, tipo: 'archivo', nombre, mimeType, base64 })

export const getPortal = (token) => apiGet('portal', { token })
export const getCatalogoDestinatarios = () => apiGet('catalogoDestinatarios')
export const sembrarDestinatarios = () => apiPost({ accion: 'sembrarDestinatarios' })
