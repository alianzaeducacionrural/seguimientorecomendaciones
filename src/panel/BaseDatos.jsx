import { useMemo, useState } from 'react'
import { useEntidad } from './hooks/useEntidad'
import { Cargando, AvisoError, Vacio } from '../components/Estado'
import Modal from '../components/Modal'
import { sembrarDestinatarios } from '../utils/api'
import { TIPOS_DESTINATARIO } from '../utils/formato'
import styles from './BaseDatos.module.css'

const TABS = ['todos', 'institucion_educativa', 'universidad', 'entidad']
const ETIQUETAS_TAB = { todos: 'Todos', institucion_educativa: 'Instituciones', universidad: 'Universidades', entidad: 'Entidades' }
const VACIO_FORM = { tipo: 'entidad', nombre: '', municipio: '', correo: '', activo: true }

function Chevron({ abierto }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={abierto ? styles.chevronAbierto : styles.chevron}>
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FilaDestinatario({ d, n, mostrarTipo, onEditar, onEliminar }) {
  return (
    <div className={styles.fila}>
      <div className={styles.nombreCol}>
        <span className={styles.nombre}>{d.nombre}</span>
        {mostrarTipo && <span className={styles.tipoTag}>{TIPOS_DESTINATARIO[d.tipo]}</span>}
        {mostrarTipo && d.municipio && <span className={styles.mun}>{d.municipio}</span>}
        {d.activo === false && <span className={styles.inactivo}>Inactivo</span>}
      </div>
      <div className={styles.filaMeta}>
        <span className={styles.nAsig}>{n} asignación{n === 1 ? '' : 'es'}</span>
        <button type="button" onClick={() => onEditar(d)}>Editar</button>
        <button type="button" className={styles.btnDanger} onClick={() => onEliminar(d)}>Eliminar</button>
      </div>
    </div>
  )
}

export default function BaseDatos() {
  const dest = useEntidad('destinatarios')
  const asig = useEntidad('asignaciones')
  const [tab, setTab] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [muniAbiertos, setMuniAbiertos] = useState(() => new Set())
  const [sembrando, setSembrando] = useState(false)
  const [modalForm, setModalForm] = useState(null) // { nuevo: true } | destinatario | null
  const [form, setForm] = useState(VACIO_FORM)
  const [guardando, setGuardando] = useState(false)

  const conteoAsignaciones = useMemo(() => {
    const mapa = new Map()
    for (const a of asig.datos) {
      mapa.set(String(a.destinatario_id), (mapa.get(String(a.destinatario_id)) || 0) + 1)
    }
    return mapa
  }, [asig.datos])

  const filtrados = useMemo(() => {
    let lista = dest.datos
    if (tab !== 'todos') lista = lista.filter((d) => d.tipo === tab)
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase()
      lista = lista.filter((d) => d.nombre.toLowerCase().includes(q) || (d.municipio || '').toLowerCase().includes(q))
    }
    return [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [dest.datos, tab, busqueda])

  const buscando = busqueda.trim().length > 0

  // instituciones educativas: agrupadas por municipio, se despliegan al hacer clic
  const municipios = useMemo(() => {
    if (tab !== 'institucion_educativa') return null
    const mapa = new Map()
    for (const d of filtrados) {
      const m = d.municipio || 'Sin municipio'
      const lista = mapa.get(m) || []
      lista.push(d)
      mapa.set(m, lista)
    }
    return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtrados, tab])

  function alternarMuni(municipio) {
    setMuniAbiertos((prev) => {
      const next = new Set(prev)
      if (next.has(municipio)) next.delete(municipio)
      else next.add(municipio)
      return next
    })
  }

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

  function abrirCrear() {
    setForm(VACIO_FORM)
    setModalForm({ nuevo: true })
  }

  function abrirEditar(d) {
    setForm({ tipo: d.tipo, nombre: d.nombre, municipio: d.municipio || '', correo: d.correo || '', activo: d.activo !== false })
    setModalForm(d)
  }

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    try {
      if (modalForm.nuevo) await dest.crearItem(form)
      else await dest.editarItem(modalForm.id, form)
      setModalForm(null)
    } catch (err) {
      alert(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(d) {
    const n = conteoAsignaciones.get(String(d.id)) || 0
    const aviso = n > 0
      ? `"${d.nombre}" tiene ${n} recomendación${n > 1 ? 'es' : ''} asignada${n > 1 ? 's' : ''}. Eliminarlo también elimina esas asignaciones y sus evidencias. ¿Continuar?`
      : `¿Eliminar "${d.nombre}"?`
    if (!confirm(aviso)) return
    await dest.eliminarItem(d.id)
    await asig.recargar()
  }

  if (dest.cargando) return <Cargando texto="Cargando base de datos…" />
  if (dest.error) return <AvisoError mensaje={dest.error} onReintentar={dest.recargar} />

  return (
    <div>
      <div className={styles.head}>
        <div>
          <span className="eyebrow">Administración de catálogo</span>
          <h1 className={styles.titulo}>Base de datos de destinatarios</h1>
          <p className={styles.desc}>
            Instituciones, universidades y entidades — catálogo completo, tengan o no recomendaciones
            asignadas. Para ver solo los que están en seguimiento activo, ve a Destinatarios.
          </p>
        </div>
        <div className={styles.headAcciones}>
          <button type="button" className={styles.btnGhost} onClick={ejecutarSiembra} disabled={sembrando}>
            {sembrando ? 'Sembrando…' : 'Sembrar desde catálogo'}
          </button>
          <button type="button" className={styles.btnPrimary} onClick={abrirCrear}>Nuevo destinatario</button>
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

      {tab === 'institucion_educativa' ? (
        <div className={styles.tabla}>
          {municipios.map(([municipio, lista]) => {
            const abierto = buscando || muniAbiertos.has(municipio)
            return (
              <div key={municipio} className={styles.grupoMuni}>
                <button type="button" className={styles.muniHead} onClick={() => alternarMuni(municipio)} aria-expanded={abierto}>
                  <span className={styles.muniNombre}>{municipio}</span>
                  <span className={styles.muniMeta}>
                    <span className={styles.n}>{lista.length}</span>
                    <Chevron abierto={abierto} />
                  </span>
                </button>
                {abierto && (
                  <div className={styles.muniBody}>
                    {lista.map((d) => (
                      <FilaDestinatario
                        key={d.id} d={d} mostrarTipo={false}
                        n={conteoAsignaciones.get(String(d.id)) || 0}
                        onEditar={abrirEditar} onEliminar={eliminar}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className={styles.tabla}>
          {filtrados.map((d) => (
            <FilaDestinatario
              key={d.id} d={d} mostrarTipo
              n={conteoAsignaciones.get(String(d.id)) || 0}
              onEditar={abrirEditar} onEliminar={eliminar}
            />
          ))}
        </div>
      )}

      {modalForm && (
        <Modal titulo={modalForm.nuevo ? 'Nuevo destinatario' : `Editar — ${modalForm.nombre}`} onCerrar={() => setModalForm(null)}>
          <form className={styles.form} onSubmit={guardar}>
            <label className={styles.campo}>
              <span>Tipo</span>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                <option value="institucion_educativa">Institución educativa</option>
                <option value="universidad">Universidad</option>
                <option value="entidad">Entidad</option>
              </select>
            </label>
            <label className={styles.campo}>
              <span>Nombre</span>
              <input type="text" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </label>
            {form.tipo === 'institucion_educativa' && (
              <label className={styles.campo}>
                <span>Municipio</span>
                <input type="text" value={form.municipio} onChange={(e) => setForm({ ...form, municipio: e.target.value })} />
              </label>
            )}
            <label className={styles.campo}>
              <span>Correo (opcional)</span>
              <input type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} />
            </label>
            <label className={styles.campoInline}>
              <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
              <span>Activo</span>
            </label>
            <button type="submit" className={styles.btnPrimary} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}
