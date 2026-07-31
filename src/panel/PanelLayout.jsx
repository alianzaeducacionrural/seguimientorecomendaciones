import { NavLink, Outlet } from 'react-router-dom'
import styles from './PanelLayout.module.css'

export default function PanelLayout() {
  return (
    <div className={styles.shell}>
      <header className={styles.top}>
        <div className={styles.inner}>
          <div className={styles.brand}>
            <div className={styles.mark}>CA</div>
            <div>
              <div className={styles.name}>Consola de Recomendaciones</div>
              <div className={`${styles.sub} font-mono`}>comite-academico // seguimiento.rural</div>
            </div>
          </div>
          <nav className={styles.rail}>
            <NavLink to="/panel" end className={({ isActive }) => (isActive ? styles.activo : '')}>
              Resumen
            </NavLink>
            <NavLink to="/panel/recomendaciones" className={({ isActive }) => (isActive ? styles.activo : '')}>
              Recomendaciones
            </NavLink>
            <NavLink to="/panel/destinatarios" className={({ isActive }) => (isActive ? styles.activo : '')}>
              Destinatarios
            </NavLink>
          </nav>
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
