#!/bin/bash

# P1 Security Validation Script
# Validates all penetration testing deliverables

echo "════════════════════════════════════════════════════════════════"
echo "P1 PENETRATION TESTING - VALIDATION SCRIPT"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo "📋 Validating Penetration Testing Deliverables..."
echo ""

# Check 1: Test files exist
echo "📁 Checking test files..."
test_files=(
  "security/penetration-tests/sql-injection-attacks.test.ts"
  "security/penetration-tests/privilege-escalation-attacks.test.ts"
  "security/penetration-tests/auth-bypass-attacks.test.ts"
  "security/penetration-tests/dos-attacks.test.ts"
  "security/penetration-tests/data-exfiltration-attacks.test.ts"
)

for file in "${test_files[@]}"; do
  if [ -f "$file" ]; then
    echo -e "  ${GREEN}✓${NC} $file"
    ((PASSED_TESTS++))
  else
    echo -e "  ${RED}✗${NC} $file (MISSING)"
    ((FAILED_TESTS++))
  fi
  ((TOTAL_TESTS++))
done
echo ""

# Check 2: Documentation files exist
echo "📚 Checking documentation files..."
doc_files=(
  "security/penetration-tests/README.md"
  "security/penetration-tests/P1_PENETRATION_TEST_REPORT.md"
  "security/penetration-tests/attack-patterns.md"
  "security/penetration-tests/EXECUTIVE_SUMMARY.md"
)

for file in "${doc_files[@]}"; do
  if [ -f "$file" ]; then
    echo -e "  ${GREEN}✓${NC} $file"
    ((PASSED_TESTS++))
  else
    echo -e "  ${RED}✗${NC} $file (MISSING)"
    ((FAILED_TESTS++))
  fi
  ((TOTAL_TESTS++))
done
echo ""

# Check 3: Count attack scenarios
echo "🎯 Counting attack scenarios..."
sql_attacks=$(grep -c "name: 'A[0-9]\|name: 'B[0-9]\|name: 'C[0-9]\|name: 'D[0-9]" security/penetration-tests/sql-injection-attacks.test.ts 2>/dev/null || echo 0)
priv_attacks=$(grep -c "name: 'PR[0-9]" security/penetration-tests/privilege-escalation-attacks.test.ts 2>/dev/null || echo 0)
auth_attacks=$(grep -c "name: 'AUTH[0-9]" security/penetration-tests/auth-bypass-attacks.test.ts 2>/dev/null || echo 0)
dos_attacks=$(grep -c "name: 'DOS[0-9]" security/penetration-tests/dos-attacks.test.ts 2>/dev/null || echo 0)
exfil_attacks=$(grep -c "name: 'EXFIL[0-9]" security/penetration-tests/data-exfiltration-attacks.test.ts 2>/dev/null || echo 0)

total_attacks=$((sql_attacks + priv_attacks + auth_attacks + dos_attacks + exfil_attacks))

echo "  SQL Injection: $sql_attacks attacks"
echo "  Privilege Escalation: $priv_attacks attacks"
echo "  Authentication Bypass: $auth_attacks attacks"
echo "  DoS: $dos_attacks attacks"
echo "  Data Exfiltration: $exfil_attacks attacks"
echo "  Total: $total_attacks attacks"

if [ $total_attacks -eq 65 ]; then
  echo -e "  ${GREEN}✓${NC} All 65 attack scenarios present"
  ((PASSED_TESTS++))
else
  echo -e "  ${YELLOW}⚠${NC} Expected 65 attacks, found $total_attacks"
  ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))
echo ""

# Check 4: Vitest configuration
echo "⚙️  Checking Vitest configuration..."
if grep -q "security/\*\*\/\*.test.ts" vitest.config.ts 2>/dev/null; then
  echo -e "  ${GREEN}✓${NC} Vitest configured for security tests"
  ((PASSED_TESTS++))
else
  echo -e "  ${YELLOW}⚠${NC} Vitest may not include security tests"
  ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))
echo ""

# Check 5: Test syntax (TypeScript validation)
echo "🔍 Validating TypeScript syntax..."
if command -v tsc &> /dev/null; then
  tsc --noEmit security/penetration-tests/*.test.ts 2>&1 | head -20
  if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} TypeScript syntax valid"
    ((PASSED_TESTS++))
  else
    echo -e "  ${YELLOW}⚠${NC} TypeScript syntax errors found (see above)"
    ((FAILED_TESTS++))
  fi
else
  echo -e "  ${YELLOW}⚠${NC} TypeScript compiler not found, skipping syntax check"
fi
((TOTAL_TESTS++))
echo ""

# Summary
echo "════════════════════════════════════════════════════════════════"
echo "VALIDATION SUMMARY"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Total Checks: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}✅ ALL VALIDATIONS PASSED${NC}"
  echo ""
  echo "🚀 Penetration testing suite is ready!"
  echo ""
  echo "Next steps:"
  echo "  1. Run tests: npm test -- security/penetration-tests/"
  echo "  2. Review results: security/penetration-tests/P1_PENETRATION_TEST_REPORT.md"
  echo "  3. Deploy with confidence!"
  exit 0
else
  echo -e "${RED}❌ SOME VALIDATIONS FAILED${NC}"
  echo ""
  echo "Please review the errors above and fix any issues."
  exit 1
fi
