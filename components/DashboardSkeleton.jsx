function Block({ className = '' }) {
  return <div className={`bg-stone-200 dark:bg-stone-800 rounded-2xl animate-pulse ${className}`} />
}

export default function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <div className="max-w-2xl mx-auto px-5 py-6">
        <Block className="h-3 w-20 mb-4 rounded-full" />
        <Block className="h-9 w-3/4 mb-5" />
        <Block className="h-12 w-full mb-3 rounded-full" />
        <Block className="h-20 w-full mb-3" />
        <Block className="h-36 w-full mb-3 rounded-3xl" />
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Block className="h-24" />
          <Block className="h-24" />
        </div>
        <Block className="h-32 w-full mb-3" />
        <Block className="h-40 w-full" />
      </div>
    </div>
  )
}
