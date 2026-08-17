import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { signToken } from '../config/jwt.js';
import { AppError } from '../middlewares/errorHandler.js';
import { withPaymentStatus } from '../lib/paymentStatus.js';

export const login = async (req, res, next) => {
  try {
    const { rollNumber, password } = req.body;
    if (!rollNumber || !password) throw new AppError('Roll number and password are required', 400);

    // Try exact match first, then uppercase
    const trimmed = rollNumber.trim();
    let user = await prisma.user.findUnique({ where: { rollNumber: trimmed } });
    if (!user) user = await prisma.user.findFirst({ where: { rollNumber: trimmed.toUpperCase() } });
    if (!user) throw new AppError('Invalid credentials', 401);

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw new AppError('Invalid credentials', 401);

    const token = signToken({ rollNumber: user.rollNumber, role: user.role, id: user.id });

    const safe = withPaymentStatus(user);
    const { passwordHash, ...userObj } = safe;
    res.json({
      token,
      user: {
        _id: userObj.id,
        rollNumber: userObj.rollNumber,
        name: userObj.name,
        department: userObj.department,
        year: userObj.year,
        email: userObj.email,
        phone: userObj.phone,
        role: userObj.role,
        assignedRouteId: userObj.assignedRouteId,
        boardingPoint: userObj.boardingPoint,
        feeAmount: userObj.feeAmount,
        feePaidAmount: userObj.feePaidAmount,
        feeBalance: userObj.feeBalance,
        paymentStatus: userObj.paymentStatus,
        transportFeePaid: userObj.transportFeePaid,
        assignedBusNumber: userObj.assignedBusNumber,
        licenseNo: userObj.licenseNo,
        address: userObj.address,
        experience: userObj.experience,
        emergencyContact: userObj.emergencyContact,
        avatarInitial: userObj.avatarInitial,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res) => {
  // Re-read the fresh record so fee fields and derived status are current.
  const user = await prisma.user.findFirst({ where: { rollNumber: req.user.rollNumber } });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ user: withPaymentStatus(user) });
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findFirst({ where: { rollNumber: req.user.rollNumber } });
    if (!user) throw new AppError('User not found', 404);

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) throw new AppError('Current password is incorrect', 400);

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};
