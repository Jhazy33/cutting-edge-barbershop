# Feedback API Tests - Implementation Checklist

## Status: ✅ TESTS CREATED - READY FOR VALIDATION

This checklist guides you through validating and running the comprehensive test suite for the Feedback API endpoints.

---

## 📋 Pre-Implementation Checklist

### Environment Setup

- [ ] **Node.js installed**: Version 20.x or higher
  ```bash
  node --version  # Should be v20.x.x
  ```

- [ ] **PostgreSQL running**: Database server is accessible
  ```bash
  pg_isready  # Should reply with "accepting connections"
  ```

- [ ] **Database migrations applied**: Learning tables created
  ```bash
  psql -U postgres -d postgres -c "\dt learning_queue"
  # Should show learning_queue table
  ```

- [ ] **Environment variables configured**: `.env` file exists
  ```bash
  cat .env | grep -E "DB_|PORT"
  # Should show DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
  ```

### Dependencies

- [ ] **Install npm packages**
  ```bash
  cd services/handoff-api
  npm install
  ```

- [ ] **Verify Vitest installed**
  ```bash
  npx vitest --version
  # Should show 1.0.0 or higher
  ```

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Install Dependencies

```bash
cd services/handoff-api
npm install
```

**Expected Output**:
```
added 127 packages, and audited 128 packages in 5s
```

### Step 2: Verify Test Configuration

```bash
cat vitest.config.ts
```

**Expected**: File exists with test configuration

### Step 3: Run Tests

```bash
npm test
```

**Expected Output**:
```
✓ POST /api/feedback/rating (25)
✓ POST /api/feedback/correction (20)
✓ POST /api/feedback/voice-correction (18)
✓ GET /api/feedback/pending (12)
✓ POST /api/feedback/approve (10)
✓ Integration Tests (6)
✓ Performance Tests (2)
✓ Security Tests (10)

Test Files  1 passed (1)
     Tests  80+ passed (80+)
  Duration  2.5s (transform 234ms, setup 0ms, collect 342ms, tests 2500ms)
```

---

## 📊 Test Coverage Validation

### Generate Coverage Report

```bash
npm run test:coverage
```

**Expected**: Coverage report generated in `coverage/` directory

### View HTML Coverage Report

```bash
open coverage/index.html  # macOS
# or
xdg-open coverage/index.html  # Linux
# or
start coverage/index.html  # Windows
```

### Coverage Targets

Verify coverage meets these targets:

- [ ] **Statement Coverage**: 95%+
- [ ] **Branch Coverage**: 90%+
- [ ] **Function Coverage**: 95%+
- [ ] **Line Coverage**: 95%+

---

## 🔍 Test Suite Breakdown

### Endpoint-Specific Tests

#### POST /api/feedback/rating (25 tests)

**Success Scenarios** (5 tests)
- [ ] Valid thumbs_up feedback accepted
- [ ] Valid thumbs_down feedback accepted
- [ ] Valid star_rating (1-5) accepted
- [ ] Metadata stored correctly
- [ ] Emoji feedback type accepted

**Validation Scenarios** (6 tests)
- [ ] Missing conversationId rejected
- [ ] Invalid feedbackType rejected
- [ ] Star_rating without rating rejected
- [ ] Rating out of range rejected (0, 6, -1, 100)

**Trigger Functionality** (3 tests)
- [ ] Learning queue entry created for thumbs_down
- [ ] Learning queue entry created for low star ratings
- [ ] NO learning queue entry for thumbs_up

**Error Scenarios** (2 tests)
- [ ] Malformed JSON handled
- [ ] Database errors handled

**Security Tests** (4 tests)
- [ ] SQL injection prevented
- [ ] XSS attempts sanitized
- [ ] Long inputs handled
- [ ] Special characters handled

#### POST /api/feedback/correction (20 tests)

**Success Scenarios** (6 tests)
- [ ] All priorities accepted (low, normal, high, urgent)
- [ ] Correction context stored
- [ ] SubmittedBy information stored

**Validation Scenarios** (5 tests)
- [ ] Missing originalResponse rejected
- [ ] Missing correctedAnswer rejected
- [ ] Invalid priority rejected
- [ ] Empty fields rejected

**Trigger Functionality** (3 tests)
- [ ] Learning queue entry created
- [ ] Auto-approval for urgent priority
- [ ] Confidence scores set correctly:
  - urgent: 95
  - high: 85
  - normal: 70
  - low: 50

**Security Tests** (4 tests)
- [ ] SQL injection prevented
- [ ] XSS attempts sanitized

#### POST /api/feedback/voice-correction (18 tests)

