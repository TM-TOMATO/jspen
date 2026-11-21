@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo ========================================================
echo  [JSPen Studio] 실행 파일 빌드
echo ========================================================

rem Use the Python launcher when "python" is not on PATH.
set "PY=python"
where python >nul 2>nul || set "PY=py -3"

echo 필요한 패키지를 설치합니다...
%PY% -m pip install -r requirements.txt pyinstaller
if errorlevel 1 goto :error

rem Options: --onefile (single exe), --no-prune, --no-selftest
%PY% build_exe.py %*
if errorlevel 1 goto :error

echo.
echo 완료: dist\JSPenStudio\JSPenStudio.exe
pause
exit /b 0

:error
echo.
echo [오류] 빌드에 실패했습니다. 위 메시지를 확인하세요.
pause
exit /b 1
