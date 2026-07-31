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

    const porTipoDestinatario = { institucion_educativa: 0, universidad: 0, entidad: 0 }
    destinatarios.forEach((d) => { if (porTipoDestinatario[d.tipo] !== undefined) porTipoDestinatario[d.tipo]++ })

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
      totalDestinatarios: destinatarios.length,
      porTipoDestinatario,
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
      <h1 className={styles.titulo}>Panel de control</h1>
      <p className={styles.desc}>
        Consolidado de recomendaciones emitidas por el Comité Académico y su estado de implementación
        por institución, universidad y entidad.
      </p>

      <div className={styles.grid}>
        <div className={styles.gaugeCard}>
          <GaugeDial pct={100} value={stats.totalRecomendaciones} color="var(--ink-mute)" />
          <div className={styles.label}>Recomendaciones</div>
        </div>
        <div className={styles.gaugeCard}>
          <GaugeDial pct={100} value={stats.totalDestinatarios} color="var(--ink-mute)" />
          <div className={styles.label}>Destinatarios</div>
          <div className={styles.sub}>
            {stats.porTipoDestinatario.institucion_educativa} IE · {stats.porTipoDestinatario.universidad} U ·{' '}
            {stats.porTipoDestinatario.entidad} ent.
          </div>
        </div>
        <div className={styles.gaugeCard}>
          <GaugeDial pct={stats.cumplimientoGlobal} />
          <div className={styles.label}>Cumplimiento global</div>
        </div>
        <div className={styles.gaugeCard}>
          <GaugeDial
            pct={stats.vencidas ? 100 : 0}
            value={stats.vencidas}
            color={stats.vencidas ? 'var(--cancelada)' : 'var(--no-iniciada)'}
          />
          <div className={styles.label}>Vencidas</div>
          <div className={styles.sub}>requieren atención</div>
        </div>
      </div>

      <div className={styles.panel}>
        <h3>Recomendaciones recientes</h3>
        <p className={styles.panelDesc}>Últimas {stats.recientes.length} de {stats.totalRecomendaciones}</p>
        {stats.recientes.map((r) => (
          <div key={r.id} className={styles.recRow}>
            <div className={`${styles.code} font-mono`}>{r.codigo}</div>
            <div className={styles.body}>
              <p className={styles.recTitulo}>
                <span className={styles.tipoChip}>{r.tipo}</span>
                {r.recomendacion}
              </p>
              <div className={styles.dest}>{r.destinatarios.join(' · ') || 'sin destinatarios asignados'}</div>
            </div>
            <div className={styles.right}>
              {r.destinatarios.length > 0 ? <EstadoTag estado={r.estadoDominante} /> : null}
            </div>
          </div>
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
