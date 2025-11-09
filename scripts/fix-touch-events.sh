#!/bin/bash

# 모든 TypeScript/TSX 파일에서 터치 이벤트의 undefined 체크 추가

find src -name "*.ts" -o -name "*.tsx" | while read file; do
  # e.touches.length를 e.touches && e.touches.length로 변경
  sed -i 's/if (e\.touches\.length/if (e.touches \&\& e.touches.length/g' "$file"

  # e.changedTouches.length를 e.changedTouches && e.changedTouches.length로 변경
  sed -i 's/if (e\.changedTouches\.length/if (e.changedTouches \&\& e.changedTouches.length/g' "$file"

  # console.log에서 e.changedTouches.length를 e.changedTouches?.length로 변경
  sed -i 's/changedTouchesLength: e\.changedTouches\.length/changedTouchesLength: e.changedTouches?.length/g' "$file"

  # console.log에서 e.touches.length를 e.touches?.length로 변경
  sed -i 's/touchesLength: e\.touches\.length/touchesLength: e.touches?.length/g' "$file"
done

echo "Touch event safety checks added!"
