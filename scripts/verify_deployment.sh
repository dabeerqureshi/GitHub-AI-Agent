#!/usr/bin/env bash
set -euo pipefail

BACKEND_URL="${1:-"http://localhost:8000"}"
FRONTEND_URL="${2:-"http://localhost:3000"}"

echo "=========================================================="
echo " GitHub AI Workspace Deployment Smoke & Health Verifier   "
echo "=========================================================="
echo "Backend:  ${BACKEND_URL}"
echo "Frontend: ${FRONTEND_URL}"
echo ""

PASS=0
FAIL=0

check_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="$3"

    echo -n "Checking ${name} (${url})... "
    response=$(curl -s -w "\n%{http_code}" "${url}" || echo "FAILED 000")
    http_code=$(echo "${response}" | tail -n1)
    body=$(echo "${response}" | sed '$d')

    if [ "${http_code}" = "${expected_status}" ]; then
        echo "✅ PASS (${http_code})"
        PASS=$((PASS + 1))
    else
        echo "❌ FAIL (Expected ${expected_status}, got ${http_code})"
        echo "Response: ${body}"
        FAIL=$((FAIL + 1))
    fi
}

# 1. Liveness check
check_endpoint "Backend Liveness Probe" "${BACKEND_URL}/healthz" "200"

# 2. Readiness check
check_endpoint "Backend Readiness Probe" "${BACKEND_URL}/readyz" "200"

# 3. System Status
check_endpoint "Backend System Diagnostics" "${BACKEND_URL}/api/v1/status" "200"

# 4. Security Headers
echo -n "Checking Security Headers on Backend Response... "
headers=$(curl -s -I "${BACKEND_URL}/healthz" || true)
if echo "${headers}" | grep -iq "X-Content-Type-Options: nosniff" && \
   echo "${headers}" | grep -iq "X-Frame-Options: DENY"; then
    echo "✅ PASS (Strict Security Headers Present)"
    PASS=$((PASS + 1))
else
    echo "❌ FAIL (Missing expected security headers)"
    FAIL=$((FAIL + 1))
fi

# 5. Correlation ID header
echo -n "Checking Request Correlation ID Propagation... "
if echo "${headers}" | grep -iq "X-Correlation-ID:"; then
    echo "✅ PASS (X-Correlation-ID Attached)"
    PASS=$((PASS + 1))
else
    echo "❌ FAIL (X-Correlation-ID missing from headers)"
    FAIL=$((FAIL + 1))
fi

# 6. Repos API
check_endpoint "Repository Listing API" "${BACKEND_URL}/api/v1/repos" "200"

# 7. Frontend Reachability (Optional warning if not running)
echo -n "Checking Frontend Web Application... "
if curl -s -f -o /dev/null "${FRONTEND_URL}"; then
    echo "✅ PASS (Frontend Available)"
    PASS=$((PASS + 1))
else
    echo "⚠️  INFO (Frontend not running at ${FRONTEND_URL} - skipped)"
fi

echo ""
echo "=========================================================="
echo " Summary: ${PASS} passed, ${FAIL} failed"
echo "=========================================================="

if [ "${FAIL}" -gt 0 ]; then
    exit 1
fi
exit 0
