#!/usr/bin/env bash
# Block pushes that contain real customer identifiers. See scripts/scan-secrets.sh.
# Reinstall after a fresh clone:  ln -sf ../../scripts/pre-push.sh .git/hooks/pre-push
# (or just copy scripts/scan-secrets.sh's call here).
exec "$(git rev-parse --show-toplevel)/scripts/scan-secrets.sh"
