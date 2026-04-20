#!/bin/bash
set -euo pipefail

source ~/.nvm/nvm.sh 2>/dev/null || true

cd ~/nova/inkroad-app

# WSL mirrored networking is the preferred fix.
# Do not force a Windows host IP from inside WSL.
unset REACT_NATIVE_PACKAGER_HOSTNAME

echo ">>> Expo를 고정 IP 없이 시작합니다."
exec ./node_modules/.bin/expo start "$@"
