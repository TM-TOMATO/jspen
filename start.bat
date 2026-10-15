@echo off
:: JSPen Studio - Native Desktop Application Launcher
:: 검은색 콘솔 창 없이 순수 네이티브 윈도우 창으로 즉시 실행합니다.

start "" pythonw "%~dp0main.py"
exit /b
