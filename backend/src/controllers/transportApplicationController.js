import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { serialize, serializeMany } from '../lib/serialize.js';
import { verifyToken } from '../config/jwt.js';

/**
 * Public metadata: provides actual routes and valid boarding stops from PostgreSQL
 * so the public application form can populate dropdowns dynamically without hardcoding.
 */
export const getPublicRoutesAndStops = async (req, res, next) => {
  try {
    const routes = await prisma.route.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        busNumber: true,
        pickupPoint: true,
        reportingTime: true,
        feeAmount: true,
        stops: true,
        routeStops: {
          select: {
            id: true,
            name: true,
            stopTime: true,
            stopOrder: true,
          },
          orderBy: { stopOrder: 'asc' },
        },
      },
      orderBy: { id: 'asc' },
    });

    const formatted = routes.map((r) => {
      // Prefer RouteStop table records; fallback to stops array
      const stopList =
        r.routeStops && r.routeStops.length > 0
          ? r.routeStops.map((s) => ({ name: s.name, time: s.stopTime, order: s.stopOrder }))
          : (r.stops || []).map((name, idx) => ({ name, time: r.reportingTime || '', order: idx + 1 }));

      return {
        id: r.id,
        name: r.name,
        busNumber: r.busNumber,
        reportingTime: r.reportingTime,
        feeAmount: r.feeAmount,
        stops: stopList,
      };
    });

    res.json({ routes: formatted });
  } catch (err) {
    next(err);
  }
};

/**
 * Public application submission.
 * Validates all fields against PostgreSQL, checks duplicates, generates reference.
 */