**Success Scenarios** (7 tests)
- [ ] All sentiments accepted (positive, neutral, negative, mixed)
- [ ] Detected entities stored
- [ ] Audio duration stored
- [ ] Optional fields work correctly

**Validation Scenarios** (5 tests)
- [ ] Missing transcript rejected
- [ ] Invalid sentiment rejected
- [ ] Confidence scores validated (0-1)

**Trigger Functionality** (2 tests)
- [ ] Learning queue entry created
- [ ] Metadata stored correctly

**Security Tests** (3 tests)
- [ ] SQL injection prevented
- [ ] Large transcripts handled

#### GET /api/feedback/pending (12 tests)

**Success Scenarios** (6 tests)
- [ ] Get all pending items
- [ ] Filter by shopId
- [ ] Filter by sourceType
- [ ] Pagination works (limit/offset)
- [ ] Multiple filters combined

**Validation Scenarios** (6 tests)
- [ ] Negative shopId rejected
- [ ] Invalid limit rejected (>100, <1)
- [ ] Negative offset rejected
- [ ] Invalid sourceType rejected
- [ ] Non-numeric shopId rejected

#### POST /api/feedback/approve (10 tests)

**Success Scenarios - Approve** (3 tests)
- [ ] Approve pending item
- [ ] Approve with reviewer info
- [ ] Approve without reviewerId

**Success Scenarios - Reject** (2 tests)
- [ ] Reject pending item
- [ ] Reject with reason

**Validation Scenarios** (3 tests)
- [ ] Missing itemId rejected
- [ ] Invalid action rejected
- [ ] Non-string itemId rejected

**Error Scenarios** (2 tests)
- [ ] Non-existent itemId returns 404
- [ ] Already processed item returns 409

### Integration Tests (6 tests)

- [ ] Complete feedback workflow (rating → queue → approve)
- [ ] Correction workflow with auto-approval
- [ ] Voice correction workflow
- [ ] Trigger verification (thumbs_down)
- [ ] Trigger verification (urgent correction)
- [ ] Trigger verification (voice correction)

### Performance Tests (2 tests)

- [ ] Single request < 500ms
- [ ] Batch requests (10 concurrent) < 2s

### Security Tests (10+ tests)

- [ ] SQL injection prevented (all text inputs)
- [ ] XSS sanitized
- [ ] Input length limits enforced
- [ ] Special characters handled
- [ ] Unicode characters supported

---

## 🧪 Manual Testing Scenarios

### Test Database Triggers

After running tests, verify triggers in database:

```bash
# Connect to database
psql -U postgres -d postgres

# Check for learning queue entries from thumbs_down
SELECT * FROM learning_queue
WHERE source_type = 'feedback'
AND metadata->>'feedback_type' = 'thumbs_down'
LIMIT 5;

# Check for auto-approved urgent corrections
SELECT * FROM learning_queue
WHERE source_type = 'correction'
AND status = 'approved'
AND metadata->>'priority' = 'urgent'
LIMIT 5;

# Check for voice correction entries
SELECT * FROM learning_queue
WHERE source_type = 'transcript'
LIMIT 5;
```

**Expected**: Results show trigger-created entries

### Test Data Cleanup

Verify cleanup is working:

```bash
# Before tests
psql -U postgres -d postgres -c "
SELECT COUNT(*) FROM feedback_ratings
WHERE conversation_id LIKE 'conv_%';
"

# After running tests
psql -U postgres -d postgres -c "
SELECT COUNT(*) FROM feedback_ratings
WHERE conversation_id LIKE 'conv_%';
"
```

**Expected**: Count is same before/after (cleanup worked)

---

## 📈 Performance Benchmarks

### Expected Performance

| Operation | Target | Actual |
|-----------|--------|--------|
| Single request | < 500ms | ___ |
| Batch (10 requests) | < 2000ms | ___ |
| Test suite total | < 10000ms | ___ |

### Measure Performance

```bash
# Run tests with timing
npm test

# Check output for duration
```

---

## 🔐 Security Validation

### SQL Injection Tests

Verify these test cases pass:

- [ ] `conversationId = "'; DROP TABLE feedback_ratings;--"`
- [ ] `originalResponse = "'; DELETE FROM learning_queue;--"`
- [ ] `transcript = "'; DROP TABLE voice_corrections;--"`

**Expected**: All rejected or sanitized, no SQL errors

### XSS Tests

Verify these test cases pass:

- [ ] `<script>alert('xss')</script>` in conversationId
- [ ] `<img src=x onerror=alert('xss')>` in text fields

**Expected**: Sanitized or rejected

---

## 📝 Documentation Review

### Documentation Files Created

