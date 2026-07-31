import { useEffect } from 'react'
import styles from './Modal.module.css'

export default function Modal({ titulo, onCerrar, children, ancho }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCerrar])

  return (
    <div className={styles.overlay} onClick={onCerrar}>
      <div
        className={styles.modal}
        style={ancho ? { maxWidth: ancho } : undefined}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.head}>
          <h3>{titulo}</h3>
          <button type="button" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  )
}
