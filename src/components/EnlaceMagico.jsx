import { useState } from 'react'
import styles from './EnlaceMagico.module.css'

export default function EnlaceMagico({ token }) {
  const [copiado, setCopiado] = useState(false)
  if (!token) return <span className={styles.sinToken}>sin token</span>

  const url = `${window.location.origin}${import.meta.env.BASE_URL}portal?token=${token}`

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt('Copia el enlace:', url)
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1600)
  }

  return (
    <button type="button" className={styles.btn} onClick={copiar} title={url}>
      {copiado ? 'Copiado' : 'Copiar enlace'}
    </button>
  )
}
