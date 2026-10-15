@echo off
chcp 65001 >nul
echo ========================================================
echo  [JSPen Studio] 단일 실행 파일 (.exe) 빌드 도구
echo ========================================================
echo.
echo PyInstaller 패키지를 확인하고 설치합니다...
pip install pyinstaller

echo.
echo 단독 실행 파일(JSPenStudio.exe)로 패키징을 시작합니다...
pyinstaller --noconsole --onefile --name "JSPenStudio" --add-data "index.html;." --add-data "css;css" --add-data "js;js" main.py

echo.
echo ========================================================
echo  [빌드 완료] dist\JSPenStudio.exe 파일이 생성되었습니다.
echo ========================================================
pause
