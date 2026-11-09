import Clock from '@/components/Clock/Clock'
import SearchBar from '@/components/SearchBar/SearchBar'
import styles from './App.module.scss'

function App() {
  return (
    <main className={styles.app}>
      <Clock />
      <SearchBar />
    </main>
  )
}

export default App
