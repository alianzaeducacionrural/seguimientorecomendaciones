import styles from './Estado.module.css'

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className={styles.estado} role="status">
      <span className={styles.spinner} aria-hidden="true" />
      {texto}
    </div>
  )
}

export function AvisoError({ mensaje, onReintentar }) {
  return (
    <div className={`${styles.estado} ${styles.error}`} role="alert">
      <p>{mensaje || 'Ocurrió un error al cargar la información.'}</p>
      {onReintentar && (
        <button type="button" className={styles.reintentar} onClick={onReintentar}>
          Reintentar
        </button>
      )}
    </div>
  )
}

export function Vacio({ texto = 'No hay elementos para mostrar.' }) {
  return <div className={styles.estado}>{texto}</div>
}
