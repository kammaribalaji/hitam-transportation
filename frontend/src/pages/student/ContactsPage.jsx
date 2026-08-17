import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { contactService } from '../../api/services.js'
import { Phone, User, Info } from 'lucide-react'

const ROLE_COLORS = {
  'Bus Driver': 'bg-green-100 text-green-700',
  'Bus In-charge': 'bg-blue-100 text-blue-700',
  'Transport Office': 'bg-purple-100 text-purple-700',
  'HITAM Security': 'bg-red-100 text-red-700',
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState([])

  useEffect(() => {
    contactService.getAll().then(r => setContacts(r.data || [])).catch(() => {})
  }, [])

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Contacts & Helpline</h1>

      <div className="space-y-3">
        {contacts.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <Phone size={36} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">No contacts available</p>
          </div>
        )}
        {contacts.map((c, i) => (
          <motion.div key={c._id || i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User size={22} className="text-[#40A047]" />
              </div>
              <div>
                <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded-full mb-1 ${ROLE_COLORS[c.role] || 'bg-gray-100 text-gray-600'}`}>
                  {c.role}
                </span>
                <p className="text-base font-bold text-gray-900">{c.name}</p>
                <p className="text-sm text-[#40A047] font-semibold">{c.phone}</p>
                {c.subtitle && <p className="text-xs text-gray-500 mt-0.5">{c.subtitle}</p>}
              </div>
            </div>
            <a href={`tel:${c.phone}`}
              className="w-11 h-11 bg-[#40A047] hover:bg-[#2d7a33] rounded-full flex items-center justify-center flex-shrink-0 transition-colors shadow-lg shadow-green-600/20">
              <Phone size={18} className="text-white" />
            </a>
          </motion.div>
        ))}
      </div>

      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 flex items-start gap-3">
        <Info size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-500">
          Transport Helpline is active from <strong>6:00 AM to 10:00 PM</strong> on all working college days.
          For emergencies outside these hours, contact HITAM Security.
        </p>
      </div>
    </motion.div>
  )
}
