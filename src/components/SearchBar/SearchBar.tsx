import { useState, type FormEvent } from 'react'
import styles from './SearchBar.module.scss'

const SEARCH_URL = 'https://www.google.com/search?q='

function SearchBar() {
  const [query, setQuery] = useState('')

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    window.location.href = SEARCH_URL + encodeURIComponent(q)
  }

  return (
    <form className={styles.searchBar} onSubmit={handleSubmit} role="search">
      <input
        className={styles.input}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索…"
        aria-label="搜索"
        autoFocus
      />
    </form>
  )
}

export default SearchBar
