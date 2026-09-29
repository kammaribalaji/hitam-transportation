import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export let masterDatabase = {
  master_students: [],
  passengers: [],
  routes: [],
  buses: [],
};

export const masterStudentsMap = new Map();
export const masterPassengersMap = new Map();
export const masterRouteMap = new Map();
export const masterBusMap = new Map();

try {
  const candidatePaths = [
    new URL('../data/master_transport_database.json', import.meta.url),
    path.resolve(__dirname, '../data/master_transport_database.json'),
    path.resolve(process.cwd(), 'backend/src/data/master_transport_database.json'),
    path.resolve(process.cwd(), 'src/data/master_transport_database.json'),
    path.resolve(process.cwd(), 'master_transport_database.json'),
    path.resolve("C:/PROJECT'S/HITAM TRANSPORT/master_transport_database.json"),
    path.resolve("C:/PROJECT'S/HITAM TRANSPORT/hitam-transport/backend/src/data/master_transport_database.json"),
  ];

  for (const candidate of candidatePaths) {
    try {
      const filePath = candidate instanceof URL ? fileURLToPath(candidate) : candidate;
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.master_students || parsed.routes)) {
          masterDatabase = parsed;
          break;
        }
      }
    } catch {}
  }

  // Populate maps for O(1) instant lookup
  if (Array.isArray(masterDatabase.master_students)) {
    for (const s of masterDatabase.master_students) {
      if (s.rollNumber) {
        masterStudentsMap.set(String(s.rollNumber).toUpperCase().trim(), s);
      }
    }
  }

  if (Array.isArray(masterDatabase.passengers)) {
    for (const p of masterDatabase.passengers) {
      if (p.rollNumber) {
        masterPassengersMap.set(String(p.rollNumber).toUpperCase().trim(), p);
        if (!masterStudentsMap.has(String(p.rollNumber).toUpperCase().trim())) {
          masterStudentsMap.set(String(p.rollNumber).toUpperCase().trim(), p);
        }
      }
    }
  }

  if (Array.isArray(masterDatabase.routes)) {
    for (const r of masterDatabase.routes) {
      masterRouteMap.set(String(r.id), r);
    }
  }

  if (Array.isArray(masterDatabase.buses)) {
    for (const b of masterDatabase.buses) {
      if (b.id) masterBusMap.set(String(b.id), b);
      if (b.busNumber) masterBusMap.set(String(b.busNumber).toUpperCase().trim(), b);
    }
  }

  console.log(`[MasterDB] Successfully loaded ${masterStudentsMap.size} students, ${masterRouteMap.size} routes into memory.`);
} catch (e) {
  console.warn('[MasterDB] Initialization warning:', e.message);
}

export const masterStudents = masterDatabase.master_students || [];
export const masterPassengers = masterDatabase.passengers || [];
export const masterRoutes = masterDatabase.routes || [];
export const masterBuses = masterDatabase.buses || [];
