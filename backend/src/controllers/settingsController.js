import prisma from '../lib/prisma.js';
import { serialize } from '../lib/serialize.js';

const SETTINGS_FIELDS = {
  collegeName: (v) => String(v),
  transportIncharge: (v) => String(v),
  email: (v) => String(v),
  phone: (v) => String(v),
  address: (v) => String(v),
  dateFormat: (v) => String(v),
  currency: (v) => String(v),
};

const buildSettingsData = (body) => {
  const data = {};
  for (const [key, coerce] of Object.entries(SETTINGS_FIELDS)) {
    if (body[key] !== undefined) data[key] = coerce(body[key]);
  }
  return data;
};

export const getSettings = async (req, res, next) => {
  try {
    let settings = await prisma.settings.findFirst();
    if (!settings) settings = await prisma.settings.create({ data: {} });
    res.json(serialize(settings));
  } catch (err) {
    next(err);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const data = buildSettingsData(req.body);
    let settings = await prisma.settings.findFirst();
    if (!settings) {
      settings = await prisma.settings.create({ data });
    } else {
      settings = await prisma.settings.update({ where: { id: settings.id }, data });
    }
    res.json(serialize(settings));
  } catch (err) {
    next(err);
  }
};
