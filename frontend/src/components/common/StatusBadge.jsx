import React from 'react'
import { getStatusColor } from '../../utils/helpers.js'

export default function StatusBadge({ status, label }) {
  const displayLabel = label || status?.replace(/_/g, ' ')
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(status)}`}>
      {displayLabel}
    </span>
  )
}
