import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useEntidad } from './hooks/useEntidad'
import { Cargando, AvisoError, Vacio } from '../components/Estado'
import EnlaceMagico from '../components/EnlaceMagico'
import GaugeDial from '../components/GaugeDial'
import EstadoTag from '../components/EstadoTag'
import { TIPOS_DESTINATARIO } from '../utils/formato'
import styles from './Destinatarios.module.css'

const TABS = ['todos', 'institucion_educativa', 'universidad', 'entidad']
const ETIQUETAS_TAB = { todos: 'Todos', institucion_educativa: 'Instituciones', universidad: 'Universidades', entidad: 'Entidades' }

function estadoDominante(propias) {
  if (propias.every((a) => a.estado === 'Implementada')) return 'Implementada'
  if (propias.every((a) => a.estado === 'Cancelada')) return 'Cancelada'
  if (propias.some((a) => a.estado === 'En proceso' || a.estado === 'Implementada')) return 'En proceso'
  return 'No iniciada'
}

export default function Destinatarios() {
  const dest = useEntidad('destinatarios')
  const asig = useEntidad('asignaciones')
  const [tab, setTab] = useState('todos')
  const [busqueda, setBusqueda] = useState('')

  const asignacionesPorDestinatario = useMemo(() => {
    const mapa = new Map()
    for (const a of asig.datos) {
      const lista = mapa.get(String(a.destinatario_id)) || []
      lista.push(a)
      mapa.set(String(a.destinatario_id), lista)
    }
    return mapa
  }, [asig.datos])

  const activos = useMemo(() => {
    return dest.datos
      .map((d) => ({ ...d, asignaciones: asignacionesPorDestinatario.get(String(d.id)) || [] }))
      .filter((d) => d.asignaciones.length > 0)
  }, [dest.datos, asignacionesPorDestinatario])

  const filtrados = useMemo(() => {
    let lista = activos
    if (tab !== 'todos') lista = lista.filter((d) => d.tipo === tab)
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase()
      lista = lista.filter((d) => d.nombre.toLowerCase().includes(q) || (d.municipio || '').toLowerCase().includes(q))
    }
    return [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [activos, tab, busqueda])

  if (dest.cargando || asig.cargando) return <Cargando texto="Cargando destinatarios…" />
  if (dest.error) return <AvisoError mensaje={dest.error} onReintentar={dest.recargar} />

  return (
    <div>
      <div className={styles.head}>
        <div>
          <span className="eyebrow">Seguimiento</span>
          <h1 className={styles.titulo}>Destinatarios activos</h1>
          <p className={styles.desc}>
            Instituciones, universidades y entidades con al menos una recomendación asignada — el
            catálogo completo (crear, editar, sembrar) está en <Link to="/panel/base-datos">Base de datos</Link>.
          </p>
        </div>
      </div>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button key={t} type="button" className={tab === t ? styles.activo : ''} onClick={() => setTab(t)}>
            {ETIQUETAS_TAB[t]}
            {t !== 'todos' && <span className={styles.n}>{activos.filter((d) => d.tipo === t).length}</span>}
          </button>
        ))}
        <input
          type="search" placeholder="Buscar…" value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)} className={styles.buscador}
        />
      </div>

      {filtrados.length === 0 && (
        <Vacio texto={activos.length === 0
          ? 'Todavía no hay recomendaciones asignadas a ningún destinatario.'
          : 'No hay destinatarios activos con ese filtro.'} />
      )}

      <div className={styles.grid}>
        {filtrados.map((d, i) => {
          const avance = Math.round(d.asignaciones.reduce((acc, a) => acc + (Number(a.porcentaje) || 0), 0) / d.asignaciones.length)
          const dominante = estadoDominante(d.asignaciones)
          return (
            <div key={d.id} className={`${styles.tarjeta} entrada`} style={{ '--i': i }}>
              <GaugeDial pct={avance} size={56} />
              <div className={styles.info}>
                <div className={styles.nombreFila}>
                  <span className={styles.nombre}>{d.nombre}</span>
                  <span className={styles.tipoTag}>{TIPOS_DESTINATARIO[d.tipo]}</span>
                </div>
                <div className={styles.metaFila}>
                  {d.municipio && <span className={styles.mun}>{d.municipio}</span>}
                  <span className={styles.nRec}>{d.asignaciones.length} recomendación{d.asignaciones.length > 1 ? 'es' : ''}</span>
                  <EstadoTag estado={dominante} />
                </div>
              </div>
              <EnlaceMagico token={d.token} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
