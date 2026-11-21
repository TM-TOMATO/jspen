@echo off
:: JSPen Studio launcher. A .bat file always opens a console briefly;
:: use start.vbs or JSPenStudio.pyw for a launch without any console window.
if exist "%~dp0start.vbs" (
  wscript "%~dp0start.vbs" %*
) else (
  start "" pythonw "%~dp0main.py" %*
)
exit /b
