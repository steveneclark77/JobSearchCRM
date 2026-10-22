#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
(cd frontend && npm ci && npm run build)
(cd backend && "${MVN:-mvn}" clean package)
echo 'Built backend/target/jobcrm-0.1.0.jar. Start with ./scripts/start.sh'
