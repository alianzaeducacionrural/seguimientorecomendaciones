import { useEntidad } from './panel/hooks/useEntidad'
import { Cargando, AvisoError } from './components/Estado'
import FormularioRecomendacion from './components/FormularioRecomendacion'
import { asignarDestinatarios } from './utils/api'
import styles from './EmitirRecomendacion.module.css'

export default function EmitirRecomendacion() {
  const dest = useEntidad('destinatarios')
  const rec = useEntidad('recomendaciones')

  async function guardar(form, seleccion) {
    const id = await rec.crearItem(form)
    if (seleccion.length) await asignarDestinatarios(id, seleccion)
  }

  if (dest.cargando || rec.cargando) return <Cargando texto="Cargando…" />
  if (dest.error) return <AvisoError mensaje={dest.error} onReintentar={dest.recargar} />

  return (
    <div className={styles.shell}>
      <div className={styles.mark}>CA</div>
      <h1>Registrar recomendación</h1>
      <p className={styles.desc}>Comité Académico — La Universidad en el Campo.</p>
      <div className={styles.card}>
        <FormularioRecomendacion
          destinatarios={dest.datos}
          onGuardar={guardar}
          textoBoton="Registrar recomendación"
          resetAlGuardar
        />
      </div>
    </div>
  )
}
