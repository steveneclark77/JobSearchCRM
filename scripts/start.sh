#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../backend"
umask 077
if [[ ! -f target/jobcrm-0.1.0.jar ]]; then
  echo 'Build first with ./scripts/build.sh' >&2
  exit 1
fi
exec "${JAVA_HOME:+$JAVA_HOME/bin/}java" -jar target/jobcrm-0.1.0.jar
