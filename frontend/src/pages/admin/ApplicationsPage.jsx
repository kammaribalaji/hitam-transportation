import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FileText,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  HelpCircle,
  UserCheck,
  Eye,
  AlertTriangle,
  RefreshCw,
  Phone,
  Calendar,
  MapPin,
  Bus,
  ShieldCheck,
  Key,
} from 'lucide-react';
import { transportApplicationService } from '../../api/services.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import SearchInput from '../../components/common/SearchInput.jsx';
import Table from '../../components/common/Table.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import Modal from '../../components/common/Modal.jsx';

const STATUS_FILTERS = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Under Review', value: 'UNDER_REVIEW' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'More Info Needed', value: 'MORE_INFO_REQUIRED' },
];

export default function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [summary, setSummary] = useState({
    all: 0,
    pending: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
    moreInfoRequired: 0,
  });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Selected application for detail modal
  const [selectedApp, setSelectedApp] = useState(null);
  const [existingUser, setExistingUser] = useState(null);
  const [detailsModal, setDetailsModal] = useState(false);

  // Action modals
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [activateModal, setActivateModal] = useState(false);
  const [defaultPassword, setDefaultPassword] = useState('hitam123');

  // Load summary counts
  const loadSummary = async () => {
    try {
      const res = await transportApplicationService.getSummary();
      if (res.data?.summary) {
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.warn('Could not load application summary:', err);
    }
  };

  // Load list
  const loadApplications = async () => {
    setLoading(true);
    try {
      const res = await transportApplicationService.getAll({
        status: statusFilter,
        search,
        page,
        limit: 15,
      });
      setApplications(res.data?.applications || []);
      setPage(res.data?.page || 1);
      setPages(res.data?.pages || 1);
      setTotal(res.data?.total || 0);
    } catch (err) {
      toast.error('Failed to load transport applications from PostgreSQL.');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    loadApplications();
  }, [statusFilter, search, page]);

  const openDetails = async (appId) => {
    try {
      const res = await transportApplicationService.getById(appId);
      setSelectedApp(res.data?.application);
      setExistingUser(res.data?.existingUser);
      setDetailsModal(true);
    } catch (err) {
      toast.error('Could not load application details');
    }
  };

  // Actions
  const handleMarkReview = async (newStatus) => {
    if (!selectedApp) return;
    setActionLoading(true);
    try {
      await transportApplicationService.updateStatus(selectedApp.id, { status: newStatus });
      toast.success(`Application updated to ${newStatus}`);
      setDetailsModal(false);
      loadApplications();
      loadSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update review status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    setActionLoading(true);
    try {
      await transportApplicationService.approve(selectedApp.id, { remarks: 'Approved by administrator' });
      toast.success('Application APPROVED. Eligible for account activation.');
      setDetailsModal(false);
      loadApplications();
      loadSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!selectedApp || !rejectionReason.trim()) {
      toast.error('Please enter a rejection reason');
      return;
    }
    setActionLoading(true);
    try {
      await transportApplicationService.reject(selectedApp.id, { rejectionReason: rejectionReason.trim() });
      toast.success('Application rejected');
      setRejectModal(false);
      setDetailsModal(false);
      setRejectionReason('');
      loadApplications();
      loadSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivateAccount = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;
    setActionLoading(true);
    try {
      const res = await transportApplicationService.activateAccount(selectedApp.id, {
        defaultPassword: defaultPassword.trim() || 'hitam123',
      });
      toast.success(res.data?.message || 'Account activated successfully!');
      setActivateModal(false);
      setDetailsModal(false);
      loadApplications();
      loadSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Account activation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">APPROVED</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">REJECTED</span>;
      case 'UNDER_REVIEW':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">UNDER REVIEW</span>;
      case 'MORE_INFO_REQUIRED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">INFO NEEDED</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">PENDING</span>;
    }
  };

  const columns = [
    {
      key: 'applicationNo',
      label: 'Ref No.',
      render: (v) => <span className="font-mono text-xs font-bold text-gray-800">{v}</span>,
    },
    {
      key: 'fullName',
      label: 'Applicant Name',
      render: (v, row) => (
        <div>
          <p className="font-bold text-gray-900 text-xs">{v}</p>
          <p className="font-mono text-[11px] text-gray-500">{row.rollNumber}</p>
        </div>
      ),
    },
    {
      key: 'branch',
      label: 'Branch & Year',
      render: (v, row) => (
        <span className="text-xs text-gray-700">
          {v?.split('(')[1]?.replace(')', '') || v} · {row.academicYear?.split(' ')[0]}
        </span>
      ),
    },
    {
      key: 'requestedRouteId',
      label: 'Requested Route',
      render: (v) => <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-bold">Route {v}</span>,
    },
    {
      key: 'requestedBoardingPoint',
      label: 'Boarding Point',
      render: (v) => <span className="text-xs text-gray-800 font-medium truncate max-w-[150px] inline-block">{v}</span>,
    },
    {
      key: 'mobileNumber',
      label: 'Contact',
      render: (v) => <span className="text-xs font-mono text-gray-600">{v}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (v) => getStatusBadge(v),
    },
    {
      key: 'accountActivated',
      label: 'Account',
      render: (v) =>
        v ? (
          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[11px] font-bold">
            Active
          </span>
        ) : (
          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[11px]">Inactive</span>
        ),
    },
    {
      key: 'id',
      label: 'Actions',
      render: (v) => (
        <button
          onClick={() => openDetails(v)}
          className="px-2.5 py-1 rounded-lg bg-green-50 hover:bg-[#40A047] hover:text-white text-[#40A047] text-xs font-bold transition-all flex items-center gap-1"
        >
          <Eye size={12} />
          <span>Review</span>
        </button>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <PageHeader
        title="Transport Applications"
        subtitle="Review, approve, and activate official student transport applications"
        actions={
          <button
            onClick={() => {
              loadApplications();
              loadSummary();
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-xs font-bold rounded-xl hover:bg-gray-50 text-gray-700"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'All Applications', count: summary.all, bg: 'bg-slate-50', text: 'text-slate-900', border: 'border-slate-200' },
          { label: 'Pending Review', count: summary.pending, bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200' },
          { label: 'Under Review', count: summary.underReview, bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200' },
          { label: 'Approved', count: summary.approved, bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-200' },
          { label: 'Rejected', count: summary.rejected, bg: 'bg-rose-50', text: 'text-rose-900', border: 'border-rose-200' },
          { label: 'Info Needed', count: summary.moreInfoRequired, bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-200' },
        ].map((card) => (
          <div key={card.label} className={`rounded-xl p-3 border ${card.border} ${card.bg}`}>
            <p className="text-[11px] font-semibold text-gray-500 uppercase">{card.label}</p>
            <p className={`text-2xl font-black mt-1 ${card.text}`}>{card.count}</p>
          </div>
        ))}
      </div>

      {/* Filter and Table Card */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search by student name, roll number, or reference..."
            className="w-full md:w-80"
          />

          {/* Status buttons */}
          <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  setStatusFilter(f.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === f.value
                    ? 'bg-[#40A047] text-white shadow-xs'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Real Data Table */}
        <Table columns={columns} data={applications} emptyMessage="No transport applications found in database." />

        {/* Pagination */}
        <Pagination page={page} pages={pages} total={total} onPage={setPage} />
      </div>

      {/* APPLICATION DETAILS MODAL */}
      <Modal
        open={detailsModal}
        onClose={() => setDetailsModal(false)}
        title={`Transport Application: ${selectedApp?.applicationNo || ''}`}
        size="lg"
      >
        {selectedApp && (
          <div className="space-y-5 text-xs text-gray-700">
            {/* Top Status Banner */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-gray-400 block text-[10px]">CURRENT APPLICATION STATUS</span>
                <div className="flex items-center gap-2 mt-0.5">
                  {getStatusBadge(selectedApp.status)}
                  {selectedApp.accountActivated && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full">
                      ✓ Student Account Active
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-gray-400 block text-[10px]">SUBMISSION DATE</span>
                <span className="font-semibold text-gray-700">
                  {new Date(selectedApp.createdAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* Applicant Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Student Personal Info */}
              <div className="p-4 rounded-xl border border-gray-100 bg-white space-y-2">
                <h4 className="font-bold text-gray-900 border-b border-gray-100 pb-1.5 flex items-center gap-1.5 text-xs">
                  <UserCheck size={14} className="text-[#40A047]" />
                  <span>Student Details</span>
                </h4>
                <div>
                  <span className="text-gray-400 block text-[10px]">Full Name:</span>
                  <span className="font-bold text-gray-900 text-sm">{selectedApp.fullName}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Hall Ticket / Roll No:</span>
                  <span className="font-mono font-bold text-gray-800">{selectedApp.rollNumber}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Branch / Department:</span>
                  <span className="font-semibold">{selectedApp.branch}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Academic Year:</span>
                  <span className="font-semibold">{selectedApp.academicYear}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Mobile Number:</span>
                  <span className="font-mono font-semibold">{selectedApp.mobileNumber}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Residential Address:</span>
                  <span className="font-medium text-gray-700">{selectedApp.address}</span>
                </div>
              </div>

              {/* Transport & Route Details */}
              <div className="p-4 rounded-xl border border-gray-100 bg-white space-y-2">
                <h4 className="font-bold text-gray-900 border-b border-gray-100 pb-1.5 flex items-center gap-1.5 text-xs">
                  <Bus size={14} className="text-[#40A047]" />
                  <span>Transport Route Preference</span>
                </h4>
                <div>
                  <span className="text-gray-400 block text-[10px]">Requested Route:</span>
                  <span className="font-bold text-[#40A047] text-sm">Route {selectedApp.requestedRouteId}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Requested Boarding Stop:</span>
                  <span className="font-bold text-gray-900">{selectedApp.requestedBoardingPoint}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Transport Academic Session:</span>
                  <span className="font-semibold">{selectedApp.transportSession}</span>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <span className="text-gray-400 block text-[10px]">Parent / Guardian Name:</span>
                  <span className="font-semibold">{selectedApp.guardianName || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Guardian Mobile Number:</span>
                  <span className="font-mono font-semibold">{selectedApp.guardianMobile}</span>
                </div>
              </div>
            </div>

            {/* Account Status in PostgreSQL */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                PostgreSQL User Account Association:
              </span>
              {existingUser ? (
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-gray-900">{existingUser.name}</span>
                    <span className="text-gray-500 ml-2 font-mono">({existingUser.rollNumber})</span>
                    <span className="ml-2 text-xs">· Status: <b>{existingUser.status}</b></span>
                  </div>
                  <div>
                    {existingUser.transportFeePaid ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold text-[10px]">
                        Fee Paid
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px]">
                        Fee Pending
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  No active login account exists for <b>{selectedApp.rollNumber}</b>. Account can be created/activated upon approval.
                </p>
              )}
            </div>

            {/* Rejection reason if rejected */}
            {selectedApp.rejectionReason && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs">
                <span className="font-bold block">Rejection Reason:</span>
                <span>{selectedApp.rejectionReason}</span>
              </div>
            )}

            {/* Actions Toolbar */}
            <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-2 justify-end">
              {/* Review status buttons */}
              {selectedApp.status === 'PENDING' && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleMarkReview('UNDER_REVIEW')}
                  className="px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-xl text-xs transition-all"
                >
                  Mark Under Review
                </button>
              )}

              {selectedApp.status !== 'REJECTED' && (
                <button
                  disabled={actionLoading}
                  onClick={() => setRejectModal(true)}
                  className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-bold rounded-xl text-xs transition-all"
                >
                  Reject Application
                </button>
              )}

              {selectedApp.status !== 'APPROVED' && selectedApp.status !== 'REJECTED' && (
                <button
                  disabled={actionLoading}
                  onClick={handleApprove}
                  className="px-4 py-2 bg-[#40A047] hover:bg-[#2d7a33] text-white font-bold rounded-xl text-xs transition-all shadow-sm"
                >
                  Approve Application
                </button>
              )}

              {/* Account activation action */}
              {selectedApp.status === 'APPROVED' && !selectedApp.accountActivated && (
                <button
                  disabled={actionLoading}
                  onClick={() => setActivateModal(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5"
                >
                  <Key size={14} />
                  <span>Create / Activate Student Account</span>
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* REJECT MODAL */}
      <Modal open={rejectModal} onClose={() => setRejectModal(false)} title="Reject Transport Application" size="sm">
        <form onSubmit={handleReject} className="space-y-4">
          <p className="text-xs text-gray-500">
            Please provide a specific reason for rejecting the application for student{' '}
            <b>{selectedApp?.fullName}</b>.
          </p>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Route capacity full / Ineligible residential address / Missing documentation"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={actionLoading}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl"
            >
              Confirm Rejection
            </button>
            <button
              type="button"
              onClick={() => setRejectModal(false)}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-xs font-bold rounded-xl"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* ACTIVATE ACCOUNT MODAL */}
      <Modal
        open={activateModal}
        onClose={() => setActivateModal(false)}
        title="Activate Student Login Account"
        size="sm"
      >
        <form onSubmit={handleActivateAccount} className="space-y-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
            <p className="font-bold">Account Activation Checklist:</p>
            <p>• Student: <b>{selectedApp?.fullName}</b></p>
            <p>• Roll Number: <b>{selectedApp?.rollNumber}</b></p>
            <p>• Assigned Route: <b>Route {selectedApp?.requestedRouteId}</b></p>
            <p>• Fee Status: <b>UNPAID (Pending student payment)</b></p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Initial Password for Student Login
            </label>
            <input
              value={defaultPassword}
              onChange={(e) => setDefaultPassword(e.target.value)}
              placeholder="hitam123"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047]"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Standard initial password is <code className="bg-gray-100 px-1 py-0.5 rounded">hitam123</code>. The student can change this upon login.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={actionLoading}
              className="flex-1 py-2.5 bg-[#40A047] hover:bg-[#2d7a33] text-white text-xs font-bold rounded-xl"
            >
              Activate Account
            </button>
            <button
              type="button"
              onClick={() => setActivateModal(false)}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-xs font-bold rounded-xl"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}
