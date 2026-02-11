# P1-2 Input Validation - Quick Reference

**Security Level**: P1-2 CRITICAL
**Last Updated**: 2026-02-09

---

## 🚀 Quick Start

### 1. Validate Input in Node.js

```typescript
import { validateFeedbackInput } from './helpers/inputValidator';

const result = validateFeedbackInput(req.body);

if (!result.valid) {
  return res.status(400).json({ errors: result.errors });
}

// Use sanitized data
await db.insert('conversation_feedback', result.sanitized);
```

### 2. Detect SQL Injection

```typescript
import { detectSQLInjection } from './helpers/inputValidator';

if (detectSQLInjection(userInput)) {
  // Log security event
  // Block request
  throw new Error('Malicious input detected');
}
```

### 3. Sanitize Text

```typescript
import { sanitizeInput } from './helpers/inputValidator';

const clean = sanitizeInput(dirtyInput);
```

---

## 📊 Validation Rules

### conversation_feedback

| Field | Rules | Example |
|-------|-------|---------|
| feedback_type | thumbs_up, thumbs_down, star_rating, emoji | 'star_rating' |
| rating | 1-5 or NULL | 5 |
| reason | 1-2000 chars, no SQL/XSS | 'Great service!' |
| metadata | Valid JSONB, no dangerous keys | {shop_id: 1} |

### owner_corrections

| Field | Rules | Example |
|-------|-------|---------|
| original_response | 1-10000 chars, no SQL/XSS | 'Wrong answer' |
| corrected_answer | 1-10000 chars, no SQL/XSS | 'Correct answer' |
| priority | low, normal, high, urgent | 'high' |
| correction_context | 1-2000 chars or NULL | 'When asked about pricing' |

### learning_queue

| Field | Rules | Example |
|-------|-------|---------|
| status | pending, approved, rejected, applied | 'pending' |
| source_type | feedback, correction, transcript, manual | 'correction' |
| proposed_content | 1-10000 chars, no SQL/XSS | 'New knowledge' |
| confidence_score | 0-100 or NULL | 85 |

### response_analytics

| Field | Rules | Example |
|-------|-------|---------|
| response_text | No SQL/XSS | 'Here is the info' |
| response_time_ms | >= 0 | 150 |
| user_engagement_score | 0-100 or NULL | 75 |

### voice_transcripts

| Field | Rules | Example |
|-------|-------|---------|
| transcript | 1-50000 chars, no SQL/XSS | 'Customer said...' |
| sentiment | positive, neutral, negative, mixed or NULL | 'neutral' |
| entities | Valid JSONB, no dangerous keys | [{type: 'time'}] |

---

## 🛡️ Security Patterns Blocked

### SQL Injection (13 patterns)

```javascript
// ❌ BLOCKED
"text' UNION SELECT * FROM users --"
"text; DROP TABLE users"
"text OR 1=1"
"text' OR '1'='1"
"; EXECUTE('...')"
"0x48454C4C4F"  // hex encoding
"waitfor delay '00:00:10'"
"text; GO"

// ✅ ALLOWED
"safe text with apostrophes"
"I liked the service"
"Price is $50.00"
```

### XSS (7 patterns)

```javascript
// ❌ BLOCKED
"text<script>alert('XSS')</script>"
"<img src=x onerror='alert(1)'>"
"<a href='javascript:alert(1)'>link</a>"
"<iframe src='evil.com'></iframe>"
"&#72;&#69;&#76;&#76;&#79;"  // HTML entities

// ✅ ALLOWED
"I liked the <3 and > symbol"
"Price is > $50"
"Use <b>bold</b> for emphasis"  // if allowed by business
```

### Knowledge Poisoning

```javascript
// ❌ BLOCKED
"text\x00with\x00null\x00bytes"
"text\x01with\x02control\x03chars"  // except \n, \t, \r
{"__proto__": "evil"}
{"constructor": "attack"}
"Oversized data"  // > 1MB for JSONB

// ✅ ALLOWED
"text with unicode: éáí"
"text\nwith\nnewlines"
"normal\ttabs\tallowed"
```

