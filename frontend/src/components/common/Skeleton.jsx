import React from 'react'

export function Skeleton({ className = '', width, height, rounded = 'rounded-xl' }) {
  const style = {}
  if (width) style.width = width
  if (height) style.height = height

  return (
    <div
      style={style}
      className={`bg-gray-200/80 animate-pulse ${rounded} ${className}`}
    />
  )
}

export function CardSkeleton({ count = 3 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="w-16 h-5 rounded-full" />
          </div>
          <Skeleton className="w-3/4 h-5" />
          <Skeleton className="w-1/2 h-3" />
          <div className="pt-2 flex gap-2">
            <Skeleton className="w-full h-9 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-4 space-y-3">
      <div className="flex gap-4 pb-2 border-b border-gray-100">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-2 border-b border-gray-50 last:border-0 items-center">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export default Skeleton
