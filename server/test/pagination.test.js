const test = require('node:test');
const assert = require('node:assert/strict');
const Problem = require('../src/models/problem');
const problemController = require('../src/controllers/problem.controller');

test('getAllProblems builds expected pagination and returns response structure', async () => {
  // Mock Problem.countDocuments and Problem.find
  const originalCount = Problem.countDocuments;
  const originalFind = Problem.find;

  let capturedFilter = null;
  let capturedSort = null;
  let capturedSkip = null;
  let capturedLimit = null;

  Problem.countDocuments = async (filter) => {
    capturedFilter = filter;
    return 25;
  };

  Problem.find = (filter) => {
    return {
      select(fields) {
        return {
          sort(sortObj) {
            capturedSort = sortObj;
            return {
              skip(skipNum) {
                capturedSkip = skipNum;
                return {
                  limit(limitNum) {
                    capturedLimit = limitNum;
                    return [
                      { _id: '1', title: 'Two Sum', difficulty: 'easy', tags: ['array'] },
                      { _id: '2', title: 'Three Sum', difficulty: 'medium', tags: ['array'] }
                    ];
                  }
                };
              }
            };
          }
        };
      }
    };
  };

  try {
    const req = {
      query: {
        page: '2',
        limit: '5',
        search: 'sum',
        difficulty: 'EASY',
        tags: 'array,hash-table',
        sortBy: 'title',
        sortOrder: 'asc'
      }
    };

    let responseData = null;
    const res = {
      json(data) {
        responseData = data;
      }
    };

    await problemController.getAllProblems(req, res);

    assert.ok(responseData);
    assert.equal(responseData.totalProblems, 25);
    assert.equal(responseData.totalPages, 5);
    assert.equal(responseData.currentPage, 2);
    assert.equal(responseData.limit, 5);
    assert.equal(responseData.count, 2);
    assert.equal(responseData.problems.length, 2);

    // Verify filter parameters
    assert.deepEqual(capturedFilter.difficulty, 'easy');
    assert.deepEqual(capturedFilter.tags, { $in: ['array', 'hash-table'] });
    assert.ok(capturedFilter.title.$regex);
    assert.equal(capturedFilter.title.$options, 'i');

    // Verify pagination params
    assert.equal(capturedSkip, 5); // (page 2 - 1) * 5
    assert.equal(capturedLimit, 5);
    assert.deepEqual(capturedSort, { title: 1 });
  } finally {
    Problem.countDocuments = originalCount;
    Problem.find = originalFind;
  }
});

test('getAllProblems falls back to safe defaults on empty query', async () => {
  const originalCount = Problem.countDocuments;
  const originalFind = Problem.find;

  let capturedFilter = null;
  let capturedSort = null;
  let capturedSkip = null;
  let capturedLimit = null;

  Problem.countDocuments = async (filter) => {
    capturedFilter = filter;
    return 0;
  };

  Problem.find = (filter) => {
    return {
      select(fields) {
        return {
          sort(sortObj) {
            capturedSort = sortObj;
            return {
              skip(skipNum) {
                capturedSkip = skipNum;
                return {
                  limit(limitNum) {
                    capturedLimit = limitNum;
                    return [];
                  }
                };
              }
            };
          }
        };
      }
    };
  };

  try {
    const req = { query: {} };
    let responseData = null;
    const res = {
      json(data) {
        responseData = data;
      }
    };

    await problemController.getAllProblems(req, res);

    assert.ok(responseData);
    assert.equal(responseData.totalProblems, 0);
    assert.equal(responseData.totalPages, 1);
    assert.equal(responseData.currentPage, 1);
    assert.equal(responseData.limit, 20);
    assert.deepEqual(capturedFilter, {});
    assert.deepEqual(capturedSort, { createdAt: -1 });
    assert.equal(capturedSkip, 0);
    assert.equal(capturedLimit, 20);
  } finally {
    Problem.countDocuments = originalCount;
    Problem.find = originalFind;
  }
});
