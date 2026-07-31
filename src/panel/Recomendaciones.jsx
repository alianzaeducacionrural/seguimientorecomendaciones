import { useMemo, useState } from 'react'
import { useEntidad } from './hooks/useEntidad'
import { Cargando, AvisoError, Vacio } from '../components/Estado'
import Modal from '../components/Modal'
import EstadoTag from '../components/EstadoTag'
import SelectorDestinatarios from '../components/SelectorDestinatarios'
import { asignarDestinatarios } from '../utils/api'
import { formatearFecha, TIPOS_RECOMENDACION, PRIORIDADES } from '../utils/formato'
import styles from './Recomendaciones.module.css'

const VACIO_FORM = {
  recomendacion: '', tipo: TIPOS_RECOMENDACION[0], hallazgo: '', prioridad: 'Media',
  evidencia_esperada: '', fecha_inicio: '', fecha_estimada: '',
}

export default function Recomendaciones() {
  const rec = useEntidad('recomendaciones')
  const dest = useEntidad('destinatarios')
  const asig = useEntidad('asignaciones')

  const [modalForm, setModalForm] = useState(null) // {id?} | null
  const [form, setForm] = useState(VACIO_FORM)
  const [guardando, setGuardando] = useState(false)

  const [modalAsignar, setModalAsignar] = useState(null) // recomendacion | null
  const [seleccion, setSeleccion] = useState([])
  const [guardandoAsig, setGuardandoAsig] = useState(false)

  const asignacionesPorRecomendacion = useMemo(() => {
    const mapa = new Map()
    for (const a of asig.datos) {
      const lista = mapa.get(String(a.recomendacion_id)) || []
      lista.push(a)
      mapa.set(String(a.recomendacion_id), lista)
    }
    return mapa
  }, [asig.datos])

  const mapaDest = useMemo(() => new Map(dest.datos.map((d) => [String(d.id), d])), [dest.datos])

  function abrirCrear() {
    setForm(VACIO_FORM)
    setModalForm({})
  }

  function abrirEditar(r) {
    setForm({
      recomendacion: r.recomendacion, tipo: r.tipo, hallazgo: r.hallazgo || '',
      prioridad: r.prioridad || 'Media', evidencia_esperada: r.evidencia_esperada || '',
      fecha_inicio: r.fecha_inicio || '', fecha_estimada: r.fecha_estimada || '',
    })
    setModalForm({ id: r.id })
  }

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    try {
      if (modalForm.id) await rec.editarItem(modalForm.id, form)
      else await rec.crearItem(form)
      setModalForm(null)
    } catch (err) {
      alert(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(r) {
    if (!confirm(`¿Eliminar la recomendación ${r.codigo}? También se perderán sus asignaciones.`)) return
    await rec.eliminarItem(r.id)
  }

  function abrirAsignar(r) {
    const yaAsignados = (asignacionesPorRecomendacion.get(String(r.id)) || []).map((a) => String(a.destinatario_id))
    setSeleccion(yaAsignados)
    setModalAsignar(r)
  }

  async function guardarAsignacion() {
    setGuardandoAsig(true)
    try {
      await asignarDestinatarios(modalAsignar.id, seleccion)
      await asig.recargar()
      setModalAsignar(null)
    } catch (err) {
      alert(err.message)
    } finally {
      setGuardandoAsig(false)
    }
  }

  if (rec.cargando || dest.cargando || asig.cargando) return <Cargando texto="Cargando recomendaciones…" />
  if (rec.error) return <AvisoError mensaje={rec.error} onReintentar={rec.recargar} />

  return (
    <div>
      <div className={styles.head}>
        <div>
          <h1 className={styles.titulo}>Recomendaciones</h1>
          <p className={styles.desc}>Registro de recomendaciones del Comité Académico y sus destinatarios.</p>
        </div>
        <button type="button" className={styles.btnPrimary} onClick={abrirCrear}>Nueva recomendación</button>
      </div>

      {rec.datos.length === 0 && <Vacio texto="Aún no hay recomendaciones registradas." />}

      <div className={styles.lista}>
        {[...rec.datos].sort((a, b) => Number(b.id) - Number(a.id)).map((r) => {
          const propias = asignacionesPorRecomendacion.get(String(r.id)) || []
          return (
            <div key={r.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div>
                  <span className={`${styles.codigo} font-mono`}>{r.codigo}</span>
                  <span className={styles.tipoChip}>{r.tipo}</span>
                  <span className={styles.prioridad} data-prioridad={r.prioridad}>{r.prioridad}</span>
                </div>
                <div className={styles.acciones}>
                  <button type="button" onClick={() => abrirAsignar(r)}>Asignar destinatarios</button>
                  <button type="button" onClick={() => abrirEditar(r)}>Editar</button>
                  <button type="button" className={styles.btnDanger} onClick={() => eliminar(r)}>Eliminar</button>
                </div>
              </div>
              <p className={styles.texto}>{r.recomendacion}</p>
              {r.hallazgo && <p className={styles.hallazgo}><b>Hallazgo:</b> {r.hallazgo}</p>}
              <div className={styles.fechas}>
                {r.fecha_inicio && <span>Inicio: {formatearFecha(r.fecha_inicio)}</span>}
                {r.fecha_estimada && <span>Estimada: {formatearFecha(r.fecha_estimada)}</span>}
              </div>
              <div className={styles.destinatarios}>
                {propias.length === 0 && <span className={styles.sinAsignar}>Sin destinatarios asignados</span>}
                {propias.map((a) => {
                  const d = mapaDest.get(String(a.destinatario_id))
                  if (!d) return null
                  return (
                    <span key={a.id} className={styles.destChip}>
                      {d.nombre}
                      <EstadoTag estado={a.estado || 'No iniciada'} />
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {modalForm && (
        <Modal titulo={modalForm.id ? 'Editar recomendación' : 'Nueva recomendación'} onCerrar={() => setModalForm(null)} ancho="640px">
          <form className={styles.form} onSubmit={guardar}>
            <label className={styles.campo}>
              <span>Recomendación</span>
              <textarea rows={3} required value={form.recomendacion} onChange={(e) => setForm({ ...form, recomendacion: e.target.value })} />
            </label>
            <div className={styles.formGrid}>
              <label className={styles.campo}>
                <span>Tipo</span>
                <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                  {TIPOS_RECOMENDACION.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className={styles.campo}>
                <span>Prioridad</span>
                <select value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })}>
                  {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
            </div>
            <label className={styles.campo}>
              <span>Hallazgo o necesidad identificada</span>
              <textarea rows={2} value={form.hallazgo} onChange={(e) => setForm({ ...form, hallazgo: e.target.value })} />
            </label>
            <label className={styles.campo}>
              <span>Evidencia de cumplimiento esperada</span>
              <input type="text" value={form.evidencia_esperada} onChange={(e) => setForm({ ...form, evidencia_esperada: e.target.value })} />
            </label>
            <div className={styles.formGrid}>
              <label className={styles.campo}>
                <span>Fecha de inicio</span>
                <input type="date" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} />
              </label>
              <label className={styles.campo}>
                <span>Fecha estimada de cumplimiento</span>
                <input type="date" value={form.fecha_estimada} onChange={(e) => setForm({ ...form, fecha_estimada: e.target.value })} />
              </label>
            </div>
            <button type="submit" className={styles.btnPrimary} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </form>
        </Modal>
      )}

      {modalAsignar && (
        <Modal titulo={`Asignar destinatarios — ${modalAsignar.codigo}`} onCerrar={() => setModalAsignar(null)} ancho="600px">
          <p className={styles.modalDesc}>{modalAsignar.recomendacion}</p>
          <SelectorDestinatarios destinatarios={dest.datos} seleccionados={seleccion} onChange={setSeleccion} />
          <button type="button" className={styles.btnPrimary} style={{ marginTop: 20 }} onClick={guardarAsignacion} disabled={guardandoAsig}>
            {guardandoAsig ? 'Guardando…' : 'Guardar asignación'}
          </button>
        </Modal>
      )}
    </div>
  )
}
