# Feedback API Test Suite

Comprehensive integration test suite for the Feedback API endpoints.

## Test Coverage

### Endpoints Tested

1. **POST /api/feedback/rating** - Submit conversation feedback
   - Thumbs up/down feedback
   - Star ratings (1-5)
   - Emoji reactions
   - Metadata handling
   - Trigger verification (learning_queue creation)

2. **POST /api/feedback/correction** - Submit owner corrections
   - All priority levels (low, normal, high, urgent)
   - Auto-approval for urgent priority
   - Confidence score calculation
   - Learning queue entry creation

3. **POST /api/feedback/voice-correction** - Submit voice transcripts
   - Sentiment analysis (positive, neutral, negative, mixed)
   - Entity extraction
   - Confidence scores
   - Audio metadata

4. **GET /api/feedback/pending** - Retrieve pending corrections
   - Filtering by shop_id
   - Filtering by status
   - Pagination (limit/offset)
   - Source type filtering

5. **POST /api/feedback/approve** - Approve/reject corrections
   - Approval workflow
   - Rejection with reasons
   - Status updates
   - Reviewer tracking

### Test Categories

- **Success Scenarios**: Valid inputs, happy path
- **Validation Scenarios**: Invalid inputs, missing fields, type errors
- **Error Scenarios**: Database errors, connection failures
- **Trigger Functionality**: Learning queue entry creation
- **Integration Tests**: End-to-end workflows
- **Performance Tests**: Response time thresholds
- **Security Tests**: SQL injection, XSS, input sanitization

## Test Statistics

- **Total Test Cases**: 80+
- **Target Coverage**: 95%+
- **Test Framework**: Vitest
- **Pattern**: AAA (Arrange, Act, Assert)

## Running Tests

### Prerequisites

1. Install dependencies:
```bash
cd services/handoff-api
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Ensure database is running and migrations are applied:
```bash
# Apply learning tables migration
psql -U postgres -d cutting_edge -f database/migrations/002_create_learning_tables.sql
```

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage Report

```bash
npm run test:coverage
```

Coverage report will be generated in `coverage/` directory.

### Run Specific Test File

```bash
npx vitest tests/feedback-api.test.ts
```

### Run Specific Test Suite

```bash
npx vitest -t "POST /api/feedback/rating"
```

## Test Structure

### File Organization

```
tests/
├── setup.ts                 # Database setup, cleanup, helpers
├── test-data.ts             # Test fixtures and data
├── feedback-api.test.ts     # Main test suite
├── feedback-api.integration.test.ts  # Integration tests
└── README.md               # This file
```

### AAA Pattern

All tests follow the Arrange-Act-Assert pattern:

```typescript
it('should accept valid thumbs_up feedback', async () => {
  // Arrange: Set up test data
  const payload = validThumbsUpFeedback;

  // Act: Execute the code under test
  const response = await makeRequest('POST', '/api/feedback/rating', payload);
  const data = await parseResponse(response);

  // Assert: Verify expected outcomes
  expect(response.status).toBe(201);
  expect(data.success).toBe(true);
  expect(data.data.feedbackType).toBe('thumbs_up');
});
```

### Test Data Management

- **Test Data**: Located in `test-data.ts`
- **Fixtures**: Reusable test data for all scenarios
- **Isolation**: Each test cleans up after itself
- **Transactions**: Database operations use transactions for rollback

## Database Setup

### Test Database Configuration

Tests use a separate test database to avoid affecting production data:

```typescript
// In tests/setup.ts
const testPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});
```

### Cleanup Strategy

- **Before Each**: Clean all test data
- **After Each**: Verify cleanup
- **Test Identifiers**: Use `conv_test_*` prefix for easy identification

### Helper Functions

```typescript
// Clean up test data
await cleanupTestData();

// Clean up specific conversation
await cleanupConversation('conv_test_123');

// Count rows in table
const count = await countRows('feedback_ratings');

// Check if learning queue entry exists
const exists = await learningQueueEntryExists(sourceId, sourceType);
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

## Troubleshooting

### Common Issues

#### Tests Fail with "Database Connection Error"

**Solution**: Ensure PostgreSQL is running and environment variables are set:

```bash
# Check PostgreSQL is running
pg_isready

# Check environment variables
echo $DB_HOST $DB_PORT $DB_NAME $DB_USER
```

#### Tests Timeout

**Solution**: Increase test timeout in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    testTimeout: 30000, // 30 seconds
    hookTimeout: 30000,
  },
});
```

#### Cleanup Fails

**Solution**: Manually clean test data:

```bash
psql -U postgres -d cutting_edge -c "
DELETE FROM voice_corrections WHERE conversation_id LIKE 'conv_%';
DELETE FROM feedback_corrections WHERE conversation_id LIKE 'conv_%';
DELETE FROM feedback_ratings WHERE conversation_id LIKE 'conv_%';
DELETE FROM learning_queue WHERE source_type IN ('correction', 'voice_correction');
"
```

## Best Practices

### Writing New Tests

1. **Use AAA Pattern**: Arrange, Act, Assert
2. **Test Behavior, Not Implementation**: Focus on what users see
3. **One Assertion Per Test**: Keep tests focused
4. **Descriptive Names**: Test names should describe the scenario
5. **Isolated Tests**: Each test should be independent

### Example Test Template

```typescript
describe('FEATURE_NAME', () => {

  describe('SUCCESS SCENARIOS', () => {

    it('should do something when valid input provided', async () => {
      // Arrange
      const payload = { /* valid data */ };

      // Act
      const result = await functionUnderTest(payload);

      // Assert
      expect(result).toBe(expected);
    });
  });

  describe('VALIDATION SCENARIOS', () => {

    it('should reject invalid input', async () => {
      // Arrange
      const payload = { /* invalid data */ };

      // Act
      const result = await functionUnderTest(payload);

      // Assert
      expect(result.error).toBeDefined();
    });
  });

  describe('ERROR SCENARIOS', () => {

    it('should handle database errors gracefully', async () => {
      // Arrange
      // Mock database failure

      // Act
      const result = await functionUnderTest(payload);

      // Assert
      expect(result.status).toBe(500);
    });
  });
});
```

## Coverage Goals

### Target Metrics

- **Statement Coverage**: 95%+
- **Branch Coverage**: 90%+
- **Function Coverage**: 95%+
- **Line Coverage**: 95%+

### View Coverage Report

```bash
npm run test:coverage

# Open HTML report
open coverage/index.html
```

## Contributing

### Adding New Tests

1. Create test data in `test-data.ts`
2. Add test cases to appropriate test suite
3. Follow AAA pattern
4. Run tests to verify
5. Check coverage report

### Test Checklist

- [ ] Test follows AAA pattern
- [ ] Test is isolated (no dependencies on other tests)
- [ ] Test has descriptive name
- [ ] Test covers success scenario
- [ ] Test covers validation scenario
- [ ] Test covers error scenario
- [ ] Test data is in `test-data.ts`
- [ ] Test cleans up after itself

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [AAA Pattern Explained](https://github.com/testdouble/contributing-tests/wiki/The-AAA-%28Arrange-Act-Assert%29-Pattern)

## Support

For issues or questions about the test suite:

1. Check this README
2. Review test code comments
3. Check Vitest documentation
4. Open an issue with reproduction steps

---

**Last Updated**: 2025-02-09
**Test Framework**: Vitest 1.0.0
**Node Version**: 20.x
