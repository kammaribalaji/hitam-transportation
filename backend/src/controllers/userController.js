import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { AppError } from '../middlewares/errorHandler.js';

export const getAllUsers = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role) filter.role = role.toUpperCase();
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(filter).select('-passwordHash').skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);
    res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    next(err);
  }
};

export const getUserByRoll = async (req, res, next) => {
  try {
    const user = await User.findOne({ rollNumber: req.params.rollNumber.toUpperCase() }).select('-passwordHash');
    if (!user) throw new AppError('User not found', 404);
    res.json(user);
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { rollNumber, name, department, year, email, phone, role, password, assignedRouteId, licenseNo, address, experience, emergencyContact, assignedBusNumber } = req.body;
    const exists = await User.findOne({ rollNumber: rollNumber.trim().toUpperCase() });
    if (exists) throw new AppError('Roll number already exists', 400);

    const passwordHash = await bcrypt.hash(password || 'hitam123', 10);
    const user = await User.create({
      rollNumber: rollNumber.trim().toUpperCase(),
      name,
      department: department || '',
      year: year || '',
      email: email || '',
      phone: phone || '',
      role: role || 'STUDENT',
      assignedRouteId: assignedRouteId || 'R1',
      passwordHash,
      licenseNo: licenseNo || '',
      address: address || '',
      experience: experience || '',
      emergencyContact: emergencyContact || '',
      assignedBusNumber: assignedBusNumber || '',
      avatarInitial: name ? name.charAt(0).toUpperCase() : 'U',
    });

    const { passwordHash: _, ...userObj } = user.toObject();
    res.status(201).json(userObj);
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { rollNumber } = req.params;
    const updates = { ...req.body };
    delete updates.passwordHash;
    delete updates.password;

    if (updates.name) updates.avatarInitial = updates.name.charAt(0).toUpperCase();

    const user = await User.findOneAndUpdate(
      { rollNumber: rollNumber.toUpperCase() },
      updates,
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) throw new AppError('User not found', 404);
    res.json(user);
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findOneAndDelete({ rollNumber: req.params.rollNumber.toUpperCase() });
    if (!user) throw new AppError('User not found', 404);
    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, email, phone, address, department, year } = req.body;
    const updates = { name, email, phone, address, department, year };
    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);
    if (updates.name) updates.avatarInitial = updates.name.charAt(0).toUpperCase();

    const user = await User.findOneAndUpdate(
      { rollNumber: req.user.rollNumber },
      updates,
      { new: true }
    ).select('-passwordHash');

    res.json(user);
  } catch (err) {
    next(err);
  }
};