- [x] `tests/feedback-api.test.ts` - Main test suite
- [x] `tests/setup.ts` - Database helpers (existed)
- [x] `tests/test-data.ts` - Test fixtures (existed)
- [x] `tests/README.md` - Testing guide
- [x] `tests/TEST_SUMMARY.md` - Test summary
- [x] `tests/QUICK_START.md` - Quick start guide
- [x] `tests/IMPLEMENTATION_CHECKLIST.md` - This file
- [x] `package.json` - Updated with test scripts
- [x] `vitest.config.ts` - Test configuration (existed)

### Documentation Review Checklist

- [ ] README is clear and comprehensive
- [ ] Quick start guide is easy to follow
- [ ] Test summary covers all scenarios
- [ ] Implementation checklist is actionable
- [ ] Code comments are helpful
- [ ] Examples are provided

---

## ✅ Acceptance Criteria

### All Tests Pass

- [ ] All 80+ tests pass
- [ ] No skipped tests
- [ ] No pending tests
- [ ] Duration < 10 seconds

### Coverage Meets Targets

- [ ] Statement coverage ≥ 95%
- [ ] Branch coverage ≥ 90%
- [ ] Function coverage ≥ 95%
- [ ] Line coverage ≥ 95%

### No Critical Issues

- [ ] No failing tests
- [ ] No timeout errors
- [ ] No memory leaks
- [ ] No database connection issues

### Documentation Complete

- [ ] README is comprehensive
- [ ] Quick start guide works
- [ ] Test summary is accurate
- [ ] Code is well-commented

---

## 🐛 Troubleshooting

### Common Issues and Solutions

#### Issue: "Cannot find module 'vitest'"

**Solution**:
```bash
npm install
```

#### Issue: "Database connection error"

**Solution**:
```bash
# Check PostgreSQL is running
pg_isready

# Verify .env file
cat .env

# Test connection
psql -U postgres -d postgres -c "SELECT 1;"
```

#### Issue: Tests timeout

**Solution**:
```bash
# Increase timeout in vitest.config.ts
testTimeout: 30000  # 30 seconds
hookTimeout: 30000
```

#### Issue: Low coverage

**Solution**:
```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html

# Identify uncovered lines
# Add tests for uncovered code
```

#### Issue: Cleanup not working

**Solution**:
```bash
# Manually clean test data
psql -U postgres -d postgres -c "
DELETE FROM voice_corrections WHERE conversation_id LIKE 'conv_%';
DELETE FROM feedback_corrections WHERE conversation_id LIKE 'conv_%';
DELETE FROM feedback_ratings WHERE conversation_id LIKE 'conv_%';
DELETE FROM learning_queue WHERE source_type IN ('correction', 'voice_correction');
"
```

---

## 📞 Support and Resources

### Documentation

- **Detailed Guide**: `tests/README.md`
- **Quick Start**: `tests/QUICK_START.md`
- **Test Summary**: `tests/TEST_SUMMARY.md`
- **API Documentation**: `docs/FEEDBACK_API.md`

### External Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [AAA Pattern](https://github.com/testdouble/contributing-tests/wiki)

### Getting Help

1. Check documentation files
2. Review test code comments
3. Check error messages
4. Review troubleshooting section
5. Check Vitest documentation

---

## 🎯 Next Steps

### Immediate (Today)

1. [ ] Run `npm install`
2. [ ] Run `npm test`
3. [ ] Review results
4. [ ] Fix any failures

### Short Term (This Week)

1. [ ] Generate coverage report
2. [ ] Address any coverage gaps
3. [ ] Performance test with real data
4. [ ] Security test with real attack vectors

### Long Term (Next Sprint)

1. [ ] Add load testing
2. [ ] Add fuzz testing
3. [ ] Set up CI/CD pipeline
4. [ ] Integrate with deployment process

---

## ✨ Success Criteria

You'll know the test suite is successful when:

- ✅ All tests pass consistently
- ✅ Coverage meets 95%+ target
- ✅ Tests run in under 10 seconds
- ✅ No manual intervention needed
- ✅ Easy to understand and maintain
- ✅ Catches real bugs
- ✅ Team feels confident deploying

---

**Created**: 2025-02-09
**Status**: Ready for validation
**Maintainer**: Test Engineer
**Framework**: Vitest 1.0.0
**Total Tests**: 80+
**Target Coverage**: 95%+

---

## 🎉 Congratulations!

You've created a comprehensive test suite for the Feedback API with:

- 80+ test cases covering all scenarios
- 95%+ code coverage target
- Integration, performance, and security tests
- Comprehensive documentation
- Easy-to-run test commands

Happy testing! 🚀
