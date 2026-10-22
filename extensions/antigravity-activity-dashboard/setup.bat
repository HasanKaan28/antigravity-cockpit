@echo off
title Antigravity Cockpit & Skills Auto-Installer
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
pause
