@echo off
chcp 65001 >nul
echo ========================================================
echo  [JSPen Studio] 단일 실행 파일 (.exe) 빌드 도구
echo ========================================================
echo.
echo PyInstaller 패키지를 확인하고 설치합니다...
pip install -r "%~dp0requirements.txt" pyinstaller
if errorlevel 1 (
  echo [오류] 패키지 설치에 실패했습니다.
  pause
  exit /b 1
)

echo.
echo 단독 실행 파일(JSPenStudio.exe)로 패키징을 시작합니다...
cd /d "%~dp0"
pyinstaller --noconsole --onefile --name "JSPenStudio" --add-data "index.html;." --add-data "css;css" --add-data "js;js" --add-data "templates;templates" main.py
if errorlevel 1 (
  echo [오류] 빌드에 실패했습니다. 위 로그를 확인하세요.
  pause
  exit /b 1
)

echo.
echo ========================================================
echo  [빌드 완료] dist\JSPenStudio.exe 파일이 생성되었습니다.
echo ========================================================
pause
