const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const User = require('../src/models/User');
const { updateUserRoleSchema } = require('../src/middlewares/validators');
const userController = require('../src/controllers/user.controller');

describe('User Role Management & Safeguards', () => {
  it('updateUserRoleSchema accepts valid roles and rejects invalid roles', () => {
    assert.equal(updateUserRoleSchema.safeParse({ role: 'user' }).success, true);
    assert.equal(updateUserRoleSchema.safeParse({ role: 'moderator' }).success, true);
    assert.equal(updateUserRoleSchema.safeParse({ role: 'admin' }).success, true);

    // Invalid roles
    assert.equal(updateUserRoleSchema.safeParse({ role: 'superadmin' }).success, false);
    assert.equal(updateUserRoleSchema.safeParse({ role: '' }).success, false);
    assert.equal(updateUserRoleSchema.safeParse({}).success, false);
  });

  it('blocks self-demotion if user is the last remaining admin', async () => {
    const originalFindById = User.findById;
    const originalCount = User.countDocuments;

    const mockAdmin = {
      _id: 'admin_1',
      name: 'Admin One',
      email: 'admin1@example.com',
      role: 'admin',
      save: async () => {}
    };

    User.findById = async () => mockAdmin;
    User.countDocuments = async () => 1; // Only 1 admin in the system

    try {
      const req = {
        params: { id: 'admin_1' },
        user: { userId: 'admin_1', role: 'admin' },
        body: { role: 'moderator' }
      };

      let statusCode = 200;
      let responseBody = null;
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          responseBody = data;
          return this;
        }
      };

      await userController.updateUserRole(req, res);

      assert.equal(statusCode, 400);
      assert.deepEqual(responseBody, {
        message: 'Cannot demote the last remaining admin in the system'
      });
    } finally {
      User.findById = originalFindById;
      User.countDocuments = originalCount;
    }
  });

  it('allows self-demotion if multiple admins exist', async () => {
    const originalFindById = User.findById;
    const originalCount = User.countDocuments;

    let saved = false;
    const mockAdmin = {
      _id: 'admin_1',
      name: 'Admin One',
      email: 'admin1@example.com',
      role: 'admin',
      save: async () => {
        saved = true;
      }
    };

    User.findById = async () => mockAdmin;
    User.countDocuments = async () => 2; // 2 admins exist

    try {
      const req = {
        params: { id: 'admin_1' },
        user: { userId: 'admin_1', role: 'admin' },
        body: { role: 'user' }
      };

      let statusCode = 200;
      let responseBody = null;
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          responseBody = data;
          return this;
        }
      };

      await userController.updateUserRole(req, res);

      assert.equal(statusCode, 200);
      assert.equal(saved, true);
      assert.equal(mockAdmin.role, 'user');
      assert.equal(responseBody.message, 'User role updated successfully');
      assert.equal(responseBody.user.role, 'user');
    } finally {
      User.findById = originalFindById;
      User.countDocuments = originalCount;
    }
  });

  it('allows admin to promote another user to moderator or admin', async () => {
    const originalFindById = User.findById;

    let saved = false;
    const mockTargetUser = {
      _id: 'user_2',
      name: 'Bob',
      email: 'bob@example.com',
      role: 'user',
      save: async () => {
        saved = true;
      }
    };

    User.findById = async () => mockTargetUser;

    try {
      const req = {
        params: { id: 'user_2' },
        user: { userId: 'admin_1', role: 'admin' },
        body: { role: 'moderator' }
      };

      let statusCode = 200;
      let responseBody = null;
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          responseBody = data;
          return this;
        }
      };

      await userController.updateUserRole(req, res);

      assert.equal(statusCode, 200);
      assert.equal(saved, true);
      assert.equal(mockTargetUser.role, 'moderator');
      assert.equal(responseBody.message, 'User role updated successfully');
      assert.equal(responseBody.user.role, 'moderator');
    } finally {
      User.findById = originalFindById;
    }
  });
});
