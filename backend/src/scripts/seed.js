import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Route from "../models/Route.js";
import Bus from "../models/Bus.js";
import DriverContact from "../models/DriverContact.js";
import Notification from "../models/Notification.js";
import Passenger from "../models/Passenger.js";

dotenv.config({ path: "../../.env" });

const hash = (pw) => bcrypt.hash(pw, 10);

async function seed() {
  await connectDB();
  console.log("Seeding database...");

  await Promise.all([User.deleteMany({}), Route.deleteMany({}), Bus.deleteMany({}), DriverContact.deleteMany({}), Notification.deleteMany({}), Passenger.deleteMany({})]);

  const users = await Promise.all([
    User.create({ rollNumber: "21CS1001", name: "Rahul Sharma", department: "CSE", year: "2nd Year", email: "rahul@hitam.edu.in", phone: "+91 98765 12345", role: "STUDENT", assignedRouteId: "R1", transportFeePaid: true, passwordHash: await hash("hitam123"), avatarInitial: "R" }),
    User.create({ rollNumber: "21ECE045", name: "Priya Verma", department: "ECE", year: "3rd Year", email: "priya@hitam.edu.in", phone: "+91 87654 23456", role: "STUDENT", assignedRouteId: "R2", transportFeePaid: true, passwordHash: await hash("hitam123"), avatarInitial: "P" }),
    User.create({ rollNumber: "DRV12345", name: "Suresh Kumar", department: "", year: "", email: "suresh@hitam.edu.in", phone: "+91 98765 43210", role: "DRIVER", assignedRouteId: "R1", assignedBusNumber: "TS 09 AB 1234", licenseNo: "TS2024001", experience: "5 Years", passwordHash: await hash("hitam123"), avatarInitial: "S" }),
    User.create({ rollNumber: "ADMIN001", name: "Admin User", department: "", year: "", email: "admin@hitam.edu.in", phone: "+91 40 1234 5678", role: "ADMIN", passwordHash: await hash("hitam123"), avatarInitial: "A" }),
  ]);

  await Route.insertMany([
    { id: "R1", name: "Route R1 - LB Nagar to HITAM Campus", busNumber: "TS 09 AB 1234", pickupPoint: "LB Nagar Metro Gate 2", reportingTime: "07:15 AM", feeAmount: 12000, totalSeats: 40, bookedSeats: 28, stops: ["LB Nagar Metro", "Dilsukhnagar", "Malakpet", "Bowenpally", "Medchal", "HITAM Campus"] },
    { id: "R2", name: "Route R2 - Kukatpally to HITAM Campus", busNumber: "TS 09 AB 5678", pickupPoint: "Kukatpally Housing Board", reportingTime: "07:30 AM", feeAmount: 11500, totalSeats: 40, bookedSeats: 31, stops: ["Kukatpally KPHB", "Miyapur X Road", "Nizampet X Road", "Bachupally", "Gandimaisamma", "HITAM Campus"] },
    { id: "R3", name: "Route R3 - Uppal to HITAM Campus", busNumber: "TS 09 AB 9012", pickupPoint: "Uppal Ring Road", reportingTime: "07:10 AM", feeAmount: 12500, totalSeats: 40, bookedSeats: 22, stops: ["Uppal Ring Road", "Tarnaka Metro", "Secunderabad Station", "Suchitra Circle", "HITAM Campus"] },
    { id: "R4", name: "Route R4 - Mehdipatnam to HITAM Campus", busNumber: "TS 09 AB 3456", pickupPoint: "Mehdipatnam Pillar 45", reportingTime: "07:05 AM", feeAmount: 13000, totalSeats: 40, bookedSeats: 35, stops: ["Mehdipatnam Bus Stop", "Panjagutta Circle", "Begumpet Airport", "Balanagar", "Jeedimetla", "HITAM Campus"] },
    { id: "R5", name: "Route R5 - ECIL to HITAM Campus", busNumber: "TS 09 AB 7890", pickupPoint: "ECIL Bus Depot", reportingTime: "07:20 AM", feeAmount: 11000, totalSeats: 40, bookedSeats: 25, stops: ["ECIL X Road", "AS Rao Nagar", "Sainikpuri", "Alwal", "Suchitra Junction", "HITAM Campus"] },
    { id: "R6", name: "Route R6 - Gachibowli to HITAM Campus", busNumber: "TS 09 AB 4321", pickupPoint: "Gachibowli Flyover", reportingTime: "07:00 AM", feeAmount: 13500, totalSeats: 40, bookedSeats: 18, stops: ["Gachibowli ORR", "Hitech City Metro", "Madhapur Police Station", "Kondapur", "HITAM Campus"] },
  ]);

  await Bus.insertMany([
    { busNumber: "TS 09 AB 1234", model: "TATA Starbus", capacity: 40, driverName: "Suresh Kumar", routeId: "R1", routeName: "Route R1", status: "ACTIVE", fuelLevel: 75 },
    { busNumber: "TS 09 AB 5678", model: "Ashok Leyland Viking", capacity: 40, driverName: "Ramesh Singh", routeId: "R2", routeName: "Route R2", status: "ACTIVE", fuelLevel: 60 },
  ]);

  await DriverContact.insertMany([
    { name: "Suresh Kumar", role: "Bus Driver", phone: "+91 98765 43210", busNumber: "TS 09 AB 1234", subtitle: "Route R1 Lead Driver" },
    { name: "Anil Verma", role: "Bus In-charge", phone: "+91 91234 56789", busNumber: "TS 09 AB 1234", subtitle: "Faculty Transport Coordinator" },
    { name: "Office Helpline", role: "Transport Office", phone: "+91 40 1234 5678", busNumber: "HITAM Campus", subtitle: "Available 6:00 AM - 10:00 PM" },
    { name: "24x7 Emergency Support", role: "HITAM Security", phone: "+91 90000 11222", busNumber: "All Routes", subtitle: "Emergency Hotline" },
  ]);

  await Notification.insertMany([
    { title: "Campus Transport Notice", message: "All evening return buses will leave campus at 04:45 PM starting next week.", time: "Just now", isRead: false, type: "ANNOUNCEMENT", targetRole: "ALL" },
    { title: "Seat Confirmed", message: "Your seat #11 for Route R1 is confirmed.", time: "09:00 AM", isRead: false, type: "SEAT", targetRole: "STUDENT", userId: "21CS1001" },
    { title: "Transport Fee Receipt", message: "Payment of Rs.12,000 received successfully.", time: "Yesterday", isRead: false, type: "PAYMENT", targetRole: "STUDENT", userId: "21CS1001" },
  ]);

  await Passenger.insertMany([
    { rollNumber: "21CS1001", name: "Rahul Sharma", dept: "CSE", seatNo: 11, pickup: "Main Gate", feePaid: true, boarded: false, routeId: "R1", tripDate: "07 Aug 2026", status: "PENDING" },
    { rollNumber: "21ECE045", name: "Priya Verma", dept: "ECE", seatNo: 5, pickup: "City Center", feePaid: true, boarded: false, routeId: "R1", tripDate: "07 Aug 2026", status: "PENDING" },
  ]);

  console.log("Database seeded successfully!");
  console.log("Test credentials:");
  console.log("  Student:  21CS1001 / hitam123");
  console.log("  Driver:   DRV12345 / hitam123");
  console.log("  Admin:    ADMIN001 / hitam123");
  await mongoose.disconnect();
}

seed().catch(console.error);
