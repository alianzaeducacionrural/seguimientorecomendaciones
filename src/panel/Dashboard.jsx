import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useEntidad } from './hooks/useEntidad'
import { Cargando, AvisoError } from '../components/Estado'
import GaugeDial from '../components/GaugeDial'
import EstadoTag from '../components/EstadoTag'
import { TIPOS_DESTINATARIO_PLURAL } from '../utils/formato'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const rec = useEntidad('recomendaciones')
  const asig = useEntidad('asignaciones')
  const dest = useEntidad('destinatarios')

  const cargando = rec.cargando || asig.cargando || dest.cargando
  const error = rec.error || asig.error || dest.error

  const stats = useMemo(() => {
    const destinatarios = dest.datos
    const asignaciones = asig.datos
    const recomendaciones = rec.datos

    const mapaDest = new Map(destinatarios.map((d) => [String(d.id), d]))
    const mapaRec = new Map(recomendaciones.map((r) => [String(r.id), r]))

    const conteoEstado = { 'No iniciada': 0, 'En proceso': 0, 'Implementada': 0, 'Cancelada': 0 }
    const avancePorTipo = { institucion_educativa: [], universidad: [], entidad: [] }
    let vencidas = 0
    const hoy = new Date().toISOString().slice(0, 10)

    asignaciones.forEach((a) => {
      const estado = a.estado || 'No iniciada'
      if (conteoEstado[estado] !== undefined) conteoEstado[estado]++
      const d = mapaDest.get(String(a.destinatario_id))
      if (d && avancePorTipo[d.tipo]) avancePorTipo[d.tipo].push(Number(a.porcentaje) || 0)
      const r = mapaRec.get(String(a.recomendacion_id))
      if (r?.fecha_estimada && r.fecha_estimada < hoy && estado !== 'Implementada' && estado !== 'Cancelada') {
        vencidas++
      }
    })

    const promedio = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0)
    const totalConAvance = asignaciones.length
    const cumplimientoGlobal = totalConAvance
      ? Math.round(asignaciones.reduce((acc, a) => acc + (Number(a.porcentaje) || 0), 0) / totalConAvance)
      : 0

    const recientes = [...recomendaciones]
      .sort((a, b) => Number(b.id) - Number(a.id))
      .slice(0, 5)
      .map((r) => {
        const propias = asignaciones.filter((a) => String(a.recomendacion_id) === String(r.id))
        const nombres = propias.map((a) => mapaDest.get(String(a.destinatario_id))?.nombre).filter(Boolean)
        const avg = promedio(propias.map((a) => Number(a.porcentaje) || 0))
        const estadoDominante = propias.length && propias.every((a) => a.estado === 'Implementada')
          ? 'Implementada'
          : propias.some((a) => a.estado === 'En proceso') ? 'En proceso'
          : propias.some((a) => a.estado === 'Cancelada') && propias.every((a) => a.estado === 'Cancelada') ? 'Cancelada'
          : 'No iniciada'
        return { ...r, destinatarios: nombres, avance: avg, estadoDominante }
      })

    return {
      totalRecomendaciones: recomendaciones.length,
      cumplimientoGlobal,
      conteoEstado,
      vencidas,
      avancePorTipo: {
        institucion_educativa: promedio(avancePorTipo.institucion_educativa),
        universidad: promedio(avancePorTipo.universidad),
        entidad: promedio(avancePorTipo.entidad),
      },
      recientes,
    }
  }, [rec.datos, asig.datos, dest.datos])

  if (cargando) return <Cargando texto="Cargando panel…" />
  if (error) return <AvisoError mensaje={error} onReintentar={() => { rec.recargar(); asig.recargar(); dest.recargar() }} />

  return (
    <div>
      <span className="eyebrow">Resumen</span>
      <h1 className={styles.titulo}>Panel de control</h1>
      <p className={styles.desc}>
        Consolidado de recomendaciones emitidas por el Comité Académico y su estado de implementación
        por institución, universidad y entidad.
      </p>

      <div className={styles.grid}>
        <div className={styles.hero}>
          <GaugeDial pct={stats.cumplimientoGlobal} size={108} />
          <div className={styles.heroTexto}>
            <span className="eyebrow">Cumplimiento global</span>
            <p className={`${styles.heroValor} font-mono`}>{stats.cumplimientoGlobal}%</p>
            <p className={styles.heroSub}>promedio de avance sobre {asig.datos.length} asignaciones activas</p>
          </div>
        </div>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className="eyebrow">Recomendaciones</span>
            <p className={`${styles.statValor} font-mono`}>{stats.totalRecomendaciones}</p>
          </div>
          <div className={`${styles.stat} ${stats.vencidas ? styles.statAlerta : ''}`}>
            <span className="eyebrow">Vencidas</span>
            <p className={`${styles.statValor} font-mono`}>{stats.vencidas}</p>
            <p className={styles.statSub}>requieren atención</p>
          </div>
        </div>
      </div>

      <div className={styles.panel}>
        <h3>Recomendaciones recientes</h3>
        <p className={styles.panelDesc}>Últimas {stats.recientes.length} de {stats.totalRecomendaciones}</p>
        {stats.recientes.map((r) => (
          <Link key={r.id} to={`/panel/recomendaciones?abrir=${r.id}`} className={styles.recRow}>
            <div className={styles.body}>
              <p className={styles.recTitulo}>
                <span className={styles.tipoChip} data-tipo={r.tipo}>{r.tipo}</span>
                {r.recomendacion}
              </p>
              <div className={styles.dest}>{r.destinatarios.join(' · ') || 'sin destinatarios asignados'}</div>
            </div>
            <div className={styles.right}>
              {r.destinatarios.length > 0 ? <EstadoTag estado={r.estadoDominante} /> : null}
            </div>
          </Link>
        ))}
        <Link to="/panel/recomendaciones" className={styles.verTodas}>Ver todas las recomendaciones →</Link>
      </div>

      <div className={styles.panel}>
        <h3>Avance por tipo de destinatario</h3>
        <div className={styles.barras}>
          {Object.entries(TIPOS_DESTINATARIO_PLURAL).map(([clave, etiqueta]) => (
            <div key={clave} className={styles.barraFila}>
              <div className={styles.barraHead}>
                <span>{etiqueta}</span>
                <b className="font-mono">{stats.avancePorTipo[clave]}%</b>
              </div>
              <div className={styles.track}>
                <div className={styles.fill} style={{ width: `${stats.avancePorTipo[clave]}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
