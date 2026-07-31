import { claveEstado } from '../utils/formato'
import styles from './EstadoTag.module.css'

export default function EstadoTag({ estado }) {
  return (
    <span className={`${styles.tag} ${styles[claveEstado(estado)] || ''}`}>
      <span className={styles.dot} aria-hidden="true" />
      {estado}
    </span>
  )
}
