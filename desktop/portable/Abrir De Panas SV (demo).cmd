@echo off
title De Panas SV (demo)
set DEPANAS_DEMO=1
"%~dp0node\node.exe" "%~dp0app\iniciar.mjs"
if errorlevel 1 pause
