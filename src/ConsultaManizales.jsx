import { useMemo, useState } from 'react'
import { useEntidad } from './panel/hooks/useEntidad'
import { Cargando, AvisoError, Vacio } from './components/Estado'
import EstadoTag from './components/EstadoTag'
import EstadoStepper from './components/EstadoStepper'
import { formatearFecha } from './utils/formato'
import styles from './ConsultaManizales.module.css'

function Chevron({ abierto }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={abierto ? styles.chevronAbierto : styles.chevron}>
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function estadoDominante(propias) {
  if (!propias.length) return 'No iniciada'
  if (propias.every((a) => a.estado === 'Implementada')) return 'Implementada'
  if (propias.every((a) => a.estado === 'Cancelada')) return 'Cancelada'
  if (propias.some((a) => a.estado === 'En proceso' || a.estado === 'Implementada')) return 'En proceso'
  return 'No iniciada'
}

/**
 * Vista pública de solo lectura para un externo: estado de las recomendaciones
 * emitidas a instituciones educativas de Manizales, con sus evidencias. No hay
 * ninguna acción de escritura ni enlaces mágicos — es solo consulta.
 */
export default function ConsultaManizales() {
  const rec = useEntidad('recomendaciones')
  const dest = useEntidad('destinatarios')
  const asig = useEntidad('asignaciones')
  const evid = useEntidad('evidencias')

  const [busqueda, setBusqueda] = useState('')
  const [abiertas, setAbiertas] = useState(() => new Set())

  const asignacionesPorDestinatario = useMemo(() => {
    const mapa = new Map()
    for (const a of asig.datos) {
      const lista = mapa.get(String(a.destinatario_id)) || []
      lista.push(a)
      mapa.set(String(a.destinatario_id), lista)
    }
    return mapa
  }, [asig.datos])

  const evidenciasPorAsignacion = useMemo(() => {
    const mapa = new Map()
    for (const e of evid.datos) {
      const lista = mapa.get(String(e.asignacion_id)) || []
      lista.push(e)
      mapa.set(String(e.asignacion_id), lista)
    }
    return mapa
  }, [evid.datos])

  const mapaRec = useMemo(() => new Map(rec.datos.map((r) => [String(r.id), r])), [rec.datos])

  const instituciones = useMemo(() => {
    return dest.datos
      .filter((d) => d.tipo === 'institucion_educativa' && d.municipio === 'Manizales')
      .map((d) => {
        const asignaciones = (asignacionesPorDestinatario.get(String(d.id)) || [])
          .map((a) => ({ ...a, recomendacion: mapaRec.get(String(a.recomendacion_id)) }))
          .filter((a) => a.recomendacion)
          .sort((a, b) => Number(b.recomendacion_id) - Number(a.recomendacion_id))
        return { ...d, asignaciones }
      })
      .filter((d) => d.asignaciones.length > 0)
  }, [dest.datos, asignacionesPorDestinatario, mapaRec])

  const filtradas = useMemo(() => {
    let lista = instituciones
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase()
      lista = lista.filter((d) => d.nombre.toLowerCase().includes(q))
    }
    return [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [instituciones, busqueda])

  function alternar(id) {
    setAbiertas((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const cargando = rec.cargando || dest.cargando || asig.cargando || evid.cargando
  if (cargando) return <Cargando texto="Cargando…" />
  if (rec.error) return <AvisoError mensaje={rec.error} onReintentar={rec.recargar} />

  return (
    <div className={styles.shell}>
      <div className={styles.head}>
        <h1 className={styles.titulo}>Recomendaciones — Instituciones educativas de Manizales</h1>
        <p className={styles.desc}>
          Estado de implementación de las recomendaciones del Comité Académico para cada institución
          educativa de Manizales, con las evidencias cargadas por cada una.
        </p>
      </div>

      <input
        type="search"
        placeholder="Buscar institución…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className={styles.buscador}
        aria-label="Buscar institución"
      />

      {filtradas.length === 0 && <Vacio texto="No hay instituciones de Manizales con recomendaciones asignadas." />}

      <div className={styles.libreta}>
        {filtradas.map((d) => {
          const dominante = estadoDominante(d.asignaciones)
          const abierta = abiertas.has(d.id)
          return (
            <div key={d.id} className={styles.ficha}>
              <button type="button" className={styles.fichaHead} onClick={() => alternar(d.id)} aria-expanded={abierta}>
                <span className={styles.destNombre}>{d.nombre}</span>
                <span className={styles.headRight}>
                  <span className={styles.nRec}>{d.asignaciones.length} recomendación{d.asignaciones.length > 1 ? 'es' : ''}</span>
                  <EstadoStepper estado={dominante} />
                  <EstadoTag estado={dominante} />
                  <Chevron abierto={abierta} />
                </span>
              </button>

              {abierta && (
                <div className={styles.fichaBody}>
                  {d.asignaciones.map((a) => {
                    const r = a.recomendacion
                    const evidencias = evidenciasPorAsignacion.get(String(a.id)) || []
                    return (
                      <div key={a.id} className={styles.recCard}>
                        <div className={styles.recCardHead}>
                          <span className={styles.tipoChip} data-tipo={r.tipo}>{r.tipo}</span>
                          <span className={styles.prioridad} data-prioridad={r.prioridad}>{r.prioridad}</span>
                          <span className={styles.recCardMeta}>
                            <EstadoStepper estado={a.estado || 'No iniciada'} />
                            <EstadoTag estado={a.estado || 'No iniciada'} />
                          </span>
                        </div>
                        <p className={styles.texto}>{r.recomendacion}</p>
                        {r.evidencia_esperada && <p className={styles.hallazgo}><b>Evidencia esperada:</b> {r.evidencia_esperada}</p>}
                        <div className={styles.fechas}>
                          {r.fecha_inicio && <span>Inicio: {formatearFecha(r.fecha_inicio)}</span>}
                          {r.fecha_estimada && <span>Estimada: {formatearFecha(r.fecha_estimada)}</span>}
                          <span className="font-mono">{a.porcentaje || 0}%</span>
                        </div>
                        {a.observaciones && <p className={styles.hallazgo}><b>Observaciones:</b> {a.observaciones}</p>}

                        <div className={styles.evidencias}>
                          <span className={styles.evidenciasTitulo}>
                            Evidencias {evidencias.length > 0 ? `(${evidencias.length})` : ''}
                          </span>
                          {evidencias.length === 0 ? (
                            <p className={styles.sinEvidencias}>Sin evidencias cargadas todavía.</p>
                          ) : (
                            <ul className={styles.listaEvidencias}>
                              {evidencias.map((ev) => (
                                <li key={ev.id}>
                                  <a href={ev.url} target="_blank" rel="noreferrer">{ev.titulo || ev.url}</a>
                                  {ev.fecha && <span className={styles.evFecha}>{formatearFecha(ev.fecha)}</span>}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
