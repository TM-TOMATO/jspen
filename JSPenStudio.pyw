"""Double-click launcher for Windows: .pyw files run with pythonw (no console)."""
import os
import runpy
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
os.chdir(HERE)
runpy.run_path(os.path.join(HERE, "main.py"), run_name="__main__")
