import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useEntidad } from './hooks/useEntidad'
import { Cargando, AvisoError, Vacio } from '../components/Estado'
import Modal from '../components/Modal'
import EstadoTag from '../components/EstadoTag'
import EstadoStepper from '../components/EstadoStepper'
import EnlaceMagico from '../components/EnlaceMagico'
import FormularioRecomendacion from '../components/FormularioRecomendacion'
import ModalAsignacion from '../components/ModalAsignacion'
import { asignarDestinatarios, eliminar as eliminarRegistro } from '../utils/api'
import { formatearFecha, TIPOS_DESTINATARIO_PLURAL } from '../utils/formato'
import styles from './Recomendaciones.module.css'

const TABS = ['institucion_educativa', 'universidad', 'entidad']

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

export default function Recomendaciones() {
  const rec = useEntidad('recomendaciones')
  const dest = useEntidad('destinatarios')
  const asig = useEntidad('asignaciones')
  const evid = useEntidad('evidencias')

  const [tab, setTab] = useState('institucion_educativa')
  const [busqueda, setBusqueda] = useState('')
  const [modalForm, setModalForm] = useState(null) // { nuevo: true } | recomendación | null
  const [modalAsignacion, setModalAsignacion] = useState(null) // { asignacion, destinatario } | null
  const [abiertas, setAbiertas] = useState(() => new Set())
  const [enlaceCopiado, setEnlaceCopiado] = useState(false)
  const [searchParams] = useSearchParams()
  const [resaltada, setResaltada] = useState(null)

  // llegó desde "Recomendaciones recientes" del dashboard (?abrir=<id>) — ubica a qué
  // destinatarios pertenece esa recomendación, cambia de pestaña, expande y resalta
  useEffect(() => {
    const abrirId = searchParams.get('abrir')
    if (!abrirId || rec.cargando || asig.cargando || dest.cargando) return
    const relacionadas = asig.datos.filter((a) => String(a.recomendacion_id) === String(abrirId))
    if (!relacionadas.length) return
    const idsDestino = relacionadas.map((a) => Number(a.destinatario_id))
    const primerDest = dest.datos.find((d) => idsDestino.includes(Number(d.id)))
    if (primerDest) setTab(primerDest.tipo)
    setAbiertas((prev) => {
      const next = new Set(prev)
      idsDestino.forEach((id) => next.add(id))
      return next
    })
    setResaltada(idsDestino[0] ?? null)
    const t = setTimeout(() => setResaltada(null), 2200)
    const raf = requestAnimationFrame(() => {
      document.getElementById(`dest-${idsDestino[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => { clearTimeout(t); cancelAnimationFrame(raf) }
  }, [searchParams, rec.cargando, asig.cargando, dest.cargando, asig.datos, dest.datos])

  async function copiarEnlaceEmitir() {
    const url = `${window.location.origin}${import.meta.env.BASE_URL}emitir`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt('Copia el enlace:', url)
    }
    setEnlaceCopiado(true)
    setTimeout(() => setEnlaceCopiado(false), 1600)
  }

  const asignacionesPorRecomendacion = useMemo(() => {
    const mapa = new Map()
    for (const a of asig.datos) {
      const lista = mapa.get(String(a.recomendacion_id)) || []
      lista.push(a)
      mapa.set(String(a.recomendacion_id), lista)
    }
    return mapa
  }, [asig.datos])

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
      const n = mapa.get(String(e.asignacion_id)) || 0
      mapa.set(String(e.asignacion_id), n + 1)
    }
    return mapa
  }, [evid.datos])

  const mapaRec = useMemo(() => new Map(rec.datos.map((r) => [String(r.id), r])), [rec.datos])

  // destinatarios con al menos una recomendación, cada uno con sus asignaciones ya resueltas a la recomendación completa
  const destinatariosActivos = useMemo(() => {
    return dest.datos
      .map((d) => {
        const asignaciones = (asignacionesPorDestinatario.get(String(d.id)) || [])
          .map((a) => ({ ...a, recomendacion: mapaRec.get(String(a.recomendacion_id)) }))
          .filter((a) => a.recomendacion)
          .sort((a, b) => Number(b.recomendacion_id) - Number(a.recomendacion_id))
        return { ...d, asignaciones }
      })
      .filter((d) => d.asignaciones.length > 0)
  }, [dest.datos, asignacionesPorDestinatario, mapaRec])

  const sinAsignar = useMemo(
    () => rec.datos.filter((r) => !(asignacionesPorRecomendacion.get(String(r.id))?.length)),
    [rec.datos, asignacionesPorRecomendacion],
  )

  const filtrados = useMemo(() => {
    let lista = destinatariosActivos.filter((d) => d.tipo === tab)
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase()
      lista = lista.filter((d) => d.nombre.toLowerCase().includes(q))
    }
    return [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [destinatariosActivos, tab, busqueda])

  function alternar(id) {
    setAbiertas((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function abrirCrear() {
    setModalForm({ nuevo: true })
  }

  function abrirEditar(r) {
    setModalForm(r)
  }

  async function guardarForm(form, seleccion) {
    let id = modalForm.id
    const yaAsignados = modalForm.nuevo ? [] : (asignacionesPorRecomendacion.get(String(modalForm.id)) || [])
    const yaAsignadosIds = new Set(yaAsignados.map((a) => String(a.destinatario_id)))

    if (modalForm.nuevo) {
      id = await rec.crearItem(form)
    } else {
      await rec.editarItem(modalForm.id, form)
    }

    const seleccionSet = new Set(seleccion)
    const agregar = seleccion.filter((did) => !yaAsignadosIds.has(did))
    const quitar = yaAsignados.filter((a) => !seleccionSet.has(String(a.destinatario_id)))

    if (agregar.length) await asignarDestinatarios(id, agregar)
    for (const a of quitar) await eliminarRegistro('asignaciones', a.id)
    if (agregar.length || quitar.length) {
      await asig.recargar()
      if (quitar.length) await evid.recargar()
    }

    setModalForm(null)
  }

  // quita la recomendación SOLO de este destinatario — es una asignación, no la
  // recomendación en sí, así que las demás instituciones/universidades/entidades
  // que la tengan asignada no se ven afectadas
  async function quitarAsignacion(a, d) {
    if (!confirm(`¿Quitar "${a.recomendacion.codigo}" de ${d.nombre}? No afecta a los demás destinatarios que la tengan asignada.`)) return
    await eliminarRegistro('asignaciones', a.id)
    await asig.recargar()
    await evid.recargar()
  }

  // solo aparece para recomendaciones sin ningún destinatario — ahí sí se
  // puede borrar del todo porque no hay nadie más a quien afectar
  async function eliminarRecomendacionVacia(r) {
    if (!confirm(`¿Eliminar definitivamente la recomendación ${r.codigo}? No tiene destinatarios asignados.`)) return
    await rec.eliminarItem(r.id)
  }

  if (rec.cargando || dest.cargando || asig.cargando || evid.cargando) return <Cargando texto="Cargando recomendaciones…" />
  if (rec.error) return <AvisoError mensaje={rec.error} onReintentar={rec.recargar} />

  return (
    <div>
      <div className={styles.head}>
        <div>
          <span className="eyebrow">Seguimiento</span>
          <h1 className={styles.titulo}>Recomendaciones</h1>
          <p className={styles.desc}>Por institución, universidad o entidad — despliega cada una para ver sus recomendaciones y su avance.</p>
        </div>
        <div className={styles.headAcciones}>
          <button type="button" className={styles.btnGhost} onClick={copiarEnlaceEmitir} title="Enlace de solo formulario, para registrar recomendaciones en vivo durante una reunión">
            {enlaceCopiado ? 'Copiado' : 'Copiar enlace para registrar'}
          </button>
          <button type="button" className={styles.btnPrimary} onClick={abrirCrear}>Nueva recomendación</button>
        </div>
      </div>

      {sinAsignar.length > 0 && (
        <div className={styles.aviso}>
          <span className={styles.avisoTitulo}>{sinAsignar.length} recomendación{sinAsignar.length > 1 ? 'es' : ''} sin destinatario asignado</span>
          <div className={styles.avisoLista}>
            {sinAsignar.map((r) => (
              <div key={r.id} className={styles.avisoFila}>
                <button type="button" className={styles.avisoItem} onClick={() => abrirEditar(r)}>
                  <span className="font-mono">{r.codigo}</span> {r.recomendacion}
                </button>
                <button type="button" className={styles.avisoEliminar} onClick={() => eliminarRecomendacionVacia(r)}>Eliminar</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button key={t} type="button" className={tab === t ? styles.activo : ''} onClick={() => setTab(t)}>
            {TIPOS_DESTINATARIO_PLURAL[t]}
            <span className={styles.n}>{destinatariosActivos.filter((d) => d.tipo === t).length}</span>
          </button>
        ))}
        <input
          type="search" placeholder="Buscar…" value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)} className={styles.buscador}
        />
      </div>

      {filtrados.length === 0 && <Vacio texto="No hay destinatarios con recomendaciones asignadas en esta categoría." />}

      <div className={styles.libreta}>
        {filtrados.map((d, i) => {
          const dominante = estadoDominante(d.asignaciones)
          const abierta = abiertas.has(d.id)
          return (
            <div
              key={d.id}
              id={`dest-${d.id}`}
              className={`${styles.ficha} ${d.id === resaltada ? styles.resaltada : ''} entrada`}
              style={{ '--i': i }}
            >
              <button type="button" className={styles.fichaHead} onClick={() => alternar(d.id)} aria-expanded={abierta}>
                <span className={styles.destNombre}>{d.nombre}</span>
                {d.municipio && <span className={styles.destMun}>{d.municipio}</span>}
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
                    const nEv = evidenciasPorAsignacion.get(String(a.id)) || 0
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
                        {r.hallazgo && <p className={styles.hallazgo}><b>Hallazgo:</b> {r.hallazgo}</p>}
                        {r.evidencia_esperada && <p className={styles.hallazgo}><b>Evidencia esperada:</b> {r.evidencia_esperada}</p>}
                        <div className={styles.fechas}>
                          {r.fecha_inicio && <span>Inicio: {formatearFecha(r.fecha_inicio)}</span>}
                          {r.fecha_estimada && <span>Estimada: {formatearFecha(r.fecha_estimada)}</span>}
                          <span className="font-mono">{a.porcentaje || 0}%</span>
                          {nEv > 0 && <span>{nEv} evidencia{nEv > 1 ? 's' : ''}</span>}
                        </div>
                        <div className={styles.acciones}>
                          <button type="button" className={styles.btnAcento} onClick={() => setModalAsignacion({ asignacion: a, destinatario: d })}>
                            Evidencias y detalle{nEv > 0 ? ` (${nEv})` : ''}
                          </button>
                          <button type="button" onClick={() => abrirEditar(r)}>Editar y reasignar</button>
                          <button type="button" className={styles.btnDanger} onClick={() => quitarAsignacion(a, d)}>Quitar de aquí</button>
                          <EnlaceMagico token={d.token} />
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

      {modalForm && (
        <Modal titulo={modalForm.nuevo ? 'Nueva recomendación' : `Editar — ${modalForm.codigo}`} onCerrar={() => setModalForm(null)} ancho="680px">
          <FormularioRecomendacion
            key={modalForm.nuevo ? 'nuevo' : modalForm.id}
            destinatarios={dest.datos}
            valoresIniciales={modalForm.nuevo ? undefined : {
              recomendacion: modalForm.recomendacion, tipo: modalForm.tipo, hallazgo: modalForm.hallazgo || '',
              prioridad: modalForm.prioridad || 'Media', evidencia_esperada: modalForm.evidencia_esperada || '',
              fecha_inicio: modalForm.fecha_inicio || '', fecha_estimada: modalForm.fecha_estimada || '',
            }}
            seleccionInicial={modalForm.nuevo ? [] : (asignacionesPorRecomendacion.get(String(modalForm.id)) || []).map((a) => String(a.destinatario_id))}
            onGuardar={guardarForm}
            textoBoton={modalForm.nuevo ? 'Guardar' : 'Guardar cambios'}
          />
        </Modal>
      )}

      {modalAsignacion && (
        <ModalAsignacion
          asignacion={modalAsignacion.asignacion}
          destinatario={modalAsignacion.destinatario}
          evidencias={evid.datos.filter((e) => String(e.asignacion_id) === String(modalAsignacion.asignacion.id))}
          onCerrar={() => setModalAsignacion(null)}
          onGuardado={async () => { await asig.recargar(); await evid.recargar() }}
        />
      )}
    </div>
  )
}
