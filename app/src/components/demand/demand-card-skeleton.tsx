export function DemandCardSkeleton() {
  return (
    <div className="rounded-2xl p-5"
         style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8', borderLeft: '3px solid #EAE3D6' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 w-20 rounded-full skeleton" />
        <div className="h-3.5 w-10 rounded skeleton" />
      </div>
      <div className="h-4 w-full rounded mb-1.5 skeleton" />
      <div className="h-4 w-4/5 rounded mb-4 skeleton" />
      <div className="h-3 w-full rounded mb-1.5 skeleton" />
      <div className="h-3 w-2/3 rounded mb-4 skeleton" />
      <div className="flex items-center justify-between pt-3.5" style={{ borderTop: '1px solid #EAE3D6' }}>
        <div className="h-3 w-16 rounded skeleton" />
        <div className="h-5 w-14 rounded-full skeleton" />
      </div>
    </div>
  )
}

export function FeedSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => <DemandCardSkeleton key={i} />)}
    </div>
  )
}
