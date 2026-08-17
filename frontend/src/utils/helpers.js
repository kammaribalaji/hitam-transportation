export const formatCurrency = (amount) => `₹${Number(amount).toLocaleString('en-IN')}`

export const getStatusColor = (status) => {
  const map = {
    CONFIRMED: 'bg-green-100 text-green-700',
    PAID: 'bg-green-100 text-green-700',
    ACTIVE: 'bg-green-100 text-green-700',
    BOARDED: 'bg-green-100 text-green-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    UPCOMING: 'bg-blue-100 text-blue-700',
    OPEN: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-600',
    COMPLETED: 'bg-gray-100 text-gray-600',
    RESOLVED: 'bg-green-100 text-green-700',
    MAINTENANCE: 'bg-orange-100 text-orange-700',
    ABSENT: 'bg-red-100 text-red-700',
    HIGH: 'bg-red-100 text-red-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    LOW: 'bg-green-100 text-green-700',
  }
  return map[status] || 'bg-gray-100 text-gray-600'
}
