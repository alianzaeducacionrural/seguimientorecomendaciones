import { NavLink, Outlet } from 'react-router-dom'
import styles from './PanelLayout.module.css'

export default function PanelLayout() {
  return (
    <div className={styles.shell}>
      <header className={styles.top}>
        <div className={styles.inner}>
          <div className={styles.brand}>
            <div className={styles.mark}>CA</div>
            <div className={styles.name}>Sistema de seguimiento a recomendaciones</div>
          </div>
          <nav className={styles.rail}>
            <div className={styles.grupo}>
              <span className={styles.grupoLabel}>Seguimiento</span>
              <div className={styles.grupoLinks}>
                <NavLink to="/panel" end className={({ isActive }) => (isActive ? styles.activo : '')}>
                  Resumen
                </NavLink>
                <NavLink to="/panel/recomendaciones" className={({ isActive }) => (isActive ? styles.activo : '')}>
                  Recomendaciones
                </NavLink>
                <NavLink to="/panel/destinatarios" className={({ isActive }) => (isActive ? styles.activo : '')}>
                  Destinatarios
                </NavLink>
              </div>
            </div>
            <div className={styles.divisor} aria-hidden="true" />
            <div className={styles.grupo}>
              <span className={styles.grupoLabel}>Administración</span>
              <div className={styles.grupoLinks}>
                <NavLink to="/panel/base-datos" className={({ isActive }) => (isActive ? styles.activo : '')}>
                  Base de datos
                </NavLink>
              </div>
            </div>
            <div className={styles.divisor} aria-hidden="true" />
            <div className={styles.grupo}>
              <span className={styles.grupoLabel}>Externo</span>
              <div className={styles.grupoLinks}>
                <a href={`${import.meta.env.BASE_URL}consulta-manizales`} target="_blank" rel="noreferrer">
                  Consulta ↗
                </a>
              </div>
            </div>
          </nav>
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
