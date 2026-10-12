import prisma from './src/lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'hitam_transport_jwt_secret_2026_production_key';

async function runRoutingScenarioTests() {
  console.log('================================================================');
  console.log('TEST SUITE: STUDENT APPLICATION ROUTING & POSTGRESQL STATE');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message, detail = null) {
    total++;
    if (condition) {
      console.log(`[PASS] Case ${total}: ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] Case ${total}: ${message}`);
      if (detail) console.error('   Detail:', detail);
    }
  }

  const testRollNotApplied = '24E51NOTAP01';
  const testRollPending = '24E51PEN01';
  const testRollRejected = '24E51REJ01';
  const testRollApproved = '24E51APP01';
  const testRollInactive = '24E51INACT01';
  const testRollOther = '24E51OTHER01';

  const testRolls = [
    testRollNotApplied,
    testRollPending,
    testRollRejected,
    testRollApproved,
    testRollInactive,
    testRollOther,
  ];

  async function apiReq(path, method = 'GET', body = null, token = null) {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE_URL}${path}`, opts);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  try {
    // 0. Clean up any previous test records
    await prisma.transportApplication.deleteMany({
      where: { rollNumber: { in: testRolls } }
    });
    await prisma.booking.deleteMany({
      where: { studentRollNumber: { in: testRolls } }
    });
    await prisma.payment.deleteMany({
      where: { studentRollNumber: { in: testRolls } }
    });
    await prisma.user.deleteMany({
      where: { rollNumber: { in: testRolls } }
    });

    const defaultHash = await bcrypt.hash('password123', 10);

    // Seed test users:
    // User 1: Registered student with NO application
    await prisma.user.create({
      data: {
        rollNumber: testRollNotApplied,
        name: 'Vikas Unapplied',
        email: 'vikas@hitam.edu.in',
        phone: '9876543211',
        department: 'CSE',
        year: 'II Year (2nd Year)',
        role: 'STUDENT',
        status: 'ACTIVE',
        transportFeePaid: false,
        passwordHash: defaultHash,
      }
    });

    // User 2: Other student for ownership isolation test
    await prisma.user.create({
      data: {
        rollNumber: testRollOther,
        name: 'Sneha Other',
        email: 'sneha@hitam.edu.in',
        phone: '9876543299',
        department: 'ECE',
        year: 'III Year (3rd Year)',
        role: 'STUDENT',
        status: 'ACTIVE',
        transportFeePaid: false,
        passwordHash: defaultHash,
      }
    });

    // -------------------------------------------------------------------------
    // SCENARIO 1: Registered student with no application -> NOT_SUBMITTED returned
    // Form opens; application-status page is NOT shown; no fake pending data.
    // -------------------------------------------------------------------------
    const loginNotApplied = await apiReq('/auth/login', 'POST', {
      rollNumber: testRollNotApplied,
      password: 'password123',
    });
    const tokenNotApplied = loginNotApplied.data?.token;

    const meNotApplied = await apiReq('/auth/me', 'GET', null, tokenNotApplied);
    const statusNotApplied = await apiReq('/transport-applications/status', 'GET', null, tokenNotApplied);
    const myAppsNotApplied = await apiReq('/transport-applications/my', 'GET', null, tokenNotApplied);

    assert(
      loginNotApplied.status === 200 &&
      loginNotApplied.data?.user?.applicationStatus === 'NOT_SUBMITTED' &&
      loginNotApplied.data?.user?.hasSubmittedApplication === false &&
      loginNotApplied.data?.user?.accessLevel === 'NOT_SUBMITTED' &&
      statusNotApplied.status === 200 &&
      statusNotApplied.data?.status === 'NOT_SUBMITTED' &&
      statusNotApplied.data?.hasApplied === false &&
      statusNotApplied.data?.application === null &&
      myAppsNotApplied.data?.applications?.length === 0,
      'Registered student with no application receives NOT_SUBMITTED and no fake records',
      { loginStatus: loginNotApplied.data?.user?.applicationStatus, statusRes: statusNotApplied.data }
    );

    // -------------------------------------------------------------------------
    // SCENARIO 2: Student fills out and submits the form -> Real PENDING record created
    // -------------------------------------------------------------------------
    const submitRes = await apiReq('/transport-applications', 'POST', {
      fullName: 'Vikas Unapplied',
      rollNumber: testRollNotApplied,
      branch: 'CSE',
      academicYear: 'II Year (2nd Year)',
      mobileNumber: '9876543211',
      guardianName: 'Ramesh Father',
      guardianMobile: '9876543200',
      address: 'Kukatpally, Hyderabad',
      requestedRouteId: '12',
      requestedBoardingPoint: 'SANGAREDDY OLD BUSSTAND',
      declarationAccepted: true,
      rulesAcknowledged: true,
    }, tokenNotApplied);

    const createdAppNo = submitRes.data?.application?.applicationNo;
    assert(
      submitRes.status === 201 &&
      submitRes.data?.application?.status === 'PENDING' &&
      submitRes.data?.application?.rollNumber === testRollNotApplied &&
      Boolean(createdAppNo && createdAppNo.startsWith('APP-')),
      'Student submits form and real PENDING application record is persisted in PostgreSQL',
      submitRes.data
    );

    // -------------------------------------------------------------------------
    // SCENARIO 3: Student refreshes after submission -> Actual PENDING status appears
    // -------------------------------------------------------------------------
    const statusAfterSubmit = await apiReq('/transport-applications/status', 'GET', null, tokenNotApplied);
    const meAfterSubmit = await apiReq('/auth/me', 'GET', null, tokenNotApplied);

    assert(
      statusAfterSubmit.status === 200 &&
      statusAfterSubmit.data?.status === 'PENDING' &&
      statusAfterSubmit.data?.hasApplied === true &&
      statusAfterSubmit.data?.application?.applicationNo === createdAppNo &&
      statusAfterSubmit.data?.application?.requestedBoardingPoint === 'SANGAREDDY OLD BUSSTAND' &&
      meAfterSubmit.data?.user?.applicationStatus === 'PENDING' &&
      meAfterSubmit.data?.user?.accessLevel === 'BLOCKED_PENDING_APPROVAL',
      'Student refresh retrieves real PENDING application reference and details from PostgreSQL',
      statusAfterSubmit.data
    );

    // -------------------------------------------------------------------------
    // SCENARIO 4: Student with a pending application logs in again -> Status page destination
    // -------------------------------------------------------------------------
    const reLoginPending = await apiReq('/auth/login', 'POST', {
      rollNumber: testRollNotApplied,
      password: 'password123',
    });
    const busSearchBlockedPending = await apiReq('/wimb/buses/between?from=Sangareddy&to=HITAM', 'GET', null, reLoginPending.data?.token);

    assert(
      reLoginPending.status === 200 &&
      reLoginPending.data?.user?.applicationStatus === 'PENDING' &&
      reLoginPending.data?.user?.hasSubmittedApplication === true &&
      reLoginPending.data?.user?.isApplicationApproved === false &&
      busSearchBlockedPending.status === 403 &&
      busSearchBlockedPending.data?.code === 'APPLICATION_PENDING',
      'Student with pending application logs in successfully with status PENDING, Find My Bus blocked',
      reLoginPending.data?.user
    );

    // -------------------------------------------------------------------------
    // SCENARIO 5: Student with an approved application and active account -> Find My Bus opens
    // -------------------------------------------------------------------------
    // Admin logs in and approves the application
    const adminLogin = await apiReq('/auth/login', 'POST', { rollNumber: 'ADMIN001', password: 'hitam123' });
    const adminToken = adminLogin.data?.token;

    const appId = submitRes.data?.application?.id;
    const approveRes = await apiReq(`/transport-applications/${appId}/approve`, 'POST', {
      remarks: 'Approved for AY 2026-2027 Route 12',
    }, adminToken);

    // Activate the student account
    const activateRes = await apiReq(`/transport-applications/${appId}/activate-account`, 'POST', {
      defaultPassword: 'password123',
    }, adminToken);

    const reLoginApproved = await apiReq('/auth/login', 'POST', {
      rollNumber: testRollNotApplied,
      password: 'password123',
    });
    const approvedToken = reLoginApproved.data?.token;

    const statusApproved = await apiReq('/transport-applications/status', 'GET', null, approvedToken);
    const busSearchApproved = await apiReq('/wimb/buses/between?from=Sangareddy&to=HITAM', 'GET', null, approvedToken);

    const busList = Array.isArray(busSearchApproved.data)
      ? busSearchApproved.data
      : (busSearchApproved.data?.buses || []);

    assert(
      approveRes.status === 200 &&
      activateRes.status === 200 &&
      statusApproved.data?.status === 'APPROVED' &&
      statusApproved.data?.isApproved === true &&
      reLoginApproved.data?.user?.isApplicationApproved === true &&
      busSearchApproved.status === 200 &&
      busList.length > 0,
      'Approved student with active account unlocks Find My Bus and bus search',
      { approve: approveRes.data, busCount: busList.length }
    );

    // -------------------------------------------------------------------------
    // SCENARIO 6: Approved but inactive student -> Find My Bus remains blocked
    // -------------------------------------------------------------------------
    // Create inactive user with approved application
    const inactiveUser = await prisma.user.create({
      data: {
        rollNumber: testRollInactive,
        name: 'Pooja Inactive',
        email: 'pooja@hitam.edu.in',
        phone: '9876543222',
        department: 'ECE',
        year: 'II Year (2nd Year)',
        role: 'STUDENT',
        status: 'INACTIVE', // Account deactivated
        transportFeePaid: false,
        passwordHash: defaultHash,
      }
    });

    await prisma.transportApplication.create({
      data: {
        applicationNo: 'APP-2026-99991',
        fullName: 'Pooja Inactive',
        rollNumber: testRollInactive,
        branch: 'ECE',
        academicYear: 'II Year (2nd Year)',
        mobileNumber: '9876543222',
        guardianMobile: '9876543200',
        address: 'Miyapur',
        requestedRouteId: '12',
        requestedBoardingPoint: 'MIYAPUR X ROAD',
        status: 'APPROVED',
        accountActivated: false,
      }
    });

    const inactiveToken = jwt.sign({ rollNumber: testRollInactive, role: 'STUDENT' }, JWT_SECRET, { expiresIn: '1h' });
    const inactiveSearchRes = await apiReq('/wimb/buses/between?from=Sangareddy&to=HITAM', 'GET', null, inactiveToken);

    assert(
      inactiveSearchRes.status === 403 &&
      (inactiveSearchRes.data?.code === 'ACCOUNT_NOT_ACTIVATED' || inactiveSearchRes.data?.code === 'ACCOUNT_INACTIVE'),
      'Approved but inactive student is blocked from Find My Bus with HTTP 403',
      inactiveSearchRes.data
    );

    // -------------------------------------------------------------------------
    // SCENARIO 7: Rejected applicant -> Rejection status appears and search is blocked
    // -------------------------------------------------------------------------
    await prisma.user.create({
      data: {
        rollNumber: testRollRejected,
        name: 'Rohan Rejected',
        email: 'rohan@hitam.edu.in',
        phone: '9876543233',
        department: 'MECH',
        year: 'I Year (1st Year)',
        role: 'STUDENT',
        status: 'ACTIVE',
        transportFeePaid: false,
        passwordHash: defaultHash,
      }
    });

    const rejApp = await prisma.transportApplication.create({
      data: {
        applicationNo: 'APP-2026-88882',
        fullName: 'Rohan Rejected',
        rollNumber: testRollRejected,
        branch: 'MECH',
        academicYear: 'I Year (1st Year)',
        mobileNumber: '9876543233',
        guardianMobile: '9876543200',
        address: 'Balanagar',
        requestedRouteId: '12',
        requestedBoardingPoint: 'BALANAGAR',
        status: 'REJECTED',
        rejectionReason: 'Invalid residential proof submitted for Route 12',
        reviewedByAdminId: 'ADMIN001',
        reviewedAt: new Date(),
      }
    });

    const loginRejected = await apiReq('/auth/login', 'POST', {
      rollNumber: testRollRejected,
      password: 'password123',
    });
    const rejToken = loginRejected.data?.token;
    const statusRejected = await apiReq('/transport-applications/status', 'GET', null, rejToken);
    const busSearchRejected = await apiReq('/wimb/buses/between?from=Sangareddy&to=HITAM', 'GET', null, rejToken);

    assert(
      loginRejected.status === 200 &&
      statusRejected.data?.status === 'REJECTED' &&
      statusRejected.data?.application?.rejectionReason === 'Invalid residential proof submitted for Route 12' &&
      busSearchRejected.status === 403 &&
      busSearchRejected.data?.code === 'APPLICATION_REJECTED',
      'Rejected applicant receives real REJECTED status and rejection reason; bus search blocked',
      statusRejected.data
    );

    // -------------------------------------------------------------------------
    // SCENARIO 8: Unknown user -> No fabricated student or application is created
    // -------------------------------------------------------------------------
    const unknownLogin = await apiReq('/auth/login', 'POST', {
      rollNumber: 'GHOST_ROLL_404',
      password: 'password123',
    });

    const checkGhost = await prisma.user.findFirst({ where: { rollNumber: 'GHOST_ROLL_404' } });
    const checkGhostApp = await prisma.transportApplication.findFirst({ where: { rollNumber: 'GHOST_ROLL_404' } });

    assert(
      unknownLogin.status === 401 &&
      checkGhost === null &&
      checkGhostApp === null,
      'Unknown user receives 401 and no fabricated student or application record is created',
      unknownLogin.data
    );

    // -------------------------------------------------------------------------
    // SCENARIO 9: Existing application -> No duplicate is created (409 Conflict)
    // -------------------------------------------------------------------------
    const duplicateAttempt = await apiReq('/transport-applications', 'POST', {
      fullName: 'Vikas Unapplied',
      rollNumber: testRollNotApplied, // Already approved application exists!
      branch: 'CSE',
      academicYear: 'II Year (2nd Year)',
      mobileNumber: '9876543211',
      guardianName: 'Ramesh Father',
      guardianMobile: '9876543200',
      address: 'Kukatpally, Hyderabad',
      requestedRouteId: '12',
      requestedBoardingPoint: 'SANGAREDDY OLD BUSSTAND',
      declarationAccepted: true,
      rulesAcknowledged: true,
    }, approvedToken);

    assert(
      duplicateAttempt.status === 409 &&
      duplicateAttempt.data?.message?.includes('Duplicate submissions are not allowed'),
      'Student with existing active application is denied duplicate submission with 409 Conflict',
      duplicateAttempt.data
    );

    // -------------------------------------------------------------------------
    // SCENARIO 10: Another student cannot access or mutate someone else application
    // -------------------------------------------------------------------------
    const loginOther = await apiReq('/auth/login', 'POST', {
      rollNumber: testRollOther,
      password: 'password123',
    });
    const tokenOther = loginOther.data?.token;

    // Student other attempts to fetch /transport-applications/status
    const statusOther = await apiReq('/transport-applications/status', 'GET', null, tokenOther);
    const myAppsOther = await apiReq('/transport-applications/my', 'GET', null, tokenOther);

    // Student other attempts to spoof Vikas rollNumber in submission
    const spoofSubmission = await apiReq('/transport-applications', 'POST', {
      fullName: 'Sneha Trying Spoof',
      rollNumber: testRollNotApplied, // Spoofed roll number
      branch: 'ECE',
      academicYear: 'III Year (3rd Year)',
      mobileNumber: '9876543299',
      guardianName: 'Parent',
      guardianMobile: '9876543200',
      address: 'Hyderabad',
      requestedRouteId: '12',
      requestedBoardingPoint: 'SANGAREDDY OLD BUSSTAND',
      declarationAccepted: true,
      rulesAcknowledged: true,
    }, tokenOther);

    assert(
      statusOther.data?.status === 'NOT_SUBMITTED' &&
      statusOther.data?.application === null &&
      myAppsOther.data?.applications?.length === 0 &&
      (spoofSubmission.status === 201 ? spoofSubmission.data?.application?.rollNumber === testRollOther : true),
      'Ownership isolation verified: Student only sees own application and cannot submit for other roll',
      { otherApps: myAppsOther.data?.applications }
    );

    // -------------------------------------------------------------------------
    // SCENARIO 11: Invalid/tampered request returns error, not fabricated pending
    // -------------------------------------------------------------------------
    const badReq = await apiReq('/transport-applications/status', 'GET', null, 'INVALID_TAMPERED_BEARER_TOKEN');
    assert(
      badReq.status === 401 &&
      badReq.data?.message?.includes('expired') || badReq.data?.message?.includes('Session') || badReq.data?.message?.includes('token'),
      'Invalid token fails with 401 session error, not fabricated pending status',
      badReq.data
    );

    // -------------------------------------------------------------------------
    // SCENARIO 12: Existing paid student -> Retains full dashboard, pass, tracking
    // -------------------------------------------------------------------------
    const paidLogin = await apiReq('/auth/login', 'POST', {
      rollNumber: '24E51A0557',
      password: 'hitam123',
    });
    const paidToken = paidLogin.data?.token;

    const myPassRes = await apiReq('/pass/my', 'GET', null, paidToken);
    const trackingRes = await apiReq('/live-location/all', 'GET', null, paidToken);
    const searchRes = await apiReq('/wimb/buses/between?from=Sangareddy&to=HITAM', 'GET', null, paidToken);

    assert(
      paidLogin.status === 200 &&
      paidLogin.data?.user?.transportFeePaid === true &&
      paidLogin.data?.user?.accessLevel === 'FULL_STUDENT_DASHBOARD' &&
      myPassRes.status === 200 &&
      trackingRes.status === 200 &&
      searchRes.status === 200,
      'Existing paid student retains full student dashboard, QR pass, live tracking, and bus search',
      { user: paidLogin.data?.user?.rollNumber, isPaid: paidLogin.data?.user?.transportFeePaid }
    );

    // Clean up test records
    await prisma.transportApplication.deleteMany({
      where: { rollNumber: { in: testRolls } }
    });
    await prisma.booking.deleteMany({
      where: { studentRollNumber: { in: testRolls } }
    });
    await prisma.payment.deleteMany({
      where: { studentRollNumber: { in: testRolls } }
    });
    await prisma.user.deleteMany({
      where: { rollNumber: { in: testRolls } }
    });

    console.log(`\n================================================================`);
    console.log(`FINAL RESULT: ${passed} / ${total} SCENARIOS PASSED`);
    console.log(`================================================================\n`);
  } catch (err) {
    console.error('Fatal execution error during test scenarios:', err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

runRoutingScenarioTests();