---

## 🧪 Testing

### Run All Tests

```bash
# Local
psql -h localhost -U jhazy -d nexxt_db \
  -f database/test_input_validation.sql

# VPS
./scripts/validate-p1-security.sh vps
```

### Expected Results

```
40 tests total
40 passed
0 failed
100% pass rate
```

---

## 📈 Performance

| Operation | Time | Status |
|-----------|------|--------|
| sanitize_text_input() | 0.5ms | ✅ |
| detect_sql_injection() | 1.8ms | ✅ |
| detectXSS() | 1.5ms | ✅ |
| **Total trigger overhead** | **4.2ms** | ✅ |

---

## 🚨 Error Messages

### Database Errors

```
'Invalid JSONB metadata structure for conversation_feedback'
'SQL injection pattern detected in feedback_reason'
'XSS pattern detected in feedback_reason'
'Confidence score must be between 0 and 100'
'Response time must be >= 0'
```

### Node.js Errors

```typescript
// Validation result
{
  valid: false,
  errors: [
    'Rating must be between 1 and 5',
    'Invalid feedback_type'
  ],
  sanitized: { ... }
}
```

---

## 🔧 Common Tasks

### Add Validation to API Route

```typescript
// 1. Import validator
import { validateFeedbackInput } from './helpers/inputValidator';

// 2. Validate input
const result = validateFeedbackInput(req.body);
if (!result.valid) {
  return res.status(400).json({ errors: result.errors });
}

// 3. Use sanitized data
await db.insert('conversation_feedback', result.sanitized);
```

### Check for Specific Patterns

```typescript
import { detectSQLInjection, detectXSS } from './helpers/inputValidator';

// SQL injection
if (detectSQLInjection(input)) {
  console.error('SQL injection detected!');
  // Log to security monitoring
  // Block request
}

// XSS
if (detectXSS(input)) {
  console.error('XSS detected!');
  // Log to security monitoring
  // Block request
}
```

### Validate Email/UUID

```typescript
import { isValidEmail, isValidUUID } from './helpers/inputValidator';

// Email
if (!isValidEmail(userEmail)) {
  return res.status(400).json({ error: 'Invalid email format' });
}

// UUID
if (!isValidUUID(conversationId)) {
  return res.status(400).json({ error: 'Invalid conversation ID' });
}
```

---

## 📚 Full Documentation

- **Implementation Guide**: `docs/P1_INPUT_VALIDATION_GUIDE.md`
- **Test Results**: `docs/P1_VALIDATION_TEST_RESULTS.md`
- **Delivery Summary**: `docs/P1_DELIVERY_SUMMARY.md`

---

## 🆘 Troubleshooting

### Issue: "SQL injection detected" on valid input

**Cause**: Text contains harmless pattern like "1=1"

**Solution**: Review detection pattern, adjust if needed

### Issue: Performance degradation

**Cause**: Triggers adding overhead on bulk inserts

**Solution**: Temporarily disable triggers for bulk ops

```sql
ALTER TABLE conversation_feedback DISABLE TRIGGER trg_validate_feedback;
-- Perform bulk insert
ALTER TABLE conversation_feedback ENABLE TRIGGER trg_validate_feedback;
```

### Issue: Too strict for legitimate content

**Cause**: Business needs special characters

**Solution**: Add whitelist for specific cases (see guide)

---

## 🔐 Security Checklist

- ✅ Input validated at application layer
- ✅ Parameterized queries used
- ✅ Never trust client-side validation
- ✅ Log security events
- ✅ Monitor validation failure rate
- ✅ Review dangerous patterns regularly
- ✅ Keep patterns updated

---

## 🚀 Deployment

```bash
# Deploy to VPS
./scripts/validate-p1-security.sh vps

# Rollback (if needed)
./scripts/validate-p1-security.sh vps --rollback
```

---

**Version**: 1.0.0
**Status**: Production Ready ✅
**Security**: P1-2 CRITICAL
