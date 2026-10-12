import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Bus,
  MapPin,
  User,
  GraduationCap,
  Phone,
  Home,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  ArrowLeft,
  Search,
  ShieldCheck,
  Send,
  HelpCircle,
  Check,
} from 'lucide-react';
import { transportApplicationService } from '../../api/services.js';

const BRANCHES = [
  'Computer Science & Engineering (CSE)',
  'CSE - Artificial Intelligence & ML (CSM)',
  'CSE - Data Science (CSD)',
  'CSE - Cyber Security',
  'Electronics & Communication Engineering (ECE)',
  'Electrical & Electronics Engineering (EEE)',
  'Mechanical Engineering (MECH)',
  'Civil Engineering (CIVIL)',
  'MBA / Management',
];

const ACADEMIC_YEARS = ['I Year (1st Year)', 'II Year (2nd Year)', 'III Year (3rd Year)', 'IV Year (4th Year)'];

export default function TransportApplicationPage() {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [boardingStops, setBoardingStops] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittedApp, setSubmittedApp] = useState(null);

  // Status tracking modal/section state
  const [showTracker, setShowTracker] = useState(false);
  const [trackRef, setTrackRef] = useState('');
  const [trackRoll, setTrackRoll] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackedStatus, setTrackedStatus] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      fullName: '',
      rollNumber: '',
      branch: 'Computer Science & Engineering (CSE)',
      academicYear: 'II Year (2nd Year)',
      mobileNumber: '',
      email: '',
      address: '',
      requestedRouteId: '',
      requestedBoardingPoint: '',
      guardianName: '',
      guardianMobile: '',
      declarationAccepted: true,
      rulesAcknowledged: true,
    },
  });

  const watchedRouteId = watch('requestedRouteId');

  // Load real routes & stops from PostgreSQL
  useEffect(() => {
    setLoadingMeta(true);
    transportApplicationService
      .getMeta()
      .then((res) => {
        const list = res.data?.routes || [];
        setRoutes(list);
        if (list.length > 0) {
          const first = list[0];
          setSelectedRoute(first);
          setValue('requestedRouteId', first.id);
          const stops = first.stops || [];
          setBoardingStops(stops);
          if (stops.length > 0) {
            setValue('requestedBoardingPoint', stops[0].name || stops[0]);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load routes from backend:', err);
        toast.error('Could not load routes from database. Please reload.');
      })
      .finally(() => setLoadingMeta(false));
  }, [setValue]);

  // When route changes, update valid boarding points from RouteStop records
  useEffect(() => {
    if (!watchedRouteId || !routes.length) return;
    const r = routes.find((x) => String(x.id) === String(watchedRouteId));
    if (r) {
      setSelectedRoute(r);
      const stops = r.stops || [];
      setBoardingStops(stops);
      if (stops.length > 0) {
        setValue('requestedBoardingPoint', stops[0].name || stops[0]);
      }
    }
  }, [watchedRouteId, routes, setValue]);

  const onSubmit = async (formData) => {
    setSubmitting(true);
    try {
      const payload = {
        fullName: formData.fullName.trim(),
        rollNumber: formData.rollNumber.trim().toUpperCase(),
        branch: formData.branch,
        academicYear: formData.academicYear,
        mobileNumber: formData.mobileNumber.trim(),
        email: formData.email ? formData.email.trim() : `${formData.rollNumber.trim().toLowerCase()}@hitam.edu.in`,
        address: formData.address.trim(),
        requestedRouteId: String(formData.requestedRouteId).trim(),
        requestedBoardingPoint: String(formData.requestedBoardingPoint).trim(),
        guardianName: formData.guardianName?.trim() || '',
        guardianMobile: formData.guardianMobile.trim(),
        declarationAccepted: Boolean(formData.declarationAccepted),
        rulesAcknowledged: Boolean(formData.rulesAcknowledged),
      };

      const res = await transportApplicationService.submit(payload);
      setSubmittedApp(res.data?.application);
      toast.success('Transport application submitted successfully!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Application submission failed. Please verify all details.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackSubmit = async (e) => {
    e.preventDefault();
    if (!trackRef.trim()) {
      toast.error('Please enter an application reference number');
      return;
    }
    setTrackingLoading(true);
    setTrackedStatus(null);
    try {
      const res = await transportApplicationService.track(trackRef.trim(), trackRoll.trim());
      setTrackedStatus(res.data?.application);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Application not found. Please check reference and roll number.');
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top Header */}
      <header className="bg-[#1a2e1a] text-white border-b border-green-800/40 sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="p-2 -ml-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Return to Login"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="w-9 h-9 bg-[#40A047] rounded-xl flex items-center justify-center shrink-0 shadow-sm">
              <Bus size={20} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-sm sm:text-base leading-tight tracking-wide">HITAM TRANSPORT</p>
              <p className="text-green-400 text-[11px] font-medium hidden sm:block">Smart Campus Mobility System</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setShowTracker(true)}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-all"
            >
              <Search size={14} className="text-green-400" />
              <span>Track Application</span>
            </button>
            <Link
              to="/login"
              className="px-3.5 py-1.5 rounded-xl bg-[#40A047] hover:bg-[#2d7a33] text-white text-xs font-bold transition-all shadow-sm"
            >
              Student Login
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {submittedApp ? (
          /* Confirmation Success Screen */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 sm:p-10 border border-emerald-100 shadow-xl max-w-2xl mx-auto text-center"
          >
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5 border-2 border-emerald-200">
              <CheckCircle2 size={44} className="text-[#40A047]" />
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-full tracking-wide uppercase inline-block mb-2">
              Application Received
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">Application Submitted!</h1>
            <p className="text-gray-600 text-sm mb-6 max-w-md mx-auto">
              Your application has been logged into the HITAM Transport Management System and sent to the Transport Office for review.
            </p>

            {/* Reference Box */}
            <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-2xl p-5 mb-6 text-left space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
                <span className="text-xs font-semibold text-emerald-900">Application Reference No.</span>
                <span className="font-mono text-base font-black text-emerald-950 tracking-wider">
                  {submittedApp.applicationNo}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500 block">Applicant:</span>
                  <span className="font-bold text-gray-800">{submittedApp.fullName}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Roll Number:</span>
                  <span className="font-bold text-gray-800">{submittedApp.rollNumber}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Requested Route:</span>
                  <span className="font-bold text-gray-800">Route {submittedApp.requestedRouteId}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Boarding Stop:</span>
                  <span className="font-bold text-gray-800">{submittedApp.requestedBoardingPoint}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-emerald-200 flex items-center justify-between">
                <span className="text-xs text-emerald-800 font-semibold">Initial Status:</span>
                <span className="px-2.5 py-0.5 bg-[#40A047] text-white text-[11px] font-extrabold rounded-full">
                  PENDING REVIEW
                </span>
              </div>
            </div>

            {/* Workflow Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 text-left mb-6 flex gap-3 items-start">
              <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1">What Happens Next?</p>
                <ol className="list-decimal pl-4 space-y-1 text-amber-800">
                  <li>The Transport Office will review your details and route seat availability.</li>
                  <li>Upon approval, the administrator will activate your student login credentials.</li>
                  <li>You will log in using your registered roll number and complete the transport fee payment.</li>
                  <li>Your digital QR bus pass and seat allocation will be generated automatically after verified payment.</li>
                </ol>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  setSubmittedApp(null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-6 py-3 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-bold rounded-xl transition-all"
              >
                Submit Another Application
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-3 bg-[#40A047] hover:bg-[#2d7a33] text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-green-700/20"
              >
                Return to Login
              </button>
            </div>
          </motion.div>
        ) : (
          /* Application Form */
          <div>
            {/* Form Banner */}
            <div className="mb-6 bg-gradient-to-r from-[#1a2e1a] to-[#254425] rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 text-xs font-semibold text-green-300 mb-3">
                  <FileText size={13} />
                  <span>Official College Transport Enrollment · AY 2026–2027</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black mb-2">HITAM College Transport Application Form</h1>
                <p className="text-gray-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
                  Please complete the form below to apply for college transport facilities. Route allocation and boarding point confirmations are managed directly through PostgreSQL records.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* SECTION A: STUDENT INFORMATION */}
              <div className="bg-white rounded-2xl p-5 sm:p-7 border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-green-50 text-[#40A047] flex items-center justify-center font-bold">
                    <User size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">A. Student Personal Information</h2>
                    <p className="text-xs text-gray-500">Provide official college registration and contact details</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Full Name of the Student <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('fullName', { required: 'Student full name is required' })}
                      placeholder="e.g. KAMMARI BALAJI"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047] transition-all"
                    />
                    {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>}
                  </div>

                  {/* Roll Number */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Hall Ticket / Roll Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('rollNumber', {
                        required: 'Roll number is required',
                        pattern: {
                          value: /^[A-Z0-9]+$/i,
                          message: 'Must contain alphanumeric characters only',
                        },
                      })}
                      placeholder="e.g. 24E51A0557"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm uppercase focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047] transition-all font-mono"
                    />
                    {errors.rollNumber && <p className="text-red-500 text-xs mt-1">{errors.rollNumber.message}</p>}
                  </div>

                  {/* Branch */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Branch / Department <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('branch', { required: 'Branch is required' })}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047] bg-white transition-all"
                    >
                      {BRANCHES.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Academic Year */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Academic Year <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('academicYear', { required: 'Academic year is required' })}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047] bg-white transition-all"
                    >
                      {ACADEMIC_YEARS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Student Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        {...register('mobileNumber', {
                          required: 'Student mobile number is required',
                          pattern: {
                            value: /^[0-9+ -]{10,14}$/,
                            message: 'Please enter a valid 10-digit mobile number',
                          },
                        })}
                        placeholder="e.g. 9876543210"
                        className="w-full pl-9 pr-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047] transition-all"
                      />
                    </div>
                    {errors.mobileNumber && <p className="text-red-500 text-xs mt-1">{errors.mobileNumber.message}</p>}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Student Email Address</label>
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="e.g. student@hitam.edu.in"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047] transition-all"
                    />
                  </div>

                  {/* Residential Address */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Residential Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      {...register('address', { required: 'Residential address is required' })}
                      rows={2}
                      placeholder="House No., Street, Colony, City / Town, Landmark, Pincode"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047] transition-all"
                    />
                    {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
                  </div>
                </div>
              </div>

              {/* SECTION B: TRANSPORT INFORMATION */}
              <div className="bg-white rounded-2xl p-5 sm:p-7 border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-green-50 text-[#40A047] flex items-center justify-center font-bold">
                    <Bus size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">B. Transport & Route Preference</h2>
                    <p className="text-xs text-gray-500">
                      Populated dynamically from active PostgreSQL Route and Stop records
                    </p>
                  </div>
                </div>

                {loadingMeta ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2">
                    <div className="w-8 h-8 border-3 border-[#40A047] border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-gray-500">Loading verified routes and boarding points...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Route selector */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Requested Bus Route <span className="text-red-500">*</span>
                      </label>
                      <select
                        {...register('requestedRouteId', { required: 'Please select a route' })}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047] bg-white transition-all"
                      >
                        {routes.map((r) => (
                          <option key={r.id} value={r.id}>
                            Route {r.id}: {r.name} (Bus {r.busNumber})
                          </option>
                        ))}
                      </select>
                      {selectedRoute && (
                        <p className="text-[11px] text-gray-500 mt-1">
                          Reporting Time: <span className="font-semibold text-gray-700">{selectedRoute.reportingTime || '07:30 AM'}</span> · Annual Fee:{' '}
                          <span className="font-bold text-[#40A047]">₹{(selectedRoute.feeAmount || 12000).toLocaleString('en-IN')}</span>
                        </p>
                      )}
                    </div>

                    {/* Boarding Point selector (strictly filtered to this route's stops) */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Requested Boarding Point <span className="text-red-500">*</span>
                      </label>
                      <select
                        {...register('requestedBoardingPoint', { required: 'Please pick a boarding stop' })}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047] bg-white transition-all"
                      >
                        {boardingStops.map((s, idx) => {
                          const stopName = typeof s === 'string' ? s : s.name;
                          const stopTime = typeof s === 'object' && s.time ? ` (${s.time})` : '';
                          return (
                            <option key={`${stopName}-${idx}`} value={stopName}>
                              {stopName}
                              {stopTime}
                            </option>
                          );
                        })}
                      </select>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Only verified boarding points for Route {watchedRouteId} are available.
                      </p>
                    </div>

                    {/* Transport Session */}
                    <div className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
                      <span className="text-gray-600 font-semibold">Transport Academic Session:</span>
                      <span className="font-bold text-gray-900 bg-white px-2.5 py-1 rounded-md border border-gray-200">
                        AY 2026–2027 (Annual)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION C: PARENT/GUARDIAN INFORMATION */}
              <div className="bg-white rounded-2xl p-5 sm:p-7 border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-green-50 text-[#40A047] flex items-center justify-center font-bold">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">C. Parent / Guardian Details</h2>
                    <p className="text-xs text-gray-500">Emergency contact and authorization details</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Parent / Guardian Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('guardianName', { required: "Parent/Guardian name is required" })}
                      placeholder="e.g. K. RAMESH BABU"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047] transition-all"
                    />
                    {errors.guardianName && <p className="text-red-500 text-xs mt-1">{errors.guardianName.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Parent / Guardian Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        {...register('guardianMobile', {
                          required: "Parent's mobile number is required",
                          pattern: {
                            value: /^[0-9+ -]{10,14}$/,
                            message: 'Please enter a valid 10-digit mobile number',
                          },
                        })}
                        placeholder="e.g. 9876501234"
                        className="w-full pl-9 pr-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047] transition-all"
                      />
                    </div>
                    {errors.guardianMobile && <p className="text-red-500 text-xs mt-1">{errors.guardianMobile.message}</p>}
                  </div>
                </div>
              </div>

              {/* SECTION D: DECLARATION */}
              <div className="bg-white rounded-2xl p-5 sm:p-7 border border-gray-100 shadow-sm space-y-3">
                <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-green-50 text-[#40A047] flex items-center justify-center font-bold">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">D. Student Declaration & Rules</h2>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('declarationAccepted', { required: 'You must accept the student declaration' })}
                      className="w-4 h-4 mt-0.5 accent-[#40A047] rounded cursor-pointer shrink-0"
                    />
                    <span className="text-xs text-gray-600 leading-relaxed">
                      I hereby declare that the particulars furnished above are true and correct to the best of my knowledge. I understand that submission of this application does not guarantee transport service until approved and fee is paid.
                    </span>
                  </label>
                  {errors.declarationAccepted && (
                    <p className="text-red-500 text-xs ml-7">{errors.declarationAccepted.message}</p>
                  )}

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('rulesAcknowledged', { required: 'You must acknowledge transport rules' })}
                      className="w-4 h-4 mt-0.5 accent-[#40A047] rounded cursor-pointer shrink-0"
                    />
                    <span className="text-xs text-gray-600 leading-relaxed">
                      I agree to abide by all the rules and regulations of HITAM College Transport. I understand that boarding the bus requires a valid digital QR pass generated upon verified fee payment.
                    </span>
                  </label>
                  {errors.rulesAcknowledged && (
                    <p className="text-red-500 text-xs ml-7">{errors.rulesAcknowledged.message}</p>
                  )}
                </div>
              </div>

              {/* Submit Action */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-[#40A047] hover:bg-[#2d7a33] text-white font-extrabold rounded-2xl text-base shadow-xl shadow-green-700/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting Application to PostgreSQL...</span>
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>Submit Official Transport Application</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* TRACK APPLICATION MODAL */}
      <AnimatePresence>
        {showTracker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-50 text-[#40A047] flex items-center justify-center">
                    <Search size={16} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-base">Track Application Status</h3>
                </div>
                <button
                  onClick={() => {
                    setShowTracker(false);
                    setTrackedStatus(null);
                  }}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleTrackSubmit} className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Application Reference Number (e.g. APP-2026-XXXXX)
                  </label>
                  <input
                    value={trackRef}
                    onChange={(e) => setTrackRef(e.target.value)}
                    placeholder="APP-2026-12345"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047] font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Roll Number (Optional, for extra verification)
                  </label>
                  <input
                    value={trackRoll}
                    onChange={(e) => setTrackRoll(e.target.value)}
                    placeholder="e.g. 24E51A0557"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047] font-mono uppercase"
                  />
                </div>
                <button
                  type="submit"
                  disabled={trackingLoading}
                  className="w-full py-2.5 bg-[#40A047] hover:bg-[#2d7a33] text-white text-xs font-bold rounded-xl transition-all disabled:opacity-60"
                >
                  {trackingLoading ? 'Checking Database...' : 'Lookup Application'}
                </button>
              </form>

              {trackedStatus && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-gray-900">{trackedStatus.applicationNo}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
                        trackedStatus.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : trackedStatus.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800'
                          : trackedStatus.status === 'UNDER_REVIEW'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {trackedStatus.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-gray-600">
                    <div>
                      <span className="text-gray-400 block text-[10px]">Student:</span>
                      <span className="font-semibold text-gray-800">{trackedStatus.fullName}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Roll No:</span>
                      <span className="font-semibold text-gray-800">{trackedStatus.rollNumber}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Route:</span>
                      <span className="font-semibold text-gray-800">Route {trackedStatus.requestedRouteId}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Boarding Stop:</span>
                      <span className="font-semibold text-gray-800">{trackedStatus.requestedBoardingPoint}</span>
                    </div>
                  </div>
                  {trackedStatus.accountActivated && (
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 font-semibold text-[11px] flex items-center gap-1.5">
                      <Check size={14} className="text-emerald-600 shrink-0" />
                      <span>Account is activated! You may now log in to complete transport fee payment.</span>
                    </div>
                  )}
                  {trackedStatus.rejectionReason && (
                    <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-[11px]">
                      <span className="font-bold block">Rejection Reason:</span>
                      <span>{trackedStatus.rejectionReason}</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
