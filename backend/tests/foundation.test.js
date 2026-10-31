import assert from 'node:assert';
import http from 'node:http';
import app from '../src/app.js';
import prisma from '../src/config/db.js';
import { hashPassword, comparePassword } from '../src/utils/password.js';
import { generateToken, verifyToken } from '../src/utils/jwt.js';
import { ROLES, normalizeRole } from '../src/constants/roles.js';
import { validatePlanQuantity } from '../src/services/plan.service.js';

console.log('🧪 Starting Brightloop Backend Foundation & Database Integration Tests...\n');

let server;
let baseUrl;

async function startServer() {
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`[Test Server] Running on ${baseUrl}`);
      resolve();
    });
  });
}

async function stopServer() {
  return new Promise((resolve) => {
    server.close(() => {
      console.log('[Test Server] Stopped.');
      resolve();
    });
  });
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error('     Error:', err.message);
      failed++;
    }
  }

  // 1. Password Utility Tests
  await test('Password Hashing & Verification (bcrypt)', async () => {
    const rawPass = 'BrightloopSecure2026!';
    const hashed = await hashPassword(rawPass);
    assert.notStrictEqual(hashed, rawPass, 'Hash should not equal raw password');
    assert.strictEqual(await comparePassword(rawPass, hashed), true, 'Valid password must verify');
    assert.strictEqual(await comparePassword('WrongPassword', hashed), false, 'Invalid password must fail');
  });

  // 2. JWT Utility Tests
  await test('JWT Generation & Verification', async () => {
    const payload = { id: 'usr-123', email: 'test@brightloop.io', role: ROLES.CUSTOMER };
    const token = generateToken(payload, { expiresIn: '1h' });
    assert.strictEqual(typeof token, 'string', 'Token must be a string');
    const decoded = verifyToken(token);
    assert.strictEqual(decoded.id, payload.id);
    assert.strictEqual(decoded.email, payload.email);
    assert.strictEqual(decoded.role, ROLES.CUSTOMER);
  });

  // 3. Role Normalization (Prisma Enum Alignment)
  await test('Role Normalization matches Prisma Role enum (ADMIN, STAFF, CUSTOMER)', async () => {
    assert.strictEqual(normalizeRole('Admin'), ROLES.ADMIN);
    assert.strictEqual(normalizeRole('admin'), ROLES.ADMIN);
    assert.strictEqual(normalizeRole('Staff'), ROLES.STAFF);
    assert.strictEqual(normalizeRole('Customer'), ROLES.CUSTOMER);
    assert.strictEqual(normalizeRole('CUSTOMER'), ROLES.CUSTOMER);
  });

  // 4. HTTP Health Check Endpoints
  await test('GET /api/v1/health returns 200 and operational status', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.service, 'Brightloop Core API');
    assert.strictEqual(typeof json.data.uptimeSeconds, 'number');
    assert.ok(json.data.database, 'Should report database status');
  });

  await test('GET /health returns 200', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
  });

  // 5. Zod Validation on Auth Registration
  await test('POST /api/v1/auth/register rejects invalid email and weak password (400)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid-email-address',
        password: 'short',
        name: 'A',
      }),
    });

    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(json.errors), 'Errors should be an array of field errors');
    const fields = json.errors.map((e) => e.field);
    assert.ok(fields.includes('email'), 'Should flag email field');
    assert.ok(fields.includes('password'), 'Should flag password field');
  });

  // 6. Zod Validation on Customer Creation
  await test('POST /api/v1/customers rejects invalid email (400) when authenticated', async () => {
    const adminToken = generateToken({
      id: 'admin-1',
      email: 'admin@brightloop.io',
      role: ROLES.ADMIN,
    });

    const res = await fetch(`${baseUrl}/api/v1/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        email: 'not-an-email',
        contactName: 'Valid Name',
      }),
    });

    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.code, 'VALIDATION_ERROR');
  });

  // 7. Zod Validation on Product Creation
  await test('POST /api/v1/products rejects negative price (400)', async () => {
    const staffToken = generateToken({
      id: 'staff-1',
      email: 'staff@brightloop.io',
      role: ROLES.STAFF,
    });

    const res = await fetch(`${baseUrl}/api/v1/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        name: 'Enterprise CRM',
        salesPrice: -50,
      }),
    });

    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.code, 'VALIDATION_ERROR');
  });

  // 8. Auth Middleware (Protected Route without Token)
  await test('GET /api/v1/auth/me rejects unauthenticated request (401)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/me`);
    assert.strictEqual(res.status, 401);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.code, 'UNAUTHORIZED');
  });

  // 9. Role Check Middleware (Forbidden for Customer on Admin Route)
  await test('POST /api/v1/auth/staff rejects Customer role with 403 Forbidden', async () => {
    const customerToken = generateToken({
      id: 'cust-999',
      email: 'customer@test.com',
      role: ROLES.CUSTOMER,
    });

    const res = await fetch(`${baseUrl}/api/v1/auth/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        email: 'staff2@test.com',
        password: 'Password123!',
        firstName: 'Staff',
        lastName: 'Member',
        role: ROLES.STAFF,
      }),
    });

    assert.strictEqual(res.status, 403);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.code, 'FORBIDDEN');
  });

  // 10. Important Plan.minQuantity Requirement Enforcement
  await test('Plan.minQuantity enforcement: rejects quantity below minQuantity, accepts >= minQuantity', async () => {
    // Stub prisma.plan.findFirst for controlled testing of minQuantity enforcement
    const originalFindFirst = prisma.plan.findFirst;
    const testPlan = {
      id: 'plan-uuid-enterprise-5',
      code: 'ENTERPRISE-5',
      name: 'Enterprise Tier (Min 5)',
      billingInterval: 'MONTHLY',
      price: 299.0,
      minQuantity: 5,
      isActive: true,
      availableFrom: null,
      availableTo: null,
    };

    prisma.plan.findFirst = async () => testPlan;

    try {
      // Test A: Quantity 3 (< minQuantity 5) MUST FAIL with 400 & PLAN_MIN_QUANTITY_NOT_MET
      let threwBelowMin = false;
      try {
        await validatePlanQuantity('plan-uuid-enterprise-5', 3);
      } catch (err) {
        threwBelowMin = true;
        assert.strictEqual(err.statusCode, 400);
        assert.strictEqual(err.code, 'PLAN_MIN_QUANTITY_NOT_MET');
        assert.ok(err.message.includes('below the minimum required quantity'));
      }
      assert.strictEqual(threwBelowMin, true, 'Quantity 3 must be rejected when minQuantity is 5');

      // Test B: Quantity 5 (== minQuantity 5) MUST PASS
      const resultAtMin = await validatePlanQuantity('plan-uuid-enterprise-5', 5);
      assert.strictEqual(resultAtMin.isValid, true);
      assert.strictEqual(resultAtMin.requestedQuantity, 5);

      // Test C: Quantity 10 (> minQuantity 5) MUST PASS
      const resultAboveMin = await validatePlanQuantity('plan-uuid-enterprise-5', 10);
      assert.strictEqual(resultAboveMin.isValid, true);
      assert.strictEqual(resultAboveMin.requestedQuantity, 10);
    } finally {
      prisma.plan.findFirst = originalFindFirst;
    }
  });

  // 11. Plan Quantity Validation HTTP Endpoint (POST /api/v1/plans/:id/validate-quantity)
  await test('POST /api/v1/plans/:id/validate-quantity rejects quantity below minQuantity', async () => {
    const originalFindFirst = prisma.plan.findFirst;
    prisma.plan.findFirst = async () => ({
      id: 'plan-team-10',
      code: 'TEAM-10',
      name: 'Team Plan (Min 10 Seats)',
      billingInterval: 'MONTHLY',
      price: 150.0,
      minQuantity: 10,
      isActive: true,
    });

    try {
      const res = await fetch(`${baseUrl}/api/v1/plans/plan-team-10/validate-quantity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: 4 }),
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.code, 'PLAN_MIN_QUANTITY_NOT_MET');
    } finally {
      prisma.plan.findFirst = originalFindFirst;
    }
  });

  // 12. 404 Route Not Found
  await test('GET /api/v1/nonexistent-route returns 404 Not Found', async () => {
    const res = await fetch(`${baseUrl}/api/v1/nonexistent-route`);
    assert.strictEqual(res.status, 404);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.code, 'NOT_FOUND');
  });

  console.log(`\n=============================================`);
  console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`=============================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

try {
  await startServer();
  await runTests();
} finally {
  await stopServer();
}
