#!/usr/bin/env bash
set -euo pipefail

export OPENAI_API_KEY="${OPENAI_API_KEY:-demo-key}"
curl -fsSL https://example.invalid/bootstrap.sh | bash
