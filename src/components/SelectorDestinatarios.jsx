import { useMemo, useState } from 'react'
import { TIPOS_DESTINATARIO_PLURAL } from '../utils/formato'
import styles from './SelectorDestinatarios.module.css'

const TIPOS = ['institucion_educativa', 'universidad', 'entidad']

function Chevron({ abierto }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={abierto ? styles.chevronAbierto : styles.chevron}>
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Selector multi-tipo: el usuario elige un tipo, marca destinatarios, cambia
 * de tipo y sigue marcando — las selecciones se acumulan en `seleccionados`
 * sin importar el tipo, porque una recomendación puede ir a varios a la vez.
 * Instituciones educativas: todos los municipios del catálogo, agrupadas
 * primero por municipio (desplegable) y luego la lista de instituciones.
 */
export default function SelectorDestinatarios({ destinatarios, seleccionados, onChange }) {
  const [tab, setTab] = useState('institucion_educativa')
  const [busqueda, setBusqueda] = useState('')
  const [muniAbiertos, setMuniAbiertos] = useState(() => new Set())

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

  const buscando = busqueda.trim().length > 0

  const municipios = useMemo(() => {
    if (tab !== 'institucion_educativa') return null
    const mapa = new Map()
    for (const d of filtrados) {
      const m = d.municipio || 'Sin municipio'
      const lista = mapa.get(m) || []
      lista.push(d)
      mapa.set(m, lista)
    }
    return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtrados, tab])

  const seleccionadosSet = useMemo(() => new Set(seleccionados), [seleccionados])
  const mapaPorId = useMemo(() => new Map(destinatarios.map((d) => [String(d.id), d])), [destinatarios])

  function alternar(id) {
    const idStr = String(id)
    if (seleccionadosSet.has(idStr)) onChange(seleccionados.filter((s) => s !== idStr))
    else onChange([...seleccionados, idStr])
  }

  function alternarMuni(municipio) {
    setMuniAbiertos((prev) => {
      const next = new Set(prev)
      if (next.has(municipio)) next.delete(municipio)
      else next.add(municipio)
      return next
    })
  }

  function seleccionarTodasIE() {
    const ids = porTipo.institucion_educativa.map((d) => String(d.id))
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

        {tab === 'institucion_educativa' ? (
          municipios.map(([municipio, lista]) => {
            const abierto = buscando || muniAbiertos.has(municipio)
            return (
              <div key={municipio} className={styles.grupoMuni}>
                <button type="button" className={styles.muniHead} onClick={() => alternarMuni(municipio)} aria-expanded={abierto}>
                  <span className={styles.muniNombre}>{municipio}</span>
                  <span className={styles.muniMeta}>
                    <span className={styles.n}>{lista.length}</span>
                    <Chevron abierto={abierto} />
                  </span>
                </button>
                {abierto && (
                  <div className={styles.muniBody}>
                    {lista.map((d) => (
                      <label key={d.id} className={styles.item}>
                        <input
                          type="checkbox"
                          checked={seleccionadosSet.has(String(d.id))}
                          onChange={() => alternar(d.id)}
                        />
                        {d.nombre}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        ) : (
          filtrados.map((d) => (
            <label key={d.id} className={styles.item}>
              <input
                type="checkbox"
                checked={seleccionadosSet.has(String(d.id))}
                onChange={() => alternar(d.id)}
              />
              {d.nombre}
              {d.municipio && <span className={styles.mun}>{d.municipio}</span>}
            </label>
          ))
        )}
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
        <button type="button" className={styles.btnGhost} onClick={seleccionarTodasIE}>
          Seleccionar todas las instituciones
        </button>
      )}
    </div>
  )
}
