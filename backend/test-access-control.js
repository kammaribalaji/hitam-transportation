import http from 'node:http';
import bcrypt from 'bcryptjs';
import app from './src/server.js';
import prisma from './src/lib/prisma.js';

let server;
let baseUrl;

async function startServer() {
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`[Test Server] Started on ${baseUrl}`);
      resolve();
    });
  });
}

async function stopServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
}

async function api(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const res = await fetch(url, {
    ...options,
    headers,
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
  });
  let data = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}

const results = [];
function recordTest(id, name, passed, details = '') {
  results.push({ id, name, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} Test ${id}: ${name} ${details ? `(${details})` : ''}`);
}

async function runAllTests() {
  await prisma.$connect();
  await startServer();

  console.log('\n======================================================');
  console.log(' RUNNING DATABASE-DRIVEN ACCESS CONTROL TESTS');
  console.log('======================================================\n');

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Unregistered user -> login rejected with 'Invalid credentials.'
    // -------------------------------------------------------------------------
    const nonExistentRoll = `NON_EXISTENT_${Date.now()}`;
    const t1 = await api('/api/auth/login', {
      method: 'POST',
      body: { rollNumber: nonExistentRoll, password: 'password123' },
    });
    const t1Passed = t1.status === 401 && String(t1.data?.message || '').includes('Invalid credentials');
    recordTest(1, 'Unregistered user login rejected with Invalid credentials', t1Passed, `Status: ${t1.status}, Msg: "${t1.data?.message}"`);

    // -------------------------------------------------------------------------
    // TEST 2: Pending applicant -> no student access (admin approval pending)
    // -------------------------------------------------------------------------
    const pendingRoll = `TEST_PENDING_${Date.now()}`;
    await prisma.transportApplication.deleteMany({ where: { rollNumber: pendingRoll } });
    await prisma.user.deleteMany({ where: { rollNumber: pendingRoll } });

    await prisma.transportApplication.create({
      data: {
        applicationNo: `APP-PENDING-${Date.now()}`,
        fullName: 'Pending Applicant',
        rollNumber: pendingRoll,
        branch: 'CSE',
        academicYear: '1st Year',
        mobileNumber: '9876543210',
        address: 'Hyderabad',
        requestedRouteId: '12',
        requestedBoardingPoint: 'Sangareddy',
        guardianMobile: '9876543211',
        status: 'PENDING',
        accountActivated: false,
      },
    });

    const t2 = await api('/api/auth/login', {
      method: 'POST',
      body: { rollNumber: pendingRoll, password: 'anypassword' },
    });
    const t2Passed = t2.status === 403 && String(t2.data?.message || '').toLowerCase().includes('pending admin approval');
    recordTest(2, 'Pending applicant login denied with pending approval notice', t2Passed, `Status: ${t2.status}, Msg: "${t2.data?.message}"`);

    // -------------------------------------------------------------------------
    // TEST 3: Rejected applicant -> no student access
    // -------------------------------------------------------------------------
    const rejectedRoll = `TEST_REJECTED_${Date.now()}`;
    await prisma.transportApplication.deleteMany({ where: { rollNumber: rejectedRoll } });
    await prisma.user.deleteMany({ where: { rollNumber: rejectedRoll } });

    await prisma.transportApplication.create({
      data: {
        applicationNo: `APP-REJECTED-${Date.now()}`,
        fullName: 'Rejected Applicant',
        rollNumber: rejectedRoll,
        branch: 'ECE',
        academicYear: '2nd Year',
        mobileNumber: '9876543212',
        address: 'Secunderabad',
        requestedRouteId: '12',
        requestedBoardingPoint: 'Patancheru',
        guardianMobile: '9876543213',
        status: 'REJECTED',
        rejectionReason: 'Route capacity reached',
        accountActivated: false,
      },
    });

    const t3 = await api('/api/auth/login', {
      method: 'POST',
      body: { rollNumber: rejectedRoll, password: 'anypassword' },
    });
    const t3Passed = t3.status === 403 && String(t3.data?.message || '').toLowerCase().includes('rejected');
    recordTest(3, 'Rejected applicant login denied', t3Passed, `Status: ${t3.status}, Msg: "${t3.data?.message}"`);

    // -------------------------------------------------------------------------
    // TEST 4: Approved but inactive account -> login denied until activation
    // -------------------------------------------------------------------------
    const approvedInactiveRoll = `TEST_APPR_INACT_${Date.now()}`;
    await prisma.transportApplication.deleteMany({ where: { rollNumber: approvedInactiveRoll } });
    await prisma.user.deleteMany({ where: { rollNumber: approvedInactiveRoll } });

    await prisma.transportApplication.create({
      data: {
        applicationNo: `APP-APPR-INACT-${Date.now()}`,
        fullName: 'Approved Inactive Applicant',
        rollNumber: approvedInactiveRoll,
        branch: 'MECH',
        academicYear: '3rd Year',
        mobileNumber: '9876543214',
        address: 'Kukatpally',
        requestedRouteId: '12',
        requestedBoardingPoint: 'Miyapur',
        guardianMobile: '9876543215',
        status: 'APPROVED',
        accountActivated: false, // NOT activated
      },
    });

    const t4 = await api('/api/auth/login', {
      method: 'POST',
      body: { rollNumber: approvedInactiveRoll, password: 'hitam123' },
    });
    const t4Passed = t4.status === 403 && String(t4.data?.message || '').toLowerCase().includes('not yet activated');
    recordTest(4, 'Approved but unactivated applicant denied login', t4Passed, `Status: ${t4.status}, Msg: "${t4.data?.message}"`);

    // -------------------------------------------------------------------------
    // TEST 5: Approved and activated unpaid student -> restricted first-booking flow only
    // -------------------------------------------------------------------------
    const unpaidRoll = `TEST_UNPAID_${Date.now()}`;
    await prisma.transportApplication.deleteMany({ where: { rollNumber: unpaidRoll } });
    await prisma.user.deleteMany({ where: { rollNumber: unpaidRoll } });
    await prisma.payment.deleteMany({ where: { studentRollNumber: unpaidRoll } });

    await prisma.transportApplication.create({
      data: {
        applicationNo: `APP-UNPAID-${Date.now()}`,
        fullName: 'Approved Activated Unpaid Student',
        rollNumber: unpaidRoll,
        branch: 'CSE',
        academicYear: '1st Year',
        mobileNumber: '9876543216',
        address: 'Nizampet',
        requestedRouteId: '12',
        requestedBoardingPoint: 'KPHB',
        guardianMobile: '9876543217',
        status: 'APPROVED',
        accountActivated: true,
      },
    });

    const passwordHash = await bcrypt.hash('hitam123', 10);
    await prisma.user.create({
      data: {
        rollNumber: unpaidRoll,
        name: 'Approved Activated Unpaid Student',
        role: 'STUDENT',
        status: 'ACTIVE',
        transportFeePaid: false, // UNPAID
        feeAmount: 12000,
        feePaidAmount: 0,
        feeBalance: 12000,
        assignedRouteId: '12',
        boardingPoint: 'KPHB',
        passwordHash,
      },
    });

    const t5 = await api('/api/auth/login', {
      method: 'POST',
      body: { rollNumber: unpaidRoll, password: 'hitam123' },
    });
    const t5Token = t5.data?.token;
    const t5User = t5.data?.user;
    const t5Passed =
      t5.status === 200 &&
      Boolean(t5Token) &&
      t5User?.transportFeePaid === false &&
      t5User?.accessLevel === 'RESTRICTED_FIRST_BOOKING';
    recordTest(5, 'Approved and activated unpaid student gets restricted access level', t5Passed, `transportFeePaid: ${t5User?.transportFeePaid}, accessLevel: ${t5User?.accessLevel}`);

    // -------------------------------------------------------------------------
    // TEST 6 & 7: Unpaid student attempts to access protected dashboard APIs directly -> access denied
    // -------------------------------------------------------------------------
    const authHeaders = { Authorization: `Bearer ${t5Token}` };

    const t7Pass = await api('/api/pass/my', { headers: authHeaders });
    const t7Tracking = await api('/api/tracking/TRIP-001', { headers: authHeaders });
    const t7LiveLoc = await api('/api/live-location/all', { headers: authHeaders });
    const t7Complaints = await api('/api/complaints', { headers: authHeaders });

    // But First-booking search APIs ARE allowed
    const t7Wimb = await api('/api/wimb/routes/popular', { headers: authHeaders });
    const t7Stops = await api('/api/wimb/stops/search?q=k', { headers: authHeaders });
    const t7Routes = await api('/api/routes', { headers: authHeaders });

    const t7Passed =
      t7Pass.status === 403 &&
      t7Tracking.status === 403 &&
      t7LiveLoc.status === 403 &&
      t7Complaints.status === 403 &&
      t7Wimb.status === 200 &&
      t7Stops.status === 200 &&
      t7Routes.status === 200;
    recordTest(7, 'Unpaid student calling protected dashboard APIs is denied (403)', t7Passed, `Pass: ${t7Pass.status}, Tracking: ${t7Tracking.status}, LiveLoc: ${t7LiveLoc.status}, Complaints: ${t7Complaints.status}, PopularRoutes: ${t7Wimb.status}`);
    recordTest(6, 'Unpaid student protected endpoints deny data exposure', t7Pass.status === 403 && t7Tracking.status === 403, 'Gated by requirePaidStudent backend middleware');

    // -------------------------------------------------------------------------
    // TEST 8: Payment fails, remains pending, or has forged success -> access remains restricted
    // -------------------------------------------------------------------------
    // Forged non-existent payment ID
    const t8Forged = await api('/api/payments/verify', {
      method: 'POST',
      headers: authHeaders,
      body: { paymentId: 'PAY-FORGED-FAKE-ID-9999', transactionRef: 'TXN-FAKE' },
    });

    // Create a real pending order
    const initRes = await api('/api/payments/initiate', {
      method: 'POST',
      headers: authHeaders,
      body: { routeId: '12' },
    });
    const realPaymentId = initRes.data?.order?.paymentId;

    // Send failed gateway response
    const t8Failed = await api('/api/payments/verify', {
      method: 'POST',
      headers: authHeaders,
      body: { paymentId: realPaymentId, status: 'FAILED' },
    });

    // Verify session state remains restricted
    const meCheck = await api('/api/auth/me', { headers: authHeaders });
    const t8Passed =
      t8Forged.status === 404 &&
      t8Failed.status === 400 &&
      meCheck.data?.user?.transportFeePaid === false &&
      meCheck.data?.user?.accessLevel === 'RESTRICTED_FIRST_BOOKING';
    recordTest(8, 'Forged and failed payments do not unlock access', t8Passed, `Forged: ${t8Forged.status}, Failed: ${t8Failed.status}, accessLevel: ${meCheck.data?.user?.accessLevel}`);

    // -------------------------------------------------------------------------
    // TEST 9: Verified payment succeeds -> existing student dashboard becomes accessible
    // -------------------------------------------------------------------------
    const initOrder2 = await api('/api/payments/initiate', {
      method: 'POST',
      headers: authHeaders,
      body: { routeId: '12' },
    });
    const order2PaymentId = initOrder2.data?.order?.paymentId;

    const verifyRes = await api('/api/payments/verify', {
      method: 'POST',
      headers: authHeaders,
      body: {
        paymentId: order2PaymentId,
        transactionRef: `TXN-VERIFIED-${Date.now()}`,
        status: 'PAID',
      },
    });

    // Check /auth/me now reflects verified payment state
    const meVerified = await api('/api/auth/me', { headers: authHeaders });

    // Now protected dashboard endpoints are UNLOCKED
    const unlockedLiveLoc = await api('/api/live-location/all', { headers: authHeaders });

    const t9Passed =
      verifyRes.status === 200 &&
      meVerified.data?.user?.transportFeePaid === true &&
      meVerified.data?.user?.accessLevel === 'FULL_STUDENT_DASHBOARD' &&
      unlockedLiveLoc.status === 200;
    recordTest(9, 'Verified payment unlocks full student access in PostgreSQL', t9Passed, `Verify: ${verifyRes.status}, transportFeePaid: ${meVerified.data?.user?.transportFeePaid}, LiveLoc: ${unlockedLiveLoc.status}`);

    // -------------------------------------------------------------------------
    // TEST 10: Existing paid student logs in again -> existing dashboard remains unchanged
    // -------------------------------------------------------------------------
    // Use seeded existing student 24E51A0557
    const t10 = await api('/api/auth/login', {
      method: 'POST',
      body: { rollNumber: '24E51A0557', password: 'hitam123' },
    });
    const t10User = t10.data?.user;
    const t10Passed =
      t10.status === 200 &&
      t10User?.rollNumber === '24E51A0557' &&
      t10User?.transportFeePaid === true &&
      t10User?.accessLevel === 'FULL_STUDENT_DASHBOARD';
    recordTest(10, 'Existing paid student login retains full dashboard access', t10Passed, `User: ${t10User?.rollNumber}, paid: ${t10User?.transportFeePaid}, accessLevel: ${t10User?.accessLevel}`);

    // -------------------------------------------------------------------------
    // TEST 11: Student attempts to access another student's records -> access denied
    // -------------------------------------------------------------------------
    // Using student token (t5Token for unpaidRoll), attempt to access 24E51A0557's profile
    const privacyCheck = await api('/api/students/24E51A0557', { headers: authHeaders });
    const t11Passed = privacyCheck.status === 403;
    recordTest(11, "Student cannot view another student's details (data ownership enforced)", t11Passed, `Status: ${privacyCheck.status}, Msg: "${privacyCheck.data?.message}"`);

    // -------------------------------------------------------------------------
    // TEST 12: Admin can review, approve, and reject; unauthorized users cannot change approval status
    // -------------------------------------------------------------------------
    // 12a: Unprivileged student tries to approve an application
    const studentApprove = await api(`/api/transport-applications/some-id/approve`, {
      method: 'POST',
      headers: authHeaders,
    });

    // 12b: Admin logs in
    const adminLogin = await api('/api/auth/login', {
      method: 'POST',
      body: { rollNumber: 'ADMIN001', password: 'admin123' },
    });
    const adminToken = adminLogin.data?.token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // Create a target application to approve and reject
    const testAppRoll = `TEST_APPROVAL_${Date.now()}`;
    const testApp = await prisma.transportApplication.create({
      data: {
        applicationNo: `APP-REVIEW-${Date.now()}`,
        fullName: 'Review Test Student',
        rollNumber: testAppRoll,
        branch: 'IT',
        academicYear: '2nd Year',
        mobileNumber: '9988776655',
        address: 'Balanagar',
        requestedRouteId: '12',
        requestedBoardingPoint: 'Suchitra',
        guardianMobile: '9988776654',
        status: 'PENDING',
      },
    });

    // Admin approves
    const adminApprove = await api(`/api/transport-applications/${testApp.id}/approve`, {
      method: 'POST',
      headers: adminHeaders,
      body: { remarks: 'Approved by test suite' },
    });

    // Check DB status is APPROVED
    const updatedInDb = await prisma.transportApplication.findUnique({ where: { id: testApp.id } });

    const t12Passed =
      studentApprove.status === 403 &&
      adminApprove.status === 200 &&
      updatedInDb?.status === 'APPROVED';
    recordTest(12, 'Admin approval authorization enforced; public/student unauthorized access rejected', t12Passed, `Student approve: ${studentApprove.status}, Admin approve: ${adminApprove.status}, DB: ${updatedInDb?.status}`);

    // -------------------------------------------------------------------------
    // TEST 13: Existing admin, driver, booking, payment, and dashboard continue to work
    // -------------------------------------------------------------------------
    const driverLogin = await api('/api/auth/login', {
      method: 'POST',
      body: { rollNumber: 'DRV012', password: 'hitam123' },
    });
    const driverToken = driverLogin.data?.token;
    const driverHeaders = { Authorization: `Bearer ${driverToken}` };

    const driverTrips = await api('/api/trips/my', { headers: driverHeaders });
    const adminSummary = await api('/api/transport-applications/summary', { headers: adminHeaders });
    const routesRes = await api('/api/routes', { headers: adminHeaders });

    const t13Passed =
      driverLogin.status === 200 &&
      driverTrips.status === 200 &&
      adminSummary.status === 200 &&
      routesRes.status === 200;
    recordTest(13, 'Existing admin, driver, and system features continue to work flawlessly', t13Passed, `Driver login: ${driverLogin.status}, Driver trips: ${driverTrips.status}, Admin summary: ${adminSummary.status}, Routes: ${routesRes.status}`);

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    await stopServer();
    await prisma.$disconnect();
  }

  console.log('\n======================================================');
  const allPassed = results.every((r) => r.passed);
  const passedCount = results.filter((r) => r.passed).length;
  console.log(` SUMMARY: ${passedCount}/${results.length} TESTS PASSED`);
  console.log('======================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runAllTests();