export const submitApplication = async (req, res, next) => {
  try {
    const {
      fullName,
      rollNumber,
      branch,
      academicYear,
      mobileNumber,
      email = '',
      address,
      photoUrl = '',
      requestedRouteId,
      requestedBoardingPoint,
      guardianName = '',
      guardianMobile,
      declarationAccepted,
      rulesAcknowledged,
    } = req.body;

    // Strict validation
    if (!fullName || !fullName.trim()) throw new AppError('Full Name is required', 400);
    if (!rollNumber || !rollNumber.trim()) throw new AppError('Roll Number is required', 400);
    if (!branch || !branch.trim()) throw new AppError('Branch is required', 400);
    if (!academicYear || !academicYear.trim()) throw new AppError('Academic Year is required', 400);
    if (!mobileNumber || !mobileNumber.trim()) throw new AppError('Student Mobile Number is required', 400);
    if (!guardianMobile || !guardianMobile.trim()) throw new AppError("Guardian's Mobile Number is required", 400);
    if (!address || !address.trim()) throw new AppError('Residential Address is required', 400);
    if (!requestedRouteId || !requestedRouteId.trim()) throw new AppError('Requested Bus Route is required', 400);
    const cleanBoarding = typeof requestedBoardingPoint === 'object' && requestedBoardingPoint?.name
      ? String(requestedBoardingPoint.name).trim()
      : String(requestedBoardingPoint || '').trim();

    if (!cleanBoarding) {
      throw new AppError('Requested Boarding Point is required', 400);
    }
    if (!declarationAccepted) {
      throw new AppError('You must accept the student declaration to proceed', 400);
    }

    let cleanRoll = String(rollNumber).trim().toUpperCase();

    // Security check: If authenticated session is present, bind submission to authenticated student
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const decoded = verifyToken(authHeader.split(' ')[1]);
        if (decoded?.rollNumber && decoded?.role === 'STUDENT') {
          cleanRoll = String(decoded.rollNumber).trim().toUpperCase();
        }
      } catch {}
    }

    const cleanRouteId = String(requestedRouteId).trim();

    // Verify route in PostgreSQL
    const route = await prisma.route.findUnique({
      where: { id: cleanRouteId },
      include: { routeStops: true },
    });
    if (!route) {
      throw new AppError(`Selected Route ${cleanRouteId} does not exist`, 400);
    }

    // Verify boarding stop belongs to the route
    const validStopNames = [
      ...(route.routeStops || []).map((s) => s.name.toLowerCase().trim()),
      ...(route.stops || []).map((s) => s.toLowerCase().trim()),
    ];
    const requestedLower = cleanBoarding.toLowerCase();
    const isStopValid = validStopNames.some(
      (s) => s === requestedLower || s.includes(requestedLower) || requestedLower.includes(s)
    );

    if (!isStopValid && validStopNames.length > 0) {
      throw new AppError(
        `Boarding point "${cleanBoarding}" is not valid for Route ${cleanRouteId}. Please pick a valid stop from the route.`,
        400
      );
    }

    if (!/^[A-Z0-9]+$/i.test(cleanRoll)) {
      throw new AppError('Roll number must contain alphanumeric characters only.', 400);
    }

    const cleanMobile = String(mobileNumber).trim().replace(/[^0-9]/g, '');
    if (cleanMobile.length < 10 || cleanMobile.length > 12) {
      throw new AppError('Student mobile number must be a valid 10-digit phone number.', 400);
    }

    const cleanGuardianMobile = String(guardianMobile).trim().replace(/[^0-9]/g, '');
    if (cleanGuardianMobile.length < 10 || cleanGuardianMobile.length > 12) {
      throw new AppError("Guardian's mobile number must be a valid 10-digit phone number.", 400);
    }

    // Check existing student database
    const existingUser = await prisma.user.findFirst({
      where: { rollNumber: { equals: cleanRoll, mode: 'insensitive' } },
    });
    if (existingUser && existingUser.transportFeePaid) {
      throw new AppError(
        `Roll number ${cleanRoll} already has an active, paid college transport registration. Duplicate applications are not permitted.`,
        409
      );
    }

    // Prevent duplicate active applications
    const existingActive = await prisma.transportApplication.findFirst({
      where: {
        rollNumber: cleanRoll,
        status: { in: ['PENDING', 'UNDER_REVIEW', 'APPROVED'] },
      },
    });

    if (existingActive) {
      throw new AppError(
        `An active transport application (${existingActive.applicationNo}) is already on file with status: ${existingActive.status}. Duplicate submissions are not allowed.`,
        409
      );
    }

    // Generate unique reference ID
    const yearCode = new Date().getFullYear();
    const randPart = Math.floor(10000 + Math.random() * 90000);
    const applicationNo = `APP-${yearCode}-${randPart}`;

    const newApp = await prisma.transportApplication.create({
      data: {
        applicationNo,
        fullName: fullName.trim(),
        rollNumber: cleanRoll,
        branch: branch.trim(),
        academicYear: academicYear.trim(),
        mobileNumber: mobileNumber.trim(),
        email: email ? email.trim() : `${cleanRoll.toLowerCase()}@hitam.edu.in`,
        address: address.trim(),
        photoUrl: photoUrl.trim(),
        requestedRouteId: cleanRouteId,
        requestedBoardingPoint: cleanBoarding,
        transportSession: `${yearCode}-${yearCode + 1}`,
        guardianName: guardianName ? guardianName.trim() : '',
        guardianMobile: guardianMobile.trim(),
        declarationAccepted: Boolean(declarationAccepted),
        rulesAcknowledged: Boolean(rulesAcknowledged),
        status: 'PENDING',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Transport application submitted successfully.',
      application: serialize(newApp),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Public tracking endpoint for applicant reference.
 */
export const getApplicationStatusPublic = async (req, res, next) => {
  try {
    const { applicationNo } = req.params;
    const { rollNumber } = req.query;

    if (!applicationNo) throw new AppError('Application number is required', 400);

    const where = { applicationNo: String(applicationNo).trim() };
    if (rollNumber) {
      where.rollNumber = String(rollNumber).trim().toUpperCase();
    }

    const application = await prisma.transportApplication.findFirst({
      where,
      select: {
        applicationNo: true,
        fullName: true,
        rollNumber: true,
        branch: true,
        academicYear: true,
        requestedRouteId: true,
        requestedBoardingPoint: true,
        transportSession: true,
        status: true,
        accountActivated: true,
        rejectionReason: true,
        remarks: true,
        createdAt: true,
        reviewedAt: true,
      },
    });

    if (!application) {
      throw new AppError('No application found with the provided details.', 404);
    }

    res.json({ application: serialize(application) });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Get summary statistics for all applications.
 */
export const getApplicationsSummary = async (req, res, next) => {
  try {
    const [all, pending, underReview, approved, rejected, moreInfo] = await Promise.all([
      prisma.transportApplication.count(),
      prisma.transportApplication.count({ where: { status: 'PENDING' } }),
      prisma.transportApplication.count({ where: { status: 'UNDER_REVIEW' } }),
      prisma.transportApplication.count({ where: { status: 'APPROVED' } }),
      prisma.transportApplication.count({ where: { status: 'REJECTED' } }),
      prisma.transportApplication.count({ where: { status: 'MORE_INFO_REQUIRED' } }),
    ]);

    const summary = {
      all,
      pending,
      underReview,
      approved,
      rejected,
      moreInfoRequired: moreInfo,
    };

    res.json({
      summary,
      counts: summary,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: List applications with pagination and filters.
 */
export const getAllApplications = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const where = {};

    if (status && status !== 'ALL') {
      where.status = status.toUpperCase();
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { applicationNo: { contains: q, mode: 'insensitive' } },
        { fullName: { contains: q, mode: 'insensitive' } },
        { rollNumber: { contains: q, mode: 'insensitive' } },
        { branch: { contains: q, mode: 'insensitive' } },
        { requestedBoardingPoint: { contains: q, mode: 'insensitive' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * pageSize;

    const [applications, total] = await Promise.all([
      prisma.transportApplication.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.transportApplication.count({ where }),
    ]);

    res.json({
      applications: serializeMany(applications),
      total,
      page: pageNum,
      pages: Math.ceil(total / pageSize) || 1,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Get single application details.
 */
export const getApplicationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const application = await prisma.transportApplication.findFirst({
      where: {
        OR: [{ id: id }, { applicationNo: id }],
      },
    });

    if (!application) throw new AppError('Application not found', 404);

    // Also check if student account already exists in PostgreSQL
    const existingUser = await prisma.user.findFirst({
      where: { rollNumber: application.rollNumber },
      select: {
        id: true,
        rollNumber: true,
        name: true,
        role: true,
        status: true,
        transportFeePaid: true,
        assignedRouteId: true,
        boardingPoint: true,
      },
    });

    res.json({
      application: serialize(application),
      existingUser: existingUser ? serialize(existingUser) : null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Update review state (mark under review or request more info).
 */
export const updateApplicationReviewStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, remarks = '' } = req.body;

    const validStatuses = ['UNDER_REVIEW', 'MORE_INFO_REQUIRED'];
    if (!validStatuses.includes(status)) {
      throw new AppError(`Invalid review status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const existing = await prisma.transportApplication.findUnique({ where: { id } });
    if (!existing) throw new AppError('Application not found', 404);

    const updated = await prisma.transportApplication.update({
      where: { id },
      data: {
        status,
        remarks: remarks.trim(),
        reviewedByAdminId: req.user.rollNumber,
        reviewedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: `Application marked as ${status}.`,
      application: serialize(updated),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Approve transport application.
 * Note: Approval alone does not activate the account.
 */
export const approveApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks = '' } = req.body;

    const application = await prisma.transportApplication.findUnique({ where: { id } });
    if (!application) throw new AppError('Application not found', 404);

    if (application.status === 'APPROVED') {
      throw new AppError('Application is already approved.', 400);
    }

    const updated = await prisma.transportApplication.update({
      where: { id },
      data: {
        status: 'APPROVED',
        remarks: remarks ? remarks.trim() : application.remarks,
        reviewedByAdminId: req.user.rollNumber,
        reviewedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Application approved successfully. Student is now eligible for account activation.',
      application: serialize(updated),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Reject application with reason.
 */
export const rejectApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rejectionReason, remarks = '' } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      throw new AppError('A rejection reason must be provided.', 400);
    }

    const application = await prisma.transportApplication.findUnique({ where: { id } });
    if (!application) throw new AppError('Application not found', 404);

    const updated = await prisma.transportApplication.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: rejectionReason.trim(),
        remarks: remarks ? remarks.trim() : application.remarks,
        reviewedByAdminId: req.user.rollNumber,
        reviewedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Application rejected.',
      application: serialize(updated),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Manual account creation or activation after approval.
 * Safe transactional operation.
 */
export const activateApplicantAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { defaultPassword = 'hitam123' } = req.body;

    const application = await prisma.transportApplication.findUnique({ where: { id } });
    if (!application) throw new AppError('Application not found', 404);

    if (application.status !== 'APPROVED') {
      throw new AppError(
        `Cannot activate account: Application status is currently ${application.status}. It must be APPROVED first.`,
        400
      );
    }

    // Look up route fee in PostgreSQL
    const route = await prisma.route.findUnique({
      where: { id: application.requestedRouteId },
    });
    const feeAmount = route?.feeAmount || 12000;

    const result = await prisma.$transaction(async (tx) => {
      // Check if user already exists in PostgreSQL
      let user = await tx.user.findFirst({
        where: { rollNumber: application.rollNumber },
      });

      if (user) {
        // Reuse existing record and activate it
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            name: application.fullName,
            status: 'ACTIVE',
            assignedRouteId: application.requestedRouteId,
            boardingPoint: application.requestedBoardingPoint,
            department: application.branch || user.department,
            year: application.academicYear || user.year,
            phone: application.mobileNumber || user.phone,
            address: application.address || user.address,
            feeAmount: user.feeAmount > 0 ? user.feeAmount : feeAmount,
            feeBalance: Math.max(0, (user.feeAmount > 0 ? user.feeAmount : feeAmount) - (user.feePaidAmount || 0)),
          },
        });
      } else {
        // Create new user account with secure password hashing
        const passwordHash = await bcrypt.hash(defaultPassword, 10);
        user = await tx.user.create({
          data: {
            rollNumber: application.rollNumber,
            name: application.fullName,
            email: application.email || `${application.rollNumber.toLowerCase()}@hitam.edu.in`,
            phone: application.mobileNumber,
            address: application.address,
            role: 'STUDENT',
            department: application.branch,
            year: application.academicYear,
            assignedRouteId: application.requestedRouteId,
            boardingPoint: application.requestedBoardingPoint,
            feeAmount,
            feePaidAmount: 0,
            feeBalance: feeAmount,
            transportFeePaid: false, // Strict: NOT marked paid automatically!
            status: 'ACTIVE',
            passwordHash,
            avatarInitial: application.fullName.charAt(0).toUpperCase() || 'S',
          },
        });
      }

      // Mark application as accountActivated
      const updatedApp = await tx.transportApplication.update({
        where: { id: application.id },
        data: { accountActivated: true },
      });

      return { user, application: updatedApp };
    }, { timeout: 20000, maxWait: 10000 });

    const { passwordHash: _ph, ...safeUser } = result.user;
    res.json({
      success: true,
      message: `Account for ${application.rollNumber} activated successfully. Student can now log in.`,
      user: serialize(safeUser),
      application: serialize(result.application),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Authenticated Student: Return authoritative application status directly from PostgreSQL
 * Distinguishes between: NOT_SUBMITTED, PENDING, APPROVED, REJECTED
 */
export const getMyApplicationStatus = async (req, res, next) => {
  try {
    const roll = String(req.user?.rollNumber || '').trim().toUpperCase();
    if (!roll) throw new AppError('Unauthenticated session', 401);

    const user = await prisma.user.findFirst({
      where: { rollNumber: { equals: roll, mode: 'insensitive' } },
    });

    const application = await prisma.transportApplication.findFirst({
      where: { rollNumber: { equals: roll, mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
    });

    const isPaid = Boolean(
      (user?.transportFeePaid && (user?.feeBalance == null || user?.feeBalance <= 0)) ||
      (user?.feePaidAmount > 0 && user?.feeBalance <= 0)
    );

    let status = 'NOT_SUBMITTED';
    let isApproved = false;
    let hasApplied = false;

    if (application) {
      hasApplied = true;
      status = application.status; // 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'
      isApproved = application.status === 'APPROVED' && Boolean(application.accountActivated);
    } else if (isPaid) {
      status = 'APPROVED';
      isApproved = true;
    }

    res.json({
      success: true,
      status, // 'NOT_SUBMITTED' | 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'
      isApproved,
      isPaid,
      hasApplied,
      accountActivated: Boolean(application?.accountActivated || user?.status?.toUpperCase() === 'ACTIVE'),
      application: application ? serialize(application) : null,
      user: user ? {
        rollNumber: user.rollNumber,
        name: user.name,
        department: user.department,
        year: user.year,
        email: user.email,
        phone: user.phone,
        address: user.address,
        transportFeePaid: isPaid,
      } : null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Authenticated Student: View own transport applications list
 */
export const getMyApplication = async (req, res, next) => {
  try {
    const roll = String(req.user?.rollNumber || '').trim().toUpperCase();
    if (!roll) throw new AppError('Unauthenticated session', 401);

    const user = await prisma.user.findFirst({
      where: { rollNumber: { equals: roll, mode: 'insensitive' } },
    });

    const applications = await prisma.transportApplication.findMany({
      where: { rollNumber: { equals: roll, mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
    });

    const isPaid = Boolean(user?.transportFeePaid);
    const hasApplied = applications.length > 0;
    const status = hasApplied ? applications[0].status : (isPaid ? 'APPROVED' : 'NOT_SUBMITTED');

    res.json({
      success: true,
      hasApplied,
      status,
      applications: serializeMany(applications),
      latestApplication: hasApplied ? serialize(applications[0]) : null,
    });
  } catch (err) {
    next(err);
  }
};
