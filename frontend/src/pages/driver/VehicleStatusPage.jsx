import React, { useState } from "react"
import { motion } from "framer-motion"
import PageHeader from "../../components/common/PageHeader.jsx"
import { Fuel, Zap, Wind, Settings, Bus, AlertTriangle, CheckCircle, Gauge } from "lucide-react"
import toast from "react-hot-toast"

const VEHICLE = {
  busNumber: "TS 09 AB 1234", model: "TATA Starbus", fuelLevel: 75,
  engineStatus: "Good", batteryHealth: "Good", tirePressure: "Good",
  odometer: "45,230 km", lastService: "15 Jan 2026", nextService: "15 Aug 2026",
}

function CircleGauge({ label, value, max, color, unit }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="text-center">
      <div className="relative w-24 h-24 mx-auto mb-2">
        <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="10" />
          <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={pct * 2.51 + " 251"} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-gray-900">{value}</span>
          <span className="text-xs text-gray-500">{unit}</span>
        </div>
      </div>
      <p className="text-xs font-semibold text-gray-600">{label}</p>
    </div>
  )
}

function StatusRow({ icon: Icon, label, value, status }) {
  const color = status === "Good" ? "text-green-600 bg-green-100" : status === "Warning" ? "text-yellow-600 bg-yellow-100" : "text-red-600 bg-red-100"
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
          <Icon size={16} className="text-[#40A047]" />
        </div>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-800">{value}</span>
        <span className={"px-2 py-0.5 rounded-full text-xs font-bold " + color}>{status}</span>
      </div>
    </div>
  )
}

export default function VehicleStatusPage() {
  const [v] = useState(VEHICLE)
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <PageHeader title="Vehicle Status" subtitle={v.busNumber + " - " + v.model}
        actions={
          <span className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 text-sm font-bold rounded-xl border border-green-200">
            <CheckCircle size={15} /> All Systems Normal
          </span>
        }
      />

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
          <div className="w-32 h-20 bg-green-50 rounded-xl flex items-center justify-center border-2 border-green-200">
            <Bus size={52} className="text-[#40A047]" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{v.busNumber}</p>
            <p className="text-sm text-gray-500">{v.model}</p>
            <p className="text-xs text-gray-400 mt-1">Odometer: {v.odometer}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <CircleGauge label="Fuel Level" value={v.fuelLevel} max={100} color="#40A047" unit="%" />
          <CircleGauge label="Engine Temp" value={78} max={120} color="#3B82F6" unit="C" />
          <CircleGauge label="Battery" value={92} max={100} color="#8B5CF6" unit="%" />
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900 mb-3">Maintenance Alerts</h2>
        <StatusRow icon={Gauge} label="Engine Status" value={v.engineStatus} status="Good" />
        <StatusRow icon={Zap} label="Battery Health" value={v.batteryHealth} status="Good" />
        <StatusRow icon={Wind} label="Tire Pressure" value={v.tirePressure} status="Good" />
        <StatusRow icon={Fuel} label="Fuel Level" value={v.fuelLevel + "%"} status={v.fuelLevel > 30 ? "Good" : "Warning"} />
        <StatusRow icon={Settings} label="Last Service" value={v.lastService} status="Good" />
        <StatusRow icon={AlertTriangle} label="Next Service Due" value={v.nextService} status="Warning" />
      </div>

      <button onClick={() => toast.success("Issue submitted to admin")}
        className="w-full py-3 border-2 border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors text-sm flex items-center justify-center gap-2">
        <AlertTriangle size={16} /> Report Vehicle Issue
      </button>
    </motion.div>
  )
}
