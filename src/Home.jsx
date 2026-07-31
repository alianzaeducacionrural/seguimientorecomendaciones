import { Link } from 'react-router-dom'
import styles from './Home.module.css'

export default function Home() {
  return (
    <div className={styles.shell}>
      <div className={styles.mark}>CA</div>
      <h1>Seguimiento a Recomendaciones del Comité Académico</h1>
      <p>
        La Universidad en el Campo — registro y seguimiento a la implementación de las
        recomendaciones emitidas a instituciones educativas, universidades y entidades aliadas.
      </p>
      <div className={styles.acciones}>
        <Link to="/panel" className={styles.btnPrimary}>Entrar al panel de control</Link>
      </div>
      <p className={styles.nota}>
        ¿Recibiste un enlace personal de tu institución? Ábrelo directamente desde el correo o
        mensaje del Comité — no necesitas iniciar sesión aquí.
      </p>
    </div>
  )
}
