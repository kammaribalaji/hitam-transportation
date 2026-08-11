import Notification from '../models/Notification.js';

export const getNotifications = async (req, res, next) => {
  try {
    const { type } = req.query;
    const filter = {
      $or: [
        { targetRole: 'ALL' },
        { targetRole: req.user.role },
        { userId: req.user.rollNumber },
      ],
    };
    if (type && type !== 'ALL') filter.type = type.toUpperCase();
    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
    res.json(notifications);
  } catch (err) {
    next(err);
  }
};

export const markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      {
        $or: [
          { targetRole: 'ALL' },
          { targetRole: req.user.role },
          { userId: req.user.rollNumber },
        ],
      },
      { isRead: true }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

export const createNotification = async (req, res, next) => {
  try {
    const { title, message, type, targetRole, userId } = req.body;
    const notif = await Notification.create({
      title,
      message,
      type: type || 'ANNOUNCEMENT',
      targetRole: targetRole || 'ALL',
      userId: userId || null,
      time: 'Just Now',
    });
    res.status(201).json(notif);
  } catch (err) {
    next(err);
  }
};
