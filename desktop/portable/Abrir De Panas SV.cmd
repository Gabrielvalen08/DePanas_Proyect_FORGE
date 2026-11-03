@echo off
title De Panas SV
"%~dp0node\node.exe" "%~dp0app\iniciar.mjs"
if errorlevel 1 pause
