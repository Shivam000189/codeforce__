const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { requireRole } = require('../src/middlewares/roleMiddleware');
const { registerSchema } = require('../src/middlewares/validators');

test('registerSchema validates required fields and strips extra fields such as role', () => {
  const validWithoutRole = registerSchema.safeParse({
    name: 'Regular User',
    email: 'user@example.com',
    password: 'password123'
  });
  assert.equal(validWithoutRole.success, true);
  assert.equal(validWithoutRole.data.role, undefined);

  // Even if a client sends a role in payload, the Zod schema strips it out
  const validWithAttemptedRole = registerSchema.safeParse({
    name: 'Hacker Attempting Admin',
    email: 'hacker@example.com',
    password: 'password123',
    role: 'admin'
  });
  assert.equal(validWithAttemptedRole.success, true);
  assert.equal(validWithAttemptedRole.data.role, undefined);

  const invalid = registerSchema.safeParse({
    name: '',
    email: 'invalid-email',
    password: '123'
  });
  assert.equal(invalid.success, false);
});

test('requireRole middleware allows user with matching single role', () => {
  const middleware = requireRole('admin');
  let nextCalled = false;

  const req = { user: { userId: '123', role: 'admin' } };
  const res = {
    statusCode: null,
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    }
  };
  const next = () => {
    nextCalled = true;
  };

  middleware(req, res, next);
  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);
});

test('requireRole middleware allows user with matching one of multiple roles', () => {
  const middleware = requireRole('admin', 'moderator');
  let nextCalled = false;

  const req = { user: { userId: '456', role: 'moderator' } };
  const res = {
    statusCode: null,
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    }
  };
  const next = () => {
    nextCalled = true;
  };

  middleware(req, res, next);
  assert.equal(nextCalled, true);
});

test('requireRole middleware allows user when passed roles as an array', () => {
  const middleware = requireRole(['admin', 'moderator']);
  let nextCalled = false;

  const req = { user: { userId: '789', role: 'admin' } };
  const res = {
    statusCode: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json() {
      return this;
    }
  };
  const next = () => {
    nextCalled = true;
  };

  middleware(req, res, next);
  assert.equal(nextCalled, true);
});

test('requireRole middleware returns 403 Forbidden when user role does not match', () => {
  const middleware = requireRole('admin', 'moderator');
  let nextCalled = false;

  const req = { user: { userId: '123', role: 'user' } };
  const res = {
    statusCode: null,
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    }
  };
  const next = () => {
    nextCalled = true;
  };

  middleware(req, res, next);
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.jsonData, { message: 'Access denied. Insufficient permissions' });
});

test('requireRole middleware returns 401 Unauthorized when req.user is missing', () => {
  const middleware = requireRole('admin', 'moderator');
  let nextCalled = false;

  const req = {};
  const res = {
    statusCode: null,
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    }
  };
  const next = () => {
    nextCalled = true;
  };

  middleware(req, res, next);
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.jsonData, { message: 'Access denied. Authentication required' });
});

test('JWT signed with role can be decoded and verified', () => {
  const secret = 'test_secret_key';
  const token = jwt.sign({ userId: 'u1', role: 'admin' }, secret, { expiresIn: '1h' });
  const decoded = jwt.verify(token, secret);

  assert.equal(decoded.userId, 'u1');
  assert.equal(decoded.role, 'admin');
});
