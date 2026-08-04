import { useState } from 'react'
import SelectorDestinatarios from './SelectorDestinatarios'
import { TIPOS_RECOMENDACION, PRIORIDADES } from '../utils/formato'
import styles from './FormularioRecomendacion.module.css'

const VACIO = {
  recomendacion: '', tipo: TIPOS_RECOMENDACION[0], hallazgo: '', prioridad: 'Media',
  evidencia_esperada: '', fecha_inicio: '', fecha_estimada: '',
}

/**
 * Formulario de recomendación con el selector de destinatarios integrado —
 * se usa tanto en el modal del panel (crear/editar) como en /emitir (solo formulario).
 */
export default function FormularioRecomendacion({
  destinatarios, valoresIniciales, seleccionInicial, onGuardar, textoBoton = 'Guardar', resetAlGuardar = false,
}) {
  const [form, setForm] = useState(valoresIniciales || VACIO)
  const [seleccion, setSeleccion] = useState(seleccionInicial || [])
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setGuardando(true)
    setExito(false)
    try {
      await onGuardar(form, seleccion)
      if (resetAlGuardar) {
        setForm(VACIO)
        setSeleccion([])
        setExito(true)
        setTimeout(() => setExito(false), 4000)
      }
    } catch (err) {
      alert(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={enviar}>
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

      <div className={styles.orden}>
        <div className={styles.ordenHead}>
          <span className={styles.ordenTitulo}>Dirigida a</span>
          <span className={styles.ordenDesc}>Instituciones, universidades o entidades — puedes mezclar varios tipos.</span>
        </div>
        <SelectorDestinatarios destinatarios={destinatarios} seleccionados={seleccion} onChange={setSeleccion} />
      </div>

      <button type="submit" className={styles.btnPrimary} disabled={guardando}>
        {guardando ? 'Guardando…' : textoBoton}
      </button>
      {exito && <p className={styles.exito}>Recomendación registrada.</p>}
    </form>
  )
}
