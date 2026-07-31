import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getPortal, reportarAvance, subirEvidenciaEnlace, subirEvidenciaArchivo } from '../utils/api'
import { Cargando, AvisoError } from '../components/Estado'
import EstadoTag from '../components/EstadoTag'
import GaugeDial from '../components/GaugeDial'
import { ESTADOS, TIPOS_AJUSTE, TIPOS_DESTINATARIO } from '../utils/formato'
import styles from './Portal.module.css'

const LIMITE_ARCHIVO = 9 * 1024 * 1024 // ~9MB, margen bajo el límite práctico de Apps Script

export default function Portal() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''

  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(token ? null : 'Falta el token en el enlace.')

  const cargar = useCallback(() => {
    if (!token) return
    setCargando(true)
    setError(null)
    getPortal(token)
      .then(setDatos)
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false))
  }, [token])

  // Tras guardar un reporte se refresca en silencio: NO pasa por `cargando`,
  // para no desmontar las tarjetas (y con ellas el mensaje "Reporte guardado."
  // y el estado local del formulario) mientras se refleja el dato nuevo.
  const recargarSilencioso = useCallback(() => {
    if (!token) return
    getPortal(token).then(setDatos).catch(() => {})
  }, [token])

  useEffect(() => { cargar() }, [cargar])

  if (!token) return <PantallaVacia mensaje="Este enlace no incluye un token válido. Solicita el enlace correcto al Comité Académico." />
  if (cargando) return <PantallaVacia><Cargando texto="Cargando tu portal…" /></PantallaVacia>
  if (error) return <PantallaVacia><AvisoError mensaje={error} onReintentar={cargar} /></PantallaVacia>

  return <PortalContenido datos={datos} token={token} onRecargar={recargarSilencioso} />
}

function PantallaVacia({ children, mensaje }) {
  return (
    <div className={styles.shell}>
      <main className={styles.main}>{children || <AvisoError mensaje={mensaje} />}</main>
    </div>
  )
}

function PortalContenido({ datos, token, onRecargar }) {
  const { destinatario, asignaciones } = datos
  const stats = useMemo(() => {
    const total = asignaciones.length
    const implementadas = asignaciones.filter((a) => a.estado === 'Implementada').length
    const promedio = total ? Math.round(asignaciones.reduce((s, a) => s + (Number(a.porcentaje) || 0), 0) / total) : 0
    return { total, implementadas, promedio }
  }, [asignaciones])

  return (
    <div className={styles.shell}>
      <header className={styles.top}>
        <div className={styles.mark}>CA</div>
        <div>
          <div className={styles.name}>Consola de Recomendaciones</div>
          <div className={`${styles.sub} font-mono`}>portal de seguimiento</div>
        </div>
      </header>
      <main className={styles.main}>
        <div className={styles.hero}>
          <div className={styles.eyebrow}>enlace personal // token activo</div>
          <h1>{destinatario.nombre}</h1>
          <p>
            {TIPOS_DESTINATARIO[destinatario.tipo]}{destinatario.municipio ? ` · ${destinatario.municipio}` : ''} — reporte de
            avance de las recomendaciones asignadas.
          </p>
          <div className={styles.stats}>
            <div><b className="font-mono">{stats.total}</b><span>asignadas</span></div>
            <div><b className="font-mono">{stats.implementadas}</b><span>implementadas</span></div>
            <div><b className="font-mono">{stats.promedio}%</b><span>avance promedio</span></div>
          </div>
        </div>

        {asignaciones.length === 0 && (
          <p className={styles.sinAsignaciones}>Todavía no tienes recomendaciones asignadas.</p>
        )}

        {asignaciones.map((a) => (
          <TarjetaAsignacion key={a.id} asignacion={a} token={token} onGuardado={onRecargar} />
        ))}
      </main>
    </div>
  )
}

function TarjetaAsignacion({ asignacion, token, onGuardado }) {
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
      await reportarAvance(token, asignacion.id, {
        estado, porcentaje: Number(porcentaje), tipo_ajuste: tipoAjuste,
        descripcion_ajuste: descripcion, impacto, observaciones,
      })
      if (enlaceEvidencia.trim()) {
        await subirEvidenciaEnlace(token, asignacion.id, 'Evidencia', enlaceEvidencia.trim())
        setEnlaceEvidencia('')
      }
      setMensaje('Reporte guardado.')
      onGuardado()
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
      await subirEvidenciaArchivo(token, asignacion.id, archivo.name, archivo.type || 'application/octet-stream', base64)
      setMensaje('Archivo subido.')
      onGuardado()
    } catch (err) {
      setMensaje(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className={styles.tarjeta}>
      <div className={styles.tarjetaTop}>
        <div>
          <div className={`${styles.codigo} font-mono`}>{r.codigo}</div>
          <h4>{r.recomendacion}</h4>
          {r.evidencia_esperada && <p className={styles.evidenciaEsperada}>Evidencia esperada: {r.evidencia_esperada}</p>}
        </div>
        <EstadoTag estado={asignacion.estado || 'No iniciada'} />
      </div>

      <div className={styles.dialRow}>
        <GaugeDial pct={Number(asignacion.porcentaje) || 0} size={56} />
        <span className={styles.dialTexto}>Último avance reportado</span>
      </div>

      {asignacion.evidencias?.length > 0 && (
        <ul className={styles.listaEvidencias}>
          {asignacion.evidencias.map((ev) => (
            <li key={ev.id}>
              <a href={ev.url} target="_blank" rel="noreferrer">{ev.titulo || ev.url}</a>
            </li>
          ))}
        </ul>
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
            <span>Evidencia</span>
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
        {guardando ? 'Guardando…' : 'Guardar reporte'}
      </button>
    </div>
  )
}

function archivoABase64(archivo) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onload = () => resolve(String(lector.result).split(',')[1])
    lector.onerror = reject
    lector.readAsDataURL(archivo)
  })
}
