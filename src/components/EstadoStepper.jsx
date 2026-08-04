import styles from './EstadoStepper.module.css'

const PASOS = ['No iniciada', 'En proceso', 'Implementada']

/** Indicador de 3 tramos — siempre acompaña a un EstadoTag con texto, nunca solo. */
export default function EstadoStepper({ estado }) {
  const cancelada = estado === 'Cancelada'
  const indice = PASOS.indexOf(estado)
  const clave = estado === 'Implementada' ? 'implementada' : estado === 'En proceso' ? 'en-proceso' : 'no-iniciada'

  return (
    <span className={`${styles.stepper} ${cancelada ? styles.cancelada : ''}`} aria-hidden="true">
      {PASOS.map((paso, i) => (
        <span key={paso} className={`${styles.tick} ${!cancelada && i <= indice ? styles[clave] : ''}`} />
      ))}
    </span>
  )
}
