process.env.PORT = '5099';
import prisma from './src/lib/prisma.js';

async function runApiHttpTests() {
  console.log('====================================================');
  console.log('HITAM API HTTP ENDPOINT INTEGRATION VERIFICATION');
  console.log('====================================================\n');

  // Dynamically import express app from server.js (listens on PORT 5099)
  await import('./src/server.js');
  // Wait 1 second for socket to bind
  await new Promise(r => setTimeout(r, 1000));

  async function makeRequest(path, options = {}) {
    const url = `http://localhost:5099/api${path}`;
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        },
        ...options,
      });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, data };
    }

    let passed = 0;
    let total = 0;
    function check(cond, msg) {
      total++;
      if (cond) {
        console.log(`[PASS] ${msg}`);
        passed++;
      } else {
        console.error(`[FAIL] ${msg}`);
      }
    }

    try {
      // 1. Public Metadata Endpoint
      const metaRes = await makeRequest('/transport-applications/meta');
      check(metaRes.status === 200, 'GET /api/transport-applications/meta returns HTTP 200');
      check(Array.isArray(metaRes.data?.routes) && metaRes.data.routes.length === 23, 'Metadata returns all 23 active college routes with boarding stops');

      // 2. Unregistered Student Login
      const invalidLogin = await makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ rollNumber: 'UNREGISTERED_9999', password: 'password123' })
      });
      check(invalidLogin.status === 401, 'POST /api/auth/login rejects unregistered student with HTTP 401');
      check(invalidLogin.data?.message?.includes('Invalid') || invalidLogin.data?.message?.includes('not found') || invalidLogin.data?.success === false, 'Proper security error message returned without account synthesis');

      // 3. Admin Login
      const adminLogin = await makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ rollNumber: 'ADMIN001', password: 'hitam123' })
      });
      check(adminLogin.status === 200, 'POST /api/auth/login authenticates ADMIN001 with HTTP 200');
      const adminToken = adminLogin.data?.token;
      check(Boolean(adminToken && adminLogin.data?.user?.role === 'ADMIN'), 'Admin JWT token generated with role ADMIN');

      // 4. Admin Applications Summary
      const summaryRes = await makeRequest('/transport-applications/summary', {
        token: adminToken,
      });
      check(summaryRes.status === 200, 'GET /api/transport-applications/summary returns HTTP 200 for authenticated admin');
      check(summaryRes.data?.counts != null, 'Summary provides dynamic metrics object with status counts');

      // 5. Submit Public Application via HTTP API
      const testRoll = '24E51HTTP99';
      await prisma.transportApplication.deleteMany({ where: { rollNumber: testRoll } });

      const route12 = metaRes.data?.routes?.find(r => String(r.id) === '12');
      const firstStop = route12?.stops?.[0];
      const validStop = typeof firstStop === 'object' && firstStop?.name ? firstStop.name : (firstStop || 'KPHB');

      const submitRes = await makeRequest('/transport-applications', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Balaji HTTP Test',
          rollNumber: testRoll,
          branch: 'CSE',
          academicYear: '2026-2027',
          mobileNumber: '9988776655',
          guardianName: 'HTTP Guardian',
          guardianMobile: '9988776654',
          requestedRouteId: '12',
          requestedBoardingPoint: validStop,
          address: 'HITAM Hostels, Hyderabad',
          declarationAccepted: true,
          rulesAcknowledged: true,
        })
      });

      check(submitRes.status === 201, 'POST /api/transport-applications creates application with HTTP 201');
      const appNo = submitRes.data?.application?.applicationNo;
      check(Boolean(appNo && appNo.startsWith('APP-2026-')), `Application received unique reference number: ${appNo}`);

      // 6. Public Tracking Endpoint
      const trackRes = await makeRequest(`/transport-applications/track/${appNo}?rollNumber=${testRoll}`);
      check(trackRes.status === 200, 'GET /api/transport-applications/track/:appNo returns HTTP 200');
      check(trackRes.data?.application?.status === 'PENDING', 'Public tracker returns real-time status PENDING');

      // Clean up test application
      await prisma.transportApplication.deleteMany({ where: { rollNumber: testRoll } });

      console.log(`\n====================================================`);
      console.log(`HTTP API RESULTS: ${passed} / ${total} TESTS PASSED`);
      console.log(`====================================================\n`);
    } catch (err) {
      console.error('HTTP test error:', err);
    } finally {
      await prisma.$disconnect();
      process.exit(0);
    }
}

runApiHttpTests();
