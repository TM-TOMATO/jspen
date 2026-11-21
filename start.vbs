' JSPen Studio launcher without a console window.
' Double-click this file (Windows Script Host runs it hidden).
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
here = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = here
args = ""
For Each a In WScript.Arguments
  args = args & " """ & a & """"
Next
' 0 = hidden window; pythonw has no console of its own.
sh.Run "pythonw """ & here & "\main.py""" & args, 0, False
