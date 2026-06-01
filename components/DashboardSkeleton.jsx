function Block({ h, w = '100%', r = 16, mb = 0 }) {
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
    <div className="wrap">
      <div style={{ padding: '26px 0 18px' }}><Block h={20} w={120} r={100} /></div>
      <Block h={56} w="60%" mb={24} />
      <div className="grid" style={{ marginTop: 8 }}>
        <div className="col">
          <Block h={170} />
          <Block h={90} />
          <Block h={210} />
        </div>
        <div className="col">
          <Block h={260} />
          <Block h={180} />
        </div>
      </div>
    </div>
  )
}
