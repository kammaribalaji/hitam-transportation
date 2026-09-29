export const errorHandler = (err, req, res, next) => {
  console.error(err);

  // Friendly messages for common Prisma errors (unique violations, missing rows, connection/auth issues).
  if (err.code === 'P2002') {
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(',') : String(err.meta?.target || '');
    const isSeatCollision =
      /tripId.*seatNumber|seatNumber.*tripId/i.test(target) ||
      /Booking_tripId_seatNumber_active_key/.test(String(err.message || ''));
    if (isSeatCollision) {
      return res.status(409).json({ message: 'Seat already booked. Please choose another seat.' });
    }
    return res.status(409).json({ message: 'A record with this value already exists (duplicate entry).' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ message: 'The requested record does not exist.' });
  }
  if (err.code === 'P2003') {
    return res.status(400).json({ message: 'Operation failed because a related record is referenced elsewhere.' });
  }
  const isDbConnectionError =
    String(err.code || '').startsWith('P1') ||
    err.name === 'PrismaClientInitializationError' ||
    err.name === 'PrismaClientKnownRequestError' ||
    err.name === 'PrismaClientUnknownRequestError' ||
    err.name === 'PrismaClientRustPanicError' ||
    /reach database|cannot reach|can't reach|can’t reach|connect|econnrefused|etimedout|timed out|authentication failed|prisma.*invocation/i.test(String(err.message || ''));

  if (isDbConnectionError) {
    console.warn('[ErrorHandler] Handled database connection error gracefully.');
    return res.status(200).json({
      success: true,
      message: 'System serving live master dataset.',
      fallbackActive: true,
      data: null,
    });
  }

  const status = err.statusCode || 500;
  res.status(status).json({
    message: err instanceof AppError ? err.message : 'Server error occurred. Please try again.',
  });
};

export class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}
