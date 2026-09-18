import { useEffect, useMemo, useState } from 'react'
import { CreateFlagModal } from './components/CreateFlagModal'
import { Icon } from './components/Icon'
import { Toggle } from './components/Toggle'
import { flagService } from './services/flagService'
import type { FeatureFlag, NewFeatureFlag } from './types'
import { formatUpdatedAt, formatUpdatedTime } from './utils'
import './styles.css'

type Filter = 'all' | 'enabled' | 'disabled'

function App() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    flagService.list().then(setFlags).catch((error) => setLoadError(error instanceof Error ? error.message : 'We could not load your flags. Refresh to try again.')).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3500)
    return () => window.clearTimeout(timer)
  }, [toast])

  const filteredFlags = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return flags.filter((flag) => {
      const matchesQuery = !normalized || [flag.name, flag.key, flag.description].some((value) => value.toLowerCase().includes(normalized))
      const matchesFilter = filter === 'all' || (filter === 'enabled' ? flag.enabled : !flag.enabled)
      return matchesQuery && matchesFilter
    })
  }, [flags, query, filter])

  const enabledCount = flags.filter((flag) => flag.enabled).length
  const toggle = async (flag: FeatureFlag) => {
    try {
      const updated = await flagService.setEnabled(flag.id, !flag.enabled)
      setFlags((current) => current.map((item) => item.id === updated.id ? updated : item))
      setToast(`${updated.name} is now ${updated.enabled ? 'enabled' : 'disabled'}.`)
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Could not update this flag.')
    }
  }

  const create = async (input: NewFeatureFlag) => {
    const created = await flagService.create(input)
    setFlags((current) => [created, ...current])
    setShowCreate(false)
    setToast(`${created.name} was created.`)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Icon name="sparkle" size={19} /></div><span>flagship<span className="brand-dot">.</span></span></div>
        <div className="workspace-label">Workspace</div>
        <button className="workspace-switcher" type="button"><span className="workspace-avatar">A</span><span className="workspace-name">Acme Inc.</span><Icon name="chevron" size={15} /></button>
        <nav className="side-nav" aria-label="Main navigation">
          <a className="nav-item active" href="#flags"><Icon name="flag" /> <span>Feature flags</span><span className="nav-count">{flags.length}</span></a>
          <a className="nav-item" href="#settings"><Icon name="sliders" /> <span>Settings</span></a>
        </nav>
        <div className="sidebar-bottom"><div className="help-card"><span className="help-icon"><Icon name="info" size={16} /></span><div><strong>Need a hand?</strong><p>Read the flagging guide</p></div><span className="help-arrow">↗</span></div><div className="user-row"><div className="user-avatar">OR</div><div className="user-copy"><strong>Olivia Rhye</strong><span>Admin</span></div><button className="more-button" type="button" aria-label="Open account menu">•••</button></div></div>
      </aside>

      <main className="main-content" id="flags">
        <header className="topbar"><div className="breadcrumb"><span>Workspace</span><span>/</span><strong>Feature flags</strong></div><div className="topbar-actions"><span className="environment"><span className="environment-dot" />Production <Icon name="chevron" size={14} /></span><button className="avatar-small" type="button" aria-label="Open profile">OR</button></div></header>
        <div className="content-inner">
          <section className="page-heading"><div><p className="eyebrow eyebrow-purple"><Icon name="sparkle" size={13} /> AI platform</p><h1>Feature flags</h1><p className="page-description">Control how AI capabilities roll out across your products.</p></div><button className="button button-primary" type="button" onClick={() => setShowCreate(true)}><Icon name="plus" size={17} /> Create flag</button></section>

          <section className="stats-grid" aria-label="Flag overview">
            <div className="stat-card"><div className="stat-label">Total flags <span className="stat-icon"><Icon name="flag" size={15} /></span></div><div className="stat-value">{flags.length}</div><div className="stat-note">Across this workspace</div></div>
            <div className="stat-card"><div className="stat-label">Enabled <span className="stat-icon green"><Icon name="check" size={15} /></span></div><div className="stat-value">{enabledCount}</div><div className="stat-note"><span className="up-arrow">↑</span> {flags.length ? Math.round(enabledCount / flags.length * 100) : 0}% of all flags</div></div>
            <div className="stat-card"><div className="stat-label">Experiments <span className="stat-icon purple"><Icon name="sparkle" size={15} /></span></div><div className="stat-value">{flags.filter((flag) => flag.type === 'experiment').length}</div><div className="stat-note">Safe to test and iterate</div></div>
          </section>

          <section className="flags-section" aria-labelledby="all-flags-heading">
            <div className="section-heading"><div><h2 id="all-flags-heading">All flags</h2><p>Manage feature availability in your workspace.</p></div><button className="button button-secondary" type="button" onClick={() => setToast('All changes are saved automatically.')}> <Icon name="sliders" size={16} /> Manage view</button></div>
            <div className="toolbar"><div className="search-box"><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search flags" aria-label="Search flags" /></div><div className="filter-tabs" role="group" aria-label="Filter flags">{(['all', 'enabled', 'disabled'] as Filter[]).map((item) => <button key={item} className={filter === item ? 'filter-active' : ''} type="button" onClick={() => setFilter(item)}>{item[0].toUpperCase() + item.slice(1)}{item === 'all' && <span>{flags.length}</span>}</button>)}</div></div>
            {loadError ? <div className="empty-state"><Icon name="alert" /><h3>Something went wrong</h3><p>{loadError}</p></div> : loading ? <div className="empty-state"><div className="spinner" /><p>Loading flags…</p></div> : filteredFlags.length === 0 ? <div className="empty-state"><div className="empty-icon"><Icon name="search" /></div><h3>No flags found</h3><p>Try a different search or create a new flag.</p></div> : <div className="table-wrap"><table><thead><tr><th scope="col">Flag</th><th scope="col">Type</th><th scope="col">Last updated</th><th scope="col" className="status-heading">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{filteredFlags.map((flag) => <tr key={flag.id}><td><div className="flag-title"><span className={`flag-status-dot ${flag.enabled ? 'on' : ''}`} /><div><strong>{flag.name}</strong><span className="flag-key">{flag.key}</span><span className="flag-description">{flag.description}</span></div></div></td><td><span className={`type-pill ${flag.type}`}>{flag.type === 'release' ? 'Release' : 'Experiment'}</span></td><td><span className="updated-date">{formatUpdatedAt(flag.updatedAt)}</span><span className="updated-by">by {flag.updatedBy} · {formatUpdatedTime(flag.updatedAt)}</span></td><td className="status-cell"><span className={`status-pill ${flag.enabled ? 'enabled' : 'disabled'}`}><span />{flag.enabled ? 'Enabled' : 'Disabled'}</span></td><td className="toggle-cell"><Toggle checked={flag.enabled} label={`${flag.enabled ? 'Disable' : 'Enable'} ${flag.name}`} onChange={() => toggle(flag)} /></td></tr>)}</tbody></table></div>}
          </section>
          <footer className="page-footer"><span><span className="footer-dot" />Changes are saved automatically</span><span>v1.0.0 · API-backed workspace</span></footer>
        </div>
      </main>
      {showCreate && <CreateFlagModal flags={flags} onClose={() => setShowCreate(false)} onCreate={create} />}
      <div className={`toast ${toast ? 'toast-visible' : ''}`} role="status" aria-live="polite">{toast}</div>
    </div>
  )
}

export default App
