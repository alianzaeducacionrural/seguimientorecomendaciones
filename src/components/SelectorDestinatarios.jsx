import { useMemo, useState } from 'react'
import { TIPOS_DESTINATARIO_PLURAL } from '../utils/formato'
import styles from './SelectorDestinatarios.module.css'

const TIPOS = ['institucion_educativa', 'universidad', 'entidad']

/**
 * Selector multi-tipo: el usuario elige un tipo, marca destinatarios, cambia
 * de tipo y sigue marcando — las selecciones se acumulan en `seleccionados`
 * sin importar el tipo, porque una recomendación puede ir a varios a la vez.
 */
export default function SelectorDestinatarios({ destinatarios, seleccionados, onChange }) {
  const [tab, setTab] = useState('institucion_educativa')
  const [busqueda, setBusqueda] = useState('')

  const porTipo = useMemo(() => {
    const grupos = { institucion_educativa: [], universidad: [], entidad: [] }
    for (const d of destinatarios) {
      if (grupos[d.tipo]) grupos[d.tipo].push(d)
    }
    return grupos
  }, [destinatarios])

  const filtrados = useMemo(() => {
    const lista = porTipo[tab] || []
    if (!busqueda.trim()) return lista
    const q = busqueda.trim().toLowerCase()
    return lista.filter((d) => d.nombre.toLowerCase().includes(q) || (d.municipio || '').toLowerCase().includes(q))
  }, [porTipo, tab, busqueda])

  const seleccionadosSet = useMemo(() => new Set(seleccionados), [seleccionados])
  const mapaPorId = useMemo(() => new Map(destinatarios.map((d) => [String(d.id), d])), [destinatarios])

  function alternar(id) {
    const idStr = String(id)
    if (seleccionadosSet.has(idStr)) onChange(seleccionados.filter((s) => s !== idStr))
    else onChange([...seleccionados, idStr])
  }

  function seleccionarTodasManizales() {
    const ids = porTipo.institucion_educativa
      .filter((d) => d.municipio === 'Manizales')
      .map((d) => String(d.id))
    onChange(Array.from(new Set([...seleccionados, ...ids])))
  }

  function quitar(id) {
    onChange(seleccionados.filter((s) => s !== String(id)))
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.tipos} role="tablist">
        {TIPOS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`${styles.tipoBtn} ${tab === t ? styles.activo : ''}`}
            onClick={() => setTab(t)}
          >
            {TIPOS_DESTINATARIO_PLURAL[t]} <span className={styles.n}>{porTipo[t]?.length ?? 0}</span>
          </button>
        ))}
      </div>

      {tab === 'institucion_educativa' && (
        <input
          type="search"
          className={styles.buscador}
          placeholder="Buscar institución o municipio…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar institución educativa"
        />
      )}

      <div className={styles.catalogo}>
        {filtrados.length === 0 && <p className={styles.vacio}>Sin resultados.</p>}
        {filtrados.map((d) => (
          <label key={d.id} className={styles.item}>
            <input
              type="checkbox"
              checked={seleccionadosSet.has(String(d.id))}
              onChange={() => alternar(d.id)}
            />
            {d.nombre}
            {d.municipio && <span className={styles.mun}>{d.municipio}</span>}
          </label>
        ))}
      </div>

      {seleccionados.length > 0 && (
        <div className={styles.chips}>
          {seleccionados.map((id) => {
            const d = mapaPorId.get(String(id))
            if (!d) return null
            return (
              <span key={id} className={`${styles.chip} ${d.tipo === 'entidad' ? styles.chipEnt : ''}`}>
                {d.nombre}
                <button type="button" onClick={() => quitar(id)} aria-label={`Quitar ${d.nombre}`}>
                  ×
                </button>
              </span>
            )
          })}
        </div>
      )}

      {tab === 'institucion_educativa' && (
        <button type="button" className={styles.btnGhost} onClick={seleccionarTodasManizales}>
          Seleccionar todas las IE de Manizales
        </button>
      )}
    </div>
  )
}
