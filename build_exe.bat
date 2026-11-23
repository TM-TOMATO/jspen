@echo off
rem JSPen Studio - build the Windows executable.
rem This file is intentionally ASCII-only: cmd.exe misreads UTF-8 batch files.
rem All Korean messages are printed by build_exe.py.
setlocal
cd /d "%~dp0"

set "PY=python"
where python >nul 2>nul || set "PY=py -3"

echo ========================================================
echo  JSPen Studio - build JSPenStudio.exe
echo ========================================================
echo [1/2] Installing packages (requirements.txt + pyinstaller)...
%PY% -m pip install -r requirements.txt pyinstaller
if errorlevel 1 goto error

echo [2/2] Building...
rem Options: --installer (Setup.exe, needs Inno Setup 6), --onefile (single exe), --no-prune, --no-selftest
%PY% build_exe.py %*
if errorlevel 1 goto error

echo.
echo Done: dist\JSPenStudio\JSPenStudio.exe  (installer: dist\installer)
pause
exit /b 0

:error
echo.
echo [ERROR] Build failed. See the messages above.
pause
exit /b 1
