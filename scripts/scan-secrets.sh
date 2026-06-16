#!/usr/bin/env bash
# Guard for this PUBLIC mockups repo: block real customer identifiers from ever
# being committed/pushed. Invoked automatically by .git/hooks/pre-push, and can
# be run by hand:  scripts/scan-secrets.sh
#
# If this ever fires, scrub the offending file (use generic sample values) before
# pushing. The mockups must only contain fictional data.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# Exclude this script (it necessarily contains the patterns) from the scan.
EXCLUDE=':(exclude)scripts/scan-secrets.sh'

# Unambiguous real identifiers (DE name, BU MIDs, SFMC subdomain, client-id
# prefixes). Case-insensitive; these never collide with normal words.
TOKENS='All_Patients_Opted_In|514018883|514018310|mcvxtx2z6j0zm8sr3052pf8bh508|llk9hw5piymg|xisl08u3w4ke'

hits=$(git grep -I -n -i -E "$TOKENS" -- . "$EXCLUDE" || true)

# The customer name on its own, matched as a whole word so it does NOT trip on
# "Memory"/"activememory" (which contain the letters "emory").
namehits=$(git grep -I -n -i -w -E 'Emory' -- . "$EXCLUDE" || true)

all="${hits}${namehits:+
$namehits}"

if [ -n "$all" ]; then
  echo "BLOCKED by scan-secrets: real customer identifiers found in tracked files:"
  echo
  echo "$all"
  echo
  echo "Scrub these to generic sample values before pushing to the public repo."
  exit 1
fi

echo "scan-secrets: clean — no real customer identifiers in tracked files."
