import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { signToken } from '../config/jwt.js';
import { AppError } from '../middlewares/errorHandler.js';

// Demo users for auto-seeding when DB is empty
const DEMO_USERS = [
  { rollNumber: '21CS1001', name: 'Rahul Sharma', department: 'CSE', year: '2nd Year', email: 'rahul@hitam.edu.in', phone: '+91 98765 12345', role: 'STUDENT', assignedRouteId: 'R1', transportFeePaid: true, avatarInitial: 'R', password: 'hitam123' },
  { rollNumber: '21ECE045', name: 'Priya Verma', department: 'ECE', year: '3rd Year', email: 'priya@hitam.edu.in', phone: '+91 87654 23456', role: 'STUDENT', assignedRouteId: 'R2', transportFeePaid: true, avatarInitial: 'P', password: 'hitam123' },
  { rollNumber: 'DRV12345', name: 'Suresh Kumar', department: '', year: '', email: 'suresh@hitam.edu.in', phone: '+91 98765 43210', role: 'DRIVER', assignedRouteId: 'R1', transportFeePaid: false, assignedBusNumber: 'TS 09 AB 1234', licenseNo: 'TS2024001', experience: '5 Years', avatarInitial: 'S', password: 'hitam123' },
  { rollNumber: 'ADMIN001', name: 'Admin User', department: '', year: '', email: 'admin@hitam.edu.in', phone: '+91 40 1234 5678', role: 'ADMIN', transportFeePaid: false, avatarInitial: 'A', password: 'hitam123' },
];

async function ensureDemoUsers() {
  const count = await User.countDocuments();
  if (count > 0) return;
  console.log('No users found — seeding demo users...');
  for (const u of DEMO_USERS) {
    const { password, ...rest } = u;
    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({ ...rest, passwordHash }).catch(() => {});
  }
  console.log('Demo users seeded: 21CS1001 / DRV12345 / ADMIN001 — all password: hitam123');
}

export const login = async (req, res, next) => {
  try {
    const { rollNumber, password } = req.body;
    if (!rollNumber || !password) throw new AppError('Roll number and password are required', 400);

    // Auto-seed demo users if DB is empty
    await ensureDemoUsers();

    // Try exact match first, then uppercase
    let user = await User.findOne({ rollNumber: rollNumber.trim() });
    if (!user) user = await User.findOne({ rollNumber: rollNumber.trim().toUpperCase() });
    if (!user) throw new AppError('Invalid credentials', 401);

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw new AppError('Invalid credentials', 401);

    const token = signToken({ rollNumber: user.rollNumber, role: user.role, id: user._id });

    res.json({
      token,
      user: {
        _id: user._id,
        rollNumber: user.rollNumber,
        name: user.name,
        department: user.department,
        year: user.year,
        email: user.email,
        phone: user.phone,
        role: user.role,
        assignedRouteId: user.assignedRouteId,
        transportFeePaid: user.transportFeePaid,
        assignedBusNumber: user.assignedBusNumber,
        licenseNo: user.licenseNo,
        address: user.address,
        experience: user.experience,
        emergencyContact: user.emergencyContact,
        avatarInitial: user.avatarInitial,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res) => {
  res.json({ user: req.user });
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findOne({ rollNumber: req.user.rollNumber });
    if (!user) throw new AppError('User not found', 404);

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) throw new AppError('Current password is incorrect', 400);

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};
