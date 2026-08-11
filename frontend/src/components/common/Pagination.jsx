import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, pages, total, onPage }) {
  if (pages <= 1) return null
  const nums = Array.from({ length: pages }, (_, i) => i + 1)
  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <p className="text-xs text-gray-500">Showing page {page} of {pages} ({total} records)</p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft size={15} />
        </button>
        {nums.map((n) => (
          <button key={n} onClick={() => onPage(n)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${n === page ? 'bg-[#40A047] text-white' : 'border border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
            {n}
          </button>
        ))}
        <button onClick={() => onPage(page + 1)} disabled={page === pages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}
