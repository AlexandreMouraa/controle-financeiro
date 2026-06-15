function Block({ h, w = '100%', r = 14, mb = 0 }) {
  return (
    <div
      className="animate-fade-in-up"
      style={{
        height: h, width: w, borderRadius: r, marginBottom: mb,
        background: 'var(--line-soft)', opacity: 0.7,
      }}
    />
  )
}

export default function DashboardSkeleton() {
  return (
    <div className="app">
      {/* sidebar */}
      <aside className="sidebar">
        <div className="sb-brand"><span className="mark">F</span><span className="nm">FinTrack</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          {Array.from({ length: 7 }).map((_, i) => <Block key={i} h={36} r={10} />)}
        </div>
      </aside>

      {/* main */}
      <div className="main">
        <header className="topbar">
          <Block h={36} w={36} r={9} />
          <div style={{ marginLeft: 4 }}><Block h={22} w={160} r={6} mb={6} /><Block h={12} w={120} r={6} /></div>
        </header>
        <main className="content">
          <div className="page">
            <div className="kpi-grid">
              {Array.from({ length: 4 }).map((_, i) => <Block key={i} h={108} r={15} />)}
            </div>
            <Block h={264} r={16} />
            <div className="grid-2">
              <Block h={240} r={16} />
              <Block h={240} r={16} />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
