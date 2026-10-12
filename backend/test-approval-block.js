import prisma from './src/lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'hitam_transport_jwt_secret_2026_production_key';

async function runApprovalBlockTests() {
  console.log('================================================================');
  console.log('CRITICAL VERIFICATION: BLOCK FIND MY BUS ACCESS UNTIL ADMIN APPROVAL');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`[PASS] Case ${total}: ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] Case ${total}: ${message}`);
    }
  }

  const testRollPending = '24E51APP01';
  const testRollRejected = '24E51APP02';
  const testRollApprovedInactive = '24E51APP03';
  const testRollApprovedActive = '24E51APP04';

  try {
    // Clean up any test records
    await prisma.transportApplication.deleteMany({
      where: { rollNumber: { in: [testRollPending, testRollRejected, testRollApprovedInactive, testRollApprovedActive] } }
    });
    await prisma.booking.deleteMany({
      where: { studentRollNumber: { in: [testRollPending, testRollRejected, testRollApprovedInactive, testRollApprovedActive] } }
    });
    await prisma.payment.deleteMany({
      where: { studentRollNumber: { in: [testRollPending, testRollRejected, testRollApprovedInactive, testRollApprovedActive] } }
    });
    await prisma.user.deleteMany({
      where: { rollNumber: { in: [testRollPending, testRollRejected, testRollApprovedInactive, testRollApprovedActive] } }
    });

    // Helper to send HTTP requests
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

    // Authenticate Admin
    const adminLoginRes = await apiReq('/auth/login', 'POST', { rollNumber: 'ADMIN001', password: 'hitam123' });
    const adminToken = adminLoginRes.data?.token;

    // -------------------------------------------------------------
    // CASE 1: Submit new application -> status PENDING in PostgreSQL
    // -------------------------------------------------------------
    const submitRes = await apiReq('/transport-applications', 'POST', {
      fullName: 'Rahul Pending Test',
      rollNumber: testRollPending,
      branch: 'CSE',
      academicYear: '2026-2027',
      mobileNumber: '9988771122',
      guardianName: 'Test Parent',
      guardianMobile: '9988771133',
      requestedRouteId: '12',
      requestedBoardingPoint: 'SANGAREDDY OLD BUSSTAND',
      address: 'Sangareddy, Telangana',
      declarationAccepted: true,
      rulesAcknowledged: true,
    });
    assert(
      submitRes.status === 201 &&
      submitRes.data?.application?.status === 'PENDING' &&
      submitRes.data?.application?.applicationNo?.startsWith('APP-'),
      'Newly submitted application saved in PostgreSQL with status PENDING and reference number'
    );

    // -------------------------------------------------------------
    // CASE 2: Pending student tries to login or use token -> Login blocked (403)
    // -------------------------------------------------------------
    const pendingLogin = await apiReq('/auth/login', 'POST', { rollNumber: testRollPending, password: 'password123' });
    assert(
      pendingLogin.status === 403 &&
      pendingLogin.data?.message?.includes('pending admin approval'),
      'Pending applicant is blocked from logging in with pending approval notice'
    );

    // -------------------------------------------------------------
    // CASE 3: Pending student calls Find My Bus / bus-search API directly -> DENIED (403)
    // Even if an unauthorized token is forged or used
    // -------------------------------------------------------------
    const pendingToken = jwt.sign({ rollNumber: testRollPending, role: 'STUDENT' }, JWT_SECRET, { expiresIn: '1h' });
    const directSearchRes = await apiReq('/wimb/buses/between?from=Sangareddy&to=HITAM', 'GET', null, pendingToken);
    const directStopSearch = await apiReq('/wimb/stops/search?q=sangareddy', 'GET', null, pendingToken);
    const directBooking = await apiReq('/bookings', 'POST', { routeId: '12', seatNumber: 5 }, pendingToken);
    const directPayment = await apiReq('/payments/initiate', 'POST', { amount: 28000 }, pendingToken);

    assert(
      directSearchRes.status === 403 &&
      directStopSearch.status === 403 &&
      directBooking.status === 403 &&
      directPayment.status === 403 &&
      directSearchRes.data?.code === 'APPLICATION_PENDING',
      'Pending student calling bus search, stop autocomplete, booking, or payment API is strictly denied with HTTP 403'
    );

    // -------------------------------------------------------------
    // CASE 4: Admin reviews and approves application -> Database status changes to APPROVED
    // -------------------------------------------------------------
    const pendingAppId = submitRes.data?.application?.id;
    const approveRes = await apiReq(`/transport-applications/${pendingAppId}/approve`, 'POST', { remarks: 'Documents verified' }, adminToken);
    const dbApp = await prisma.transportApplication.findUnique({ where: { id: pendingAppId } });

    assert(
      approveRes.status === 200 &&
      dbApp.status === 'APPROVED' &&
      dbApp.reviewedByAdminId === 'ADMIN001' &&
      dbApp.reviewedAt != null,
      'Admin approves application; database status is updated to APPROVED with admin roll and timestamp'
    );

    // -------------------------------------------------------------
    // CASE 5: Approved but inactive student -> remains blocked from login & Find My Bus
    // (Before activate-account is called, accountActivated is false)
    // -------------------------------------------------------------
    const inactiveLogin = await apiReq('/auth/login', 'POST', { rollNumber: testRollPending, password: 'hitam123' });
    const approvedInactiveToken = jwt.sign({ rollNumber: testRollPending, role: 'STUDENT' }, JWT_SECRET, { expiresIn: '1h' });
    const inactiveSearchRes = await apiReq('/wimb/buses/between?from=Sangareddy&to=HITAM', 'GET', null, approvedInactiveToken);

    assert(
      inactiveLogin.status === 403 &&
      inactiveSearchRes.status === 403 &&
      inactiveSearchRes.data?.code === 'ACCOUNT_NOT_ACTIVATED',
      'Approved but inactive applicant remains blocked from login and bus search'
    );

    // -------------------------------------------------------------
    // CASE 6: Approved AND activated unpaid student -> Find My Bus becomes accessible!
    // -------------------------------------------------------------
    const activateRes = await apiReq(`/transport-applications/${pendingAppId}/activate-account`, 'POST', { defaultPassword: 'password123' }, adminToken);
    const studentLogin = await apiReq('/auth/login', 'POST', { rollNumber: testRollPending, password: 'password123' });
    const studentToken = studentLogin.data?.token;

    const activatedSearchRes = await apiReq('/wimb/buses/between?from=Sangareddy&to=HITAM', 'GET', null, studentToken);
    const activatedStopSearch = await apiReq('/wimb/stops/search?q=sangareddy', 'GET', null, studentToken);

    console.log('Case 6 debug:', {
      activateStatus: activateRes.status,
      activateMsg: activateRes.data?.message,
      loginStatus: studentLogin.status,
      loginMsg: studentLogin.data?.message,
      searchStatus: activatedSearchRes.status,
      searchBuses: activatedSearchRes.data?.buses?.length,
      searchMsg: activatedSearchRes.data?.message,
      stopStatus: activatedStopSearch.status
    });

    const busList = Array.isArray(activatedSearchRes.data)
      ? activatedSearchRes.data
      : (activatedSearchRes.data?.buses || []);

    assert(
      activateRes.status === 200 &&
      studentLogin.status === 200 &&
      studentLogin.data?.user?.transportFeePaid === false &&
      activatedSearchRes.status === 200 &&
      busList.length > 0 &&
      activatedStopSearch.status === 200,
      'Approved and activated unpaid student can log in and successfully search buses on Find My Bus'
    );

    // -------------------------------------------------------------
    // CASE 7: Rejected student -> Remains blocked from login and bus search
    // -------------------------------------------------------------
    // Create rejected application
    const submitRejected = await apiReq('/transport-applications', 'POST', {
      fullName: 'Anita Rejected Test',
      rollNumber: testRollRejected,
      branch: 'ECE',
      academicYear: '2026-2027',
      mobileNumber: '9988772233',
      guardianName: 'Test Parent',
      guardianMobile: '9988772244',
      requestedRouteId: '12',
      requestedBoardingPoint: 'SANGAREDDY OLD BUSSTAND',
      address: 'Sangareddy',
      declarationAccepted: true,
      rulesAcknowledged: true,
    });
    const rejAppId = submitRejected.data?.application?.id;
    await apiReq(`/transport-applications/${rejAppId}/reject`, 'POST', { rejectionReason: 'Incomplete document verification' }, adminToken);

    const rejectedLogin = await apiReq('/auth/login', 'POST', { rollNumber: testRollRejected, password: 'password123' });
    const rejectedToken = jwt.sign({ rollNumber: testRollRejected, role: 'STUDENT' }, JWT_SECRET, { expiresIn: '1h' });
    const rejectedSearchRes = await apiReq('/wimb/buses/between?from=Sangareddy&to=HITAM', 'GET', null, rejectedToken);

    assert(
      rejectedLogin.status === 403 &&
      rejectedSearchRes.status === 403 &&
      rejectedSearchRes.data?.code === 'APPLICATION_REJECTED',
      'Rejected applicant is blocked from login and receives HTTP 403 on bus search with rejection notice'
    );

    // -------------------------------------------------------------
    // CASE 8: Unregistered user -> cannot access student routes or APIs (401)
    // -------------------------------------------------------------
    const unregLogin = await apiReq('/auth/login', 'POST', { rollNumber: 'NON_EXISTENT_9999', password: 'password123' });
    const unauthSearch = await apiReq('/wimb/buses/between?from=Sangareddy&to=HITAM', 'GET');

    assert(
      unregLogin.status === 401 &&
      unauthSearch.status === 401,
      'Unregistered / unauthenticated request is blocked with HTTP 401 Not authorized'
    );

    // -------------------------------------------------------------
    // CASE 9: Paid existing student -> current dashboard continues to work
    // -------------------------------------------------------------
    const paidStudentLogin = await apiReq('/auth/login', 'POST', { rollNumber: '24E51A0557', password: 'hitam123' });
    const paidToken = paidStudentLogin.data?.token;

    const passRes = await apiReq('/pass/my', 'GET', null, paidToken);
    const trackingRes = await apiReq('/live-location/all', 'GET', null, paidToken);
    const paidSearchRes = await apiReq('/wimb/buses/between?from=Sangareddy&to=HITAM', 'GET', null, paidToken);

    assert(
      paidStudentLogin.status === 200 &&
      paidStudentLogin.data?.user?.transportFeePaid === true &&
      passRes.status === 200 &&
      trackingRes.status === 200 &&
      paidSearchRes.status === 200,
      'Existing paid student retains full dashboard, bus pass QR, live tracking, and bus search'
    );

    // -------------------------------------------------------------
    // CASE 10: Student attempts to modify application status via API -> REJECTED (403)
    // -------------------------------------------------------------
    const studentTamperAttempt = await apiReq(`/transport-applications/${pendingAppId}/approve`, 'POST', { remarks: 'Self approval attempt' }, studentToken);
    const studentTamperPatch = await apiReq(`/transport-applications/${pendingAppId}/status`, 'PATCH', { status: 'APPROVED' }, studentToken);

    assert(
      (studentTamperAttempt.status === 403 || studentTamperAttempt.status === 401) &&
      (studentTamperPatch.status === 403 || studentTamperPatch.status === 401),
      'Student attempting to approve or mutate application status via API is rejected with HTTP 403'
    );

    // Clean up test records
    await prisma.transportApplication.deleteMany({
      where: { rollNumber: { in: [testRollPending, testRollRejected, testRollApprovedInactive, testRollApprovedActive] } }
    });
    await prisma.booking.deleteMany({
      where: { studentRollNumber: { in: [testRollPending, testRollRejected, testRollApprovedInactive, testRollApprovedActive] } }
    });
    await prisma.payment.deleteMany({
      where: { studentRollNumber: { in: [testRollPending, testRollRejected, testRollApprovedInactive, testRollApprovedActive] } }
    });
    await prisma.user.deleteMany({
      where: { rollNumber: { in: [testRollPending, testRollRejected, testRollApprovedInactive, testRollApprovedActive] } }
    });

    console.log(`\n================================================================`);
    console.log(`FINAL RESULT: ${passed} / ${total} TEST CASES PASSED`);
    console.log(`================================================================\n`);
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

runApprovalBlockTests();
