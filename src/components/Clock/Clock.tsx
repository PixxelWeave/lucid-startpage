import { useEffect, useState } from 'react'
import styles from './Clock.module.scss'

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
})

const dateFormat = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  day: 'numeric',
  weekday: 'long',
})

function Clock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className={styles.clock}>
      <time className={styles.time} dateTime={now.toISOString()}>
        {timeFormat.format(now)}
      </time>
      <div className={styles.date}>{dateFormat.format(now)}</div>
    </div>
  )
}

export default Clock
