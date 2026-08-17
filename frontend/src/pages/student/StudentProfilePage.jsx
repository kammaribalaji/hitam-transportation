import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth.js'
import { userService, authService } from '../../api/services.js'
import { User, Mail, Phone, School, MapPin, Lock, Edit3, Save, X } from 'lucide-react'

export default function StudentProfilePage() {
  const { user, updateUser } = useAuth()
  const [editing, setEditing] = useState(false)
  const [changingPw, setChangingPw] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ defaultValues: { name: user?.name, email: user?.email, phone: user?.phone, address: user?.address || '' } })
  const { register: regPw, handleSubmit: handlePwSubmit, reset: resetPw, formState: { errors: pwErrors } } = useForm()

  const onSaveProfile = async (data) => {
    try {
      await userService.updateProfile(data)
      updateUser(data)
      setEditing(false)
      toast.success('Profile updated successfully')
    } catch {
      toast.error('Could not save. Try again.')
    }
  }

  const onChangePassword = async (data) => {
    if (data.newPassword !== data.confirmPassword) { toast.error('Passwords do not match'); return }
    try {
      await authService.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword })
      setChangingPw(false)
      resetPw()
      toast.success('Password updated successfully')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password')
    }
  }

  const fields = [
    { icon: User, label: 'Full Name', value: user?.name },
    { icon: School, label: 'Department', value: user?.department },
    { icon: School, label: 'Academic Year', value: user?.year },
    { icon: MapPin, label: 'Boarding Point', value: user?.boardingPoint || '—' },
    { icon: Mail, label: 'Email Address', value: user?.email },
    { icon: Phone, label: 'Phone Number', value: user?.phone },
    { icon: MapPin, label: 'Address', value: user?.address || '—' },
    { icon: School, label: 'Transport Amount', value: user?.feeAmount ? `₹${Number(user.feeAmount).toLocaleString('en-IN')}` : '—' },
    { icon: School, label: 'Amount Paid', value: user?.feePaidAmount ? `₹${Number(user.feePaidAmount).toLocaleString('en-IN')}` : '—' },
    { icon: School, label: 'Balance Due', value: user?.feeBalance ? `₹${Number(user.feeBalance).toLocaleString('en-IN')}` : '—' },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900">Student Profile</h1>

      {/* Avatar card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
        <div className="w-20 h-20 bg-[#40A047] rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-green-600/20">
          <span className="text-3xl font-bold text-white">{user?.avatarInitial || user?.name?.[0] || 'S'}</span>
        </div>
        <p className="text-xl font-bold text-gray-900">{user?.name}</p>
        <p className="text-sm font-semibold text-[#40A047] mt-1">{user?.rollNumber}</p>
        <p className="text-xs text-gray-500 mt-0.5">{user?.department} · {user?.year}</p>
        <div className="flex items-center justify-center gap-2 mt-3">
          {(() => {
            const fs = user?.paymentStatus || (user?.transportFeePaid ? 'PAID' : 'UNPAID')
            const badge = {
              PAID: { text: '✓ Fee Paid', cls: 'bg-green-100 text-green-700' },
              'PARTIALLY PAID': { text: 'Partially Paid', cls: 'bg-amber-100 text-amber-700' },
              UNPAID: { text: 'Fee Due', cls: 'bg-red-100 text-red-600' },
            }[fs]
            return badge ? <span className={`px-3 py-1 text-xs font-bold rounded-full ${badge.cls}`}>{badge.text}</span> : null
          })()}
          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">Route {user?.assignedRouteId || '12'}</span>
        </div>
      </div>

      {/* Details card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-gray-900">Profile Details</h2>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-[#40A047] text-xs font-bold rounded-lg hover:bg-green-100 transition-colors">
              <Edit3 size={13} /> Edit Profile
            </button>
          ) : (
            <button onClick={() => { setEditing(false); reset() }} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors">
              <X size={13} /> Cancel
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSubmit(onSaveProfile)} className="space-y-4">
            {[
              { name: 'name', label: 'Full Name', placeholder: 'Full name' },
              { name: 'email', label: 'Email', placeholder: 'Email address', type: 'email' },
              { name: 'phone', label: 'Phone', placeholder: 'Phone number' },
              { name: 'address', label: 'Address', placeholder: 'Your address' },
            ].map(({ name, label, placeholder, type = 'text' }) => (
              <div key={name}>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
                <input {...register(name)} type={type} placeholder={placeholder}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047]" />
              </div>
            ))}
            <button type="submit" className="w-full py-3 bg-[#40A047] text-white font-bold rounded-xl text-sm hover:bg-[#2d7a33] transition-colors flex items-center justify-center gap-2">
              <Save size={16} /> Save Changes
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            {fields.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-4 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className="text-[#40A047]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{value || '—'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Change password */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-[#40A047]" />
            <h2 className="text-sm font-bold text-gray-900">Change Password</h2>
          </div>
          {!changingPw && (
            <button onClick={() => setChangingPw(true)} className="text-xs text-[#40A047] font-bold hover:underline">Update Password</button>
          )}
        </div>
        {changingPw && (
          <form onSubmit={handlePwSubmit(onChangePassword)} className="space-y-4">
            {[
              { name: 'currentPassword', label: 'Current Password' },
              { name: 'newPassword', label: 'New Password' },
              { name: 'confirmPassword', label: 'Confirm New Password' },
            ].map(({ name, label }) => (
              <div key={name}>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
                <input {...regPw(name, { required: 'Required' })} type="password"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047]" />
              </div>
            ))}
            <div className="flex gap-2">
              <button type="submit" className="flex-1 py-3 bg-[#40A047] text-white font-bold rounded-xl text-sm hover:bg-[#2d7a33] transition-colors">Update Password</button>
              <button type="button" onClick={() => { setChangingPw(false); resetPw() }} className="flex-1 py-3 border-2 border-gray-200 text-gray-600 font-semibold rounded-xl text-sm hover:bg-gray-50 transition-colors">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </motion.div>
  )
}
