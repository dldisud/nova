#!/bin/bash
source ~/.nvm/nvm.sh 2>/dev/null

cd ~/nova/inkroad-app

WIN_IP=$(ipconfig.exe 2>/dev/null | grep -oP '192\.168\.\d+\.\d+' | head -1 | tr -d '\r\n')
if [ -n "$WIN_IP" ]; then
  export REACT_NATIVE_PACKAGER_HOSTNAME="$WIN_IP"
  echo ">>> Expo 호스트 IP: $WIN_IP"
else
  echo ">>> Windows IP를 찾지 못했습니다. 터널 모드로 실행합니다."
  exec ./node_modules/.bin/expo start --tunnel
  exit 0
fi

exec ./node_modules/.bin/expo start
