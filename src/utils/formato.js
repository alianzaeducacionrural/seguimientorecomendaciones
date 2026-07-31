export function formatearFecha(iso) {
  if (!iso) return ''
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

export const ESTADOS = ['No iniciada', 'En proceso', 'Implementada', 'Cancelada']
export const TIPOS_RECOMENDACION = ['Curricular', 'Académica', 'Gestión', 'Bienestar', 'Evaluación', 'Permanencia']
export const PRIORIDADES = ['Alta', 'Media', 'Baja']
export const TIPOS_AJUSTE = ['Curricular', 'Administrativo', 'Académico', 'Gestión']
export const TIPOS_DESTINATARIO = {
  institucion_educativa: 'Institución educativa',
  universidad: 'Universidad',
  entidad: 'Entidad',
}

export const TIPOS_DESTINATARIO_PLURAL = {
  institucion_educativa: 'Instituciones educativas',
  universidad: 'Universidades',
  entidad: 'Entidades',
}

export function claveEstado(estado) {
  return String(estado || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
}
