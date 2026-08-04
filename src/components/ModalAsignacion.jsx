import { useState } from 'react'
import Modal from './Modal'
import EstadoTag from './EstadoTag'
import { editar, subirEvidenciaEnlace, subirEvidenciaArchivo } from '../utils/api'
import { ESTADOS, TIPOS_AJUSTE, formatearFecha } from '../utils/formato'
import styles from './ModalAsignacion.module.css'

const LIMITE_ARCHIVO = 9 * 1024 * 1024 // ~9MB, margen bajo el límite práctico de Apps Script

function hoy() {
  return new Date().toISOString().slice(0, 10)
}

function archivoABase64(archivo) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onload = () => resolve(String(lector.result).split(',')[1])
    lector.onerror = reject
    lector.readAsDataURL(archivo)
  })
}

/**
 * Detalle + evidencias de UNA asignación (una recomendación para UN destinatario
 * puntual) — el token usado para subirEvidencia/reportarAvance es el del propio
 * destinatario (ya visible en el panel vía "Copiar enlace"), no hay endpoint
 * distinto para admin: aquí se edita directo por id vía el CRUD genérico.
 */
export default function ModalAsignacion({ asignacion, destinatario, evidencias, onCerrar, onGuardado }) {
  const r = asignacion.recomendacion
  const [estado, setEstado] = useState(asignacion.estado || 'No iniciada')
  const [porcentaje, setPorcentaje] = useState(asignacion.porcentaje ?? 0)
  const [tipoAjuste, setTipoAjuste] = useState(asignacion.tipo_ajuste || '')
  const [descripcion, setDescripcion] = useState(asignacion.descripcion_ajuste || '')
  const [impacto, setImpacto] = useState(asignacion.impacto || '')
  const [observaciones, setObservaciones] = useState(asignacion.observaciones || '')
  const [enlaceEvidencia, setEnlaceEvidencia] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  async function guardar() {
    setGuardando(true)
    setMensaje('')
    try {
      await editar('asignaciones', asignacion.id, {
        estado, porcentaje: Number(porcentaje), tipo_ajuste: tipoAjuste,
        descripcion_ajuste: descripcion, impacto, observaciones,
        fecha_reporte: hoy(), actualizado_en: hoy(),
      })
      if (enlaceEvidencia.trim()) {
        await subirEvidenciaEnlace(destinatario.token, asignacion.id, 'Evidencia', enlaceEvidencia.trim())
        setEnlaceEvidencia('')
      }
      setMensaje('Guardado.')
      await onGuardado()
    } catch (err) {
      setMensaje(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function subirArchivo(e) {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    if (archivo.size > LIMITE_ARCHIVO) {
      setMensaje('El archivo supera 9 MB. Usa un enlace de Drive/OneDrive en su lugar.')
      return
    }
    setGuardando(true)
    setMensaje('')
    try {
      const base64 = await archivoABase64(archivo)
      await subirEvidenciaArchivo(destinatario.token, asignacion.id, archivo.name, archivo.type || 'application/octet-stream', base64)
      setMensaje('Archivo subido.')
      await onGuardado()
    } catch (err) {
      setMensaje(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={`${r.codigo} — ${destinatario.nombre}`} onCerrar={onCerrar} ancho="620px">
      <div className={styles.resumen}>
        <div className={styles.resumenTop}>
          <span className={styles.tipoChip}>{r.tipo}</span>
          <EstadoTag estado={asignacion.estado || 'No iniciada'} />
        </div>
        <p className={styles.texto}>{r.recomendacion}</p>
        {r.evidencia_esperada && <p className={styles.evidenciaEsperada}><b>Evidencia esperada:</b> {r.evidencia_esperada}</p>}
      </div>

      {evidencias.length > 0 && (
        <div className={styles.bloque}>
          <span className={styles.bloqueTitulo}>Evidencias cargadas</span>
          <ul className={styles.listaEvidencias}>
            {evidencias.map((ev) => (
              <li key={ev.id}>
                <a href={ev.url} target="_blank" rel="noreferrer">{ev.titulo || ev.url}</a>
                {ev.fecha && <span className={styles.evFecha}>{formatearFecha(ev.fecha)}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.form}>
        <label>
          <span>Estado</span>
          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>
          <span>Porcentaje de avance</span>
          <input type="number" min="0" max="100" value={porcentaje} onChange={(e) => setPorcentaje(e.target.value)} />
        </label>
        <label>
          <span>Tipo de ajuste realizado</span>
          <select value={tipoAjuste} onChange={(e) => setTipoAjuste(e.target.value)}>
            <option value="">Selecciona…</option>
            {TIPOS_AJUSTE.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <div className={styles.full}>
          <label>
            <span>Descripción del ajuste implementado</span>
            <textarea rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </label>
        </div>
        <div className={styles.full}>
          <label>
            <span>Impacto obtenido</span>
            <textarea rows={2} value={impacto} onChange={(e) => setImpacto(e.target.value)} />
          </label>
        </div>
        <div className={styles.full}>
          <label>
            <span>Observaciones de seguimiento</span>
            <textarea rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </label>
        </div>
        <div className={styles.full}>
          <label>
            <span>Agregar evidencia</span>
            <div className={styles.evidRow}>
              <input type="url" placeholder="Enlace a Drive / OneDrive…" value={enlaceEvidencia} onChange={(e) => setEnlaceEvidencia(e.target.value)} />
              <label className={styles.btnGhost}>
                Subir archivo
                <input type="file" hidden onChange={subirArchivo} />
              </label>
            </div>
          </label>
        </div>
      </div>

      {mensaje && <p className={styles.mensaje}>{mensaje}</p>}
      <button type="button" className={styles.btnPrimary} onClick={guardar} disabled={guardando}>
        {guardando ? 'Guardando…' : 'Guardar'}
      </button>
    </Modal>
  )
}
