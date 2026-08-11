import React, { useMemo } from 'react'

export default function QRCode({ data = '', size = 140 }) {
  const gridCount = 21
  const matrix = useMemo(() => {
    let hash = 0
    for (let i = 0; i < data.length; i++) hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0
    const seed = Math.abs(hash)
    const rand = (s) => { let x = Math.sin(s) * 10000; return x - Math.floor(x) }
    const mat = Array.from({ length: gridCount }, () => new Array(gridCount).fill(false))
    const drawFinder = (r, c) => {
      for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
        const outer = i === 0 || i === 6 || j === 0 || j === 6
        const inner = i >= 2 && i <= 4 && j >= 2 && j <= 4
        if (r + i < gridCount && c + j < gridCount) mat[r + i][c + j] = outer || inner
      }
    }
    drawFinder(0, 0); drawFinder(0, gridCount - 7); drawFinder(gridCount - 7, 0)
    let k = 0
    for (let r = 0; r < gridCount; r++) for (let c = 0; c < gridCount; c++) {
      const inTL = r <= 6 && c <= 6, inTR = r <= 6 && c >= gridCount - 7, inBL = r >= gridCount - 7 && c <= 6
      if (!inTL && !inTR && !inBL) mat[r][c] = rand(seed + k++) > 0.45
    }
    return mat
  }, [data])

  const cellSize = size / gridCount
  return (
    <div style={{ width: size, height: size, background: '#fff', borderRadius: 10, padding: 8, border: '2px solid #e5e7eb', display: 'inline-block' }}>
      <svg width={size - 16} height={size - 16} viewBox={`0 0 ${gridCount} ${gridCount}`}>
        {matrix.map((row, r) => row.map((cell, c) => cell ? (
          <rect key={`${r}-${c}`} x={c} y={r} width={0.95} height={0.95} fill="#111" />
        ) : null))}
      </svg>
    </div>
  )
}
