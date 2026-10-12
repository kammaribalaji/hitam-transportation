import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth.js'
import { transportApplicationService } from '../../api/services.js'
import {
  Clock, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Bus,
  ShieldCheck, ArrowRight, Phone, FileText, Lock, AlertCircle, PlusCircle, Calendar
} from 'lucide-react'

export default function ApplicationStatusPage() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [statusData, setStatusData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const fetchStatus = useCallback(async () => {
    try {
      setError(null)
      const res = await transportApplicationService.getStatus()
      if (res.data?.success) {
        setStatusData(res.data)
      } else {
        throw new Error(res.data?.message || 'Could not verify application status')
      }
    } catch (err) {
      console.warn('Could not load application status:', err.message)
      setError(err.response?.data?.message || 'Unable to connect to the server. Please verify your connection.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      if (refreshUser) await refreshUser()
      await fetchStatus()
      toast.success('Application status refreshed from database')
    } catch (err) {
      toast.error('Could not refresh status')
    } finally {
      setRefreshing(false)
    }
  }

  // 1. Loading State
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-50 text-[#40A047] mb-4">
          <RefreshCw size={28} className="animate-spin" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Checking Transport Enrolment Status</h2>
        <p className="text-xs text-gray-500 mt-1">Querying actual application records in PostgreSQL...</p>
      </div>
    )
  }

  // 2. Retryable Error State (Do NOT assume pending or show fake data!)
  if (error && !statusData) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <AlertTriangle size={36} className="text-red-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-red-950">Unable to Load Application Status</h2>
          <p className="text-xs text-red-700 mt-1 max-w-md mx-auto">{error}</p>
          <button
            onClick={() => { setLoading(true); fetchStatus() }}
            className="mt-4 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-sm inline-flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw size={13} />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    )
  }

  const application = statusData?.application
  const hasApplied = Boolean(statusData?.hasApplied && application)
  const appStatus = String(statusData?.status || 'NOT_SUBMITTED').toUpperCase()
  const isApproved = Boolean(statusData?.isApproved)
  const isPaid = Boolean(statusData?.isPaid || user?.transportFeePaid)
  const student = statusData?.user || user

  // 3. Case A: Student has NOT submitted a transport application
  // Strictly do NOT show fake reference or "Awaiting Admin Approval"!
  if (!hasApplied || appStatus === 'NOT_SUBMITTED') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200/60">
            <FileText size={32} />
          </div>

          <span className="inline-block text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 mb-3">
            No Application On Record
          </span>

          <h1 className="text-2xl font-black text-gray-900 mb-2">
            You Have Not Applied for College Transport
          </h1>

          <p className="text-xs sm:text-sm text-gray-500 max-w-lg mx-auto leading-relaxed mb-6">
            Our PostgreSQL records show that you have registered a college account, but you have not yet submitted a transport facility application for the 2026–2027 academic session.
          </p>

          <div className="bg-gray-50 rounded-2xl p-4 max-w-md mx-auto mb-6 text-left border border-gray-100 text-xs text-gray-700 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-400">Student Roll Number:</span>
              <span className="font-mono font-bold text-gray-900">{student?.rollNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Student Name:</span>
              <span className="font-semibold text-gray-900">{student?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Enrolment State:</span>
              <span className="font-bold text-amber-700">NOT_SUBMITTED</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/student/apply')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#40A047] hover:bg-[#2d7a33] text-white text-xs sm:text-sm font-bold shadow-md shadow-green-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlusCircle size={16} />
              <span>Fill Transport Application Form</span>
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full sm:w-auto px-4 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>Check Database Again</span>
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // 4. Real Application Exists (PENDING, APPROVED, REJECTED)
  const formattedCreated = application?.createdAt
    ? new Date(application.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    : 'Recorded in database'

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 mb-6 relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
              isApproved
                ? 'bg-emerald-100 text-emerald-700'
                : appStatus === 'REJECTED'
                ? 'bg-red-100 text-red-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {isApproved ? (
                <CheckCircle2 size={30} />
              ) : appStatus === 'REJECTED' ? (
                <XCircle size={30} />
              ) : (
                <Clock size={30} className="animate-pulse" />
              )}
            </div>
            <div>
              <span className={`inline-block text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-1.5 ${
                isApproved
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : appStatus === 'REJECTED'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {isApproved
                  ? 'Application Approved'
                  : appStatus === 'REJECTED'
                  ? 'Application Rejected'
                  : 'Awaiting Admin Approval (PENDING)'}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900">
                Transport Application Status
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Roll Number: <span className="font-mono font-bold text-gray-800">{student?.rollNumber}</span> • Student: <span className="font-semibold text-gray-800">{student?.name}</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 transition shadow-sm disabled:opacity-50 cursor-pointer self-start sm:self-center"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Checking...' : 'Refresh Status'}</span>
          </button>
        </div>

        {/* Status Callout Banner */}
        <div className={`mt-6 p-4 rounded-xl border flex items-start gap-3 ${
          isApproved
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            : appStatus === 'REJECTED'
            ? 'bg-red-50/70 border-red-200 text-red-900'
            : 'bg-amber-50/70 border-amber-200 text-amber-900'
        }`}>
          {isApproved ? (
            <ShieldCheck size={20} className="text-emerald-600 shrink-0 mt-0.5" />
          ) : appStatus === 'REJECTED' ? (
            <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
          ) : (
            <Lock size={20} className="text-amber-600 shrink-0 mt-0.5" />
          )}

          <div className="text-xs sm:text-sm">
            {isApproved ? (
              <div>
                <p className="font-bold text-emerald-900">
                  🎉 Congratulations! Your transport application has been approved by the Transport Office.
                </p>
                <p className="text-emerald-700 mt-1">
                  You now have verified access to search active buses, view route timetables, and complete your transport fee booking.
                </p>
              </div>
            ) : appStatus === 'REJECTED' ? (
              <div>
                <p className="font-bold text-red-900">
                  Your transport application was not approved.
                </p>
                <p className="text-red-700 mt-1">
                  Reason: {application?.rejectionReason || user?.rejectionReason || 'Please contact the transport administrative office for clarification.'}
                </p>
              </div>
            ) : (
              <div>
                <p className="font-bold text-amber-900">
                  Your transport application ({application?.applicationNo}) is awaiting admin approval.
                </p>
                <p className="text-amber-700 mt-1">
                  You will be able to search for buses, view stops, and book your seat once an authorized transport administrator approves your application.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Button if Approved */}
        {isApproved && (
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => navigate(isPaid ? '/student' : '/student/find-bus')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#40A047] hover:bg-[#2d7a33] text-white text-xs sm:text-sm font-bold shadow-md shadow-green-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isPaid ? 'Go to Student Dashboard' : 'Proceed to Find My Bus & Booking'}</span>
              <ArrowRight size={16} />
            </button>
            {!isPaid && (
              <span className="text-xs text-gray-500">
                Step 2: Select your route and complete your transport fee payment.
              </span>
            )}
          </div>
        )}
      </motion.div>

      {/* Progress Flow Steps */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-6">
          Application & Enrolment Workflow
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
          {[
            {
              step: '1',
              title: 'Application Submitted',
              desc: `Submitted on ${formattedCreated.split(',')[0]}`,
              status: 'done',
            },
            {
              step: '2',
              title: 'Admin Review',
              desc: isApproved ? 'Verified & approved in PostgreSQL' : appStatus === 'REJECTED' ? 'Application rejected' : 'Under administrative verification',
              status: isApproved ? 'done' : appStatus === 'REJECTED' ? 'rejected' : 'active',
            },
            {
              step: '3',
              title: 'Find Bus & Payment',
              desc: isPaid ? 'Fee verified & seat confirmed' : 'Select route stop & pay fee',
              status: isPaid ? 'done' : isApproved ? 'active' : 'locked',
            },
            {
              step: '4',
              title: 'Bus Pass Activated',
              desc: isPaid ? 'Digital pass & live tracking active' : 'Digital QR bus pass unlocked after payment',
              status: isPaid ? 'done' : 'locked',
            },
          ].map((s) => (
            <div
              key={s.step}
              className={`p-4 rounded-xl border transition-all ${
                s.status === 'done'
                  ? 'bg-emerald-50/50 border-emerald-200'
                  : s.status === 'active'
                  ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-300/40'
                  : s.status === 'rejected'
                  ? 'bg-red-50/50 border-red-200'
                  : 'bg-gray-50 border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  s.status === 'done'
                    ? 'bg-emerald-600 text-white'
                    : s.status === 'active'
                    ? 'bg-amber-500 text-white'
                    : s.status === 'rejected'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-300 text-gray-700'
                }`}>
                  {s.status === 'done' ? '✓' : s.step}
                </span>
                {s.status === 'locked' && <Lock size={12} className="text-gray-400" />}
              </div>
              <p className="text-xs font-bold text-gray-900">{s.title}</p>
              <p className="text-[11px] text-gray-500 mt-1 leading-snug">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Application Details Summary */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
          <FileText size={14} className="text-[#40A047]" />
          <span>Real Database Application Details</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-[11px] text-gray-400 font-semibold">Application Reference Number</p>
            <p className="text-xs sm:text-sm font-mono font-bold text-gray-800 mt-0.5">
              {application?.applicationNo}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-[11px] text-gray-400 font-semibold">Submission Timestamp</p>
            <p className="text-xs sm:text-sm font-semibold text-gray-800 mt-0.5 flex items-center gap-1.5">
              <Calendar size={13} className="text-gray-400" />
              <span>{formattedCreated}</span>
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-[11px] text-gray-400 font-semibold">Requested Route & Stop</p>
            <p className="text-xs sm:text-sm font-semibold text-gray-800 mt-0.5">
              Route {application?.requestedRouteId || '—'} • {application?.requestedBoardingPoint || '—'}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-[11px] text-gray-400 font-semibold">Current PostgreSQL Status</p>
            <p className={`text-xs sm:text-sm font-bold mt-0.5 ${
              isApproved ? 'text-emerald-600' : appStatus === 'REJECTED' ? 'text-red-600' : 'text-amber-600'
            }`}>
              {appStatus}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-[11px] text-gray-400 font-semibold">Student & Academic Branch</p>
            <p className="text-xs sm:text-sm font-semibold text-gray-800 mt-0.5">
              {application?.branch || student?.department || '—'} • {application?.academicYear || student?.year || '—'}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-[11px] text-gray-400 font-semibold">Need Help?</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Phone size={13} className="text-[#40A047]" />
              <p className="text-xs font-bold text-gray-700">+91 9490717770 (Transport Office)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
