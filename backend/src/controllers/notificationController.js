import prisma from '../lib/prisma.js';
import { serialize, serializeMany } from '../lib/serialize.js';

const notifScope = (req) => ({
  OR: [
    { targetRole: 'ALL' },
    { targetRole: req.user.role },
    { userId: req.user.rollNumber },
  ],
});

export const getNotifications = async (req, res, next) => {
  try {
    const { type } = req.query;
    const where = notifScope(req);
    if (type && type !== 'ALL') where.type = type.toUpperCase();
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(serializeMany(notifications));
  } catch (err) {
    next(err);
  }
};

export const markAllRead = async (req, res, next) => {
  try {
    await prisma.notification.updateMany({ where: notifScope(req), data: { isRead: true } });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

export const createNotification = async (req, res, next) => {
  try {
    const { title, message, type, targetRole, userId } = req.body;
    const notif = await prisma.notification.create({
      data: {
        title: String(title),
        message: String(message),
        type: type || 'ANNOUNCEMENT',
        targetRole: targetRole || 'ALL',
        userId: userId || null,
        time: 'Just Now',
      },
    });
    res.status(201).json(serialize(notif));
  } catch (err) {
    next(err);
  }
};
