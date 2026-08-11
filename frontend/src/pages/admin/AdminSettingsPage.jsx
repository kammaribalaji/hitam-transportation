import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useForm } from "react-hook-form"
import toast from "react-hot-toast"
import { settingsService } from "../../api/services.js"
import PageHeader from "../../components/common/PageHeader.jsx"
import { Save, Settings, Building, Bell } from "lucide-react"

const DEFAULT = {
  collegeName: "HITAM College of Engineering",
  transportIncharge: "Transport Office",
  email: "transport@hitam.edu.in",
  phone: "+91 40 1234 5678",
  address: "HITAM Campus, Hyderabad, Telangana 500085",
  dateFormat: "DD/MM/YYYY",
  currency: "INR",
}

export default function AdminSettingsPage() {
  const { register, handleSubmit, reset } = useForm({ defaultValues: DEFAULT })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    settingsService.get().then(r => { if (r.data) reset({ ...DEFAULT, ...r.data }) }).catch(() => {})
  }, [reset])

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await settingsService.update(data)
      toast.success("Settings saved successfully")
    } catch { toast.error("Failed to save") }
    finally { setLoading(false) }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 max-w-3xl">
      <PageHeader title="Settings" subtitle="Configure system preferences and college information" />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Building size={18} className="text-[#40A047]" />
            <h2 className="text-sm font-bold text-gray-900">College Information</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name: "collegeName", label: "College Name" },
              { name: "transportIncharge", label: "Transport In-charge" },
              { name: "email", label: "Email Address", type: "email" },
              { name: "phone", label: "Phone Number" },
              { name: "address", label: "Campus Address" },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">{f.label}</label>
                <input {...register(f.name)} type={f.type || "text"}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047]" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Settings size={18} className="text-[#40A047]" />
            <h2 className="text-sm font-bold text-gray-900">System Preferences</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[{ name: "dateFormat", label: "Date Format" }, { name: "currency", label: "Currency" }].map(f => (
              <div key={f.name}>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">{f.label}</label>
                <input {...register(f.name)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047]" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Bell size={18} className="text-[#40A047]" />
            <h2 className="text-sm font-bold text-gray-900">Notification Preferences</h2>
          </div>
          <div className="space-y-3">
            {["Email alerts for new bookings", "SMS on trip start/end", "Daily attendance report", "Weekly revenue summary"].map(item => (
              <label key={item} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#40A047] rounded" />
                <span className="text-sm text-gray-700">{item}</span>
              </label>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-3.5 bg-[#40A047] text-white font-bold rounded-xl hover:bg-[#2d7a33] transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-60 shadow-lg shadow-green-600/15">
          <Save size={16} />
          {loading ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </motion.div>
  )
}
