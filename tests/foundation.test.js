import assert from 'node:assert';
import http from 'node:http';
import app from '../src/app.js';
import { hashPassword, comparePassword } from '../src/utils/password.js';
import { generateToken, verifyToken } from '../src/utils/jwt.js';
import { ROLES } from '../src/constants/roles.js';

console.log('🧪 Starting Brightloop Backend Foundation Verification Tests...\n');

let server;
let baseUrl;

async function startServer() {
  return new Promise((resolve) => {
    // Bind to port 0 to get a random available test port
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
  await test('Password Hashing & Verification', async () => {
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
    assert.strictEqual(decoded.role, payload.role);
  });

  // 3. HTTP Health Check Endpoint
  await test('GET /api/v1/health returns 200 and operational status', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.service, 'Brightloop Core API');
    assert.strictEqual(typeof json.data.uptimeSeconds, 'number');
  });

  // 4. Root Health Check Endpoint
  await test('GET /health returns 200', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
  });

  // 5. Zod Validation on /api/v1/auth/register (Invalid Input)
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
    assert.ok(fields.includes('name'), 'Should flag name field');
  });

  // 6. Auth Middleware (Protected Route without Token)
  await test('GET /api/v1/auth/me rejects unauthenticated request (401)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/me`);
    assert.strictEqual(res.status, 401);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.code, 'UNAUTHORIZED');
  });

  // 7. Role Check Middleware (Forbidden for Customer on Admin Route)
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
        email: 'staff@test.com',
        password: 'Password123!',
        name: 'New Staff',
        role: ROLES.STAFF,
      }),
    });

    assert.strictEqual(res.status, 403);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.code, 'FORBIDDEN');
  });

  // 8. 404 Route Not Found
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
