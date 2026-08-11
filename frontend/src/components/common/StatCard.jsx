import React from 'react'
import { motion } from 'framer-motion'

export default function StatCard({ title, value, subtitle, icon: Icon, iconBg = 'bg-green-100', iconColor = 'text-[#40A047]', trend, trendUp = true, onClick }) {
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 8px 32px 0 rgba(64,160,71,0.13)' }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 cursor-default select-none"
      onClick={onClick}
      style={{ boxShadow: '0 2px 16px 0 rgba(64,160,71,0.07)' }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
            <Icon size={22} className={iconColor} />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1">
          <span className={`text-xs font-bold ${trendUp ? 'text-green-600' : 'text-red-500'}`}>{trend}</span>
          <span className="text-xs text-gray-400">vs last month</span>
        </div>
      )}
    </motion.div>
  )
}
