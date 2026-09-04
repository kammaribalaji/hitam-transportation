import React from 'react'
import { motion } from 'framer-motion'

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg = 'bg-green-100',
  iconColor = 'text-[#40A047]',
  trend,
  trendUp = true,
  onClick,
}) {
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 8px 32px 0 rgba(64,160,71,0.13)' }}
      className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-sm border border-gray-100 cursor-default select-none w-full min-w-0 overflow-hidden"
      onClick={onClick}
      style={{ boxShadow: '0 2px 16px 0 rgba(64,160,71,0.07)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 truncate">
            {title}
          </p>
          <p className="text-base sm:text-xl lg:text-2xl font-black text-gray-900 leading-tight truncate">
            {value}
          </p>
          {subtitle && (
            <p className="text-[11px] sm:text-xs text-gray-500 mt-1 truncate">
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
            <Icon size={18} className={`sm:w-[22px] sm:h-[22px] ${iconColor}`} />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-2 sm:mt-3 flex items-center gap-1">
          <span className={`text-[11px] sm:text-xs font-bold ${trendUp ? 'text-green-600' : 'text-red-500'}`}>
            {trend}
          </span>
          <span className="text-[10px] sm:text-xs text-gray-400">vs last month</span>
        </div>
      )}
    </motion.div>
  )
}
