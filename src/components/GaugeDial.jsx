import styles from './GaugeDial.module.css'

/** Dial circular para KPIs y avance — firma visual del panel. */
export default function GaugeDial({ pct = 0, label, value, size = 84, color }) {
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div className={styles.wrap}>
      <div
        className={styles.gauge}
        style={{ '--pct': clamped, '--size': `${size}px`, ...(color ? { '--gc': color } : {}) }}
      >
        <span className={`${styles.val} font-mono`}>{value ?? `${clamped}%`}</span>
      </div>
      {label && <div className={styles.label}>{label}</div>}
    </div>
  )
}
