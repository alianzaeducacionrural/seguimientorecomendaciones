import { useMemo, useState } from 'react'
import { useEntidad } from './hooks/useEntidad'
import { Cargando, AvisoError, Vacio } from '../components/Estado'
import EnlaceMagico from '../components/EnlaceMagico'
import Modal from '../components/Modal'
import { sembrarDestinatarios } from '../utils/api'
import { TIPOS_DESTINATARIO } from '../utils/formato'
import styles from './Destinatarios.module.css'

const TABS = ['todos', 'institucion_educativa', 'universidad', 'entidad']
const ETIQUETAS_TAB = { todos: 'Todos', institucion_educativa: 'Instituciones', universidad: 'Universidades', entidad: 'Entidades' }

export default function Destinatarios() {
  const dest = useEntidad('destinatarios')
  const [tab, setTab] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [sembrando, setSembrando] = useState(false)
  const [modalNuevaEntidad, setModalNuevaEntidad] = useState(false)
  const [nombreEntidad, setNombreEntidad] = useState('')
  const [guardandoEntidad, setGuardandoEntidad] = useState(false)

  const filtrados = useMemo(() => {
    let lista = dest.datos
    if (tab !== 'todos') lista = lista.filter((d) => d.tipo === tab)
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase()
      lista = lista.filter((d) => d.nombre.toLowerCase().includes(q) || (d.municipio || '').toLowerCase().includes(q))
    }
    return [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [dest.datos, tab, busqueda])

  async function ejecutarSiembra() {
    if (!confirm('Esto carga las instituciones y universidades del catálogo compartido como destinatarios (no duplica las que ya existan). ¿Continuar?')) return
    setSembrando(true)
    try {
      await sembrarDestinatarios()
      await dest.recargar()
    } catch (err) {
      alert(err.message)
    } finally {
      setSembrando(false)
    }
  }

  async function crearEntidad(e) {
    e.preventDefault()
    setGuardandoEntidad(true)
    try {
      await dest.crearItem({ tipo: 'entidad', nombre: nombreEntidad, municipio: '', correo: '', activo: true })
      setModalNuevaEntidad(false)
      setNombreEntidad('')
    } catch (err) {
      alert(err.message)
    } finally {
      setGuardandoEntidad(false)
    }
  }

  if (dest.cargando) return <Cargando texto="Cargando destinatarios…" />
  if (dest.error) return <AvisoError mensaje={dest.error} onReintentar={dest.recargar} />

  return (
    <div>
      <div className={styles.head}>
        <div>
          <h1 className={styles.titulo}>Destinatarios</h1>
          <p className={styles.desc}>Instituciones, universidades y entidades, con su enlace personal de seguimiento.</p>
        </div>
        <div className={styles.headAcciones}>
          <button type="button" className={styles.btnGhost} onClick={() => setModalNuevaEntidad(true)}>Nueva entidad</button>
          <button type="button" className={styles.btnPrimary} onClick={ejecutarSiembra} disabled={sembrando}>
            {sembrando ? 'Sembrando…' : 'Sembrar desde catálogo'}
          </button>
        </div>
      </div>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button key={t} type="button" className={tab === t ? styles.activo : ''} onClick={() => setTab(t)}>
            {ETIQUETAS_TAB[t]}
            {t !== 'todos' && <span className={styles.n}>{dest.datos.filter((d) => d.tipo === t).length}</span>}
          </button>
        ))}
        <input
          type="search" placeholder="Buscar…" value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)} className={styles.buscador}
        />
      </div>

      {filtrados.length === 0 && <Vacio texto="No hay destinatarios con ese filtro." />}

      <div className={styles.tabla}>
        {filtrados.map((d) => (
          <div key={d.id} className={styles.fila}>
            <div className={styles.nombreCol}>
              <span className={styles.nombre}>{d.nombre}</span>
              <span className={styles.tipoTag}>{TIPOS_DESTINATARIO[d.tipo]}</span>
              {d.municipio && <span className={styles.mun}>{d.municipio}</span>}
            </div>
            <EnlaceMagico token={d.token} />
          </div>
        ))}
      </div>

      {modalNuevaEntidad && (
        <Modal titulo="Nueva entidad" onCerrar={() => setModalNuevaEntidad(false)}>
          <form className={styles.formEntidad} onSubmit={crearEntidad}>
            <label>
              <span>Nombre de la entidad</span>
              <input type="text" required value={nombreEntidad} onChange={(e) => setNombreEntidad(e.target.value)} placeholder="Ej. Alcaldía de Manizales" />
            </label>
            <button type="submit" className={styles.btnPrimary} disabled={guardandoEntidad}>
              {guardandoEntidad ? 'Guardando…' : 'Crear entidad'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}
