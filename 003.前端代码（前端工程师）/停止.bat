@echo off
chcp 65001 >nul
rem ============================================================
rem  Material System - stop services
rem
rem  This file is intentionally ASCII-only with CRLF line endings.
rem  cmd.exe parses .bat files using the system ANSI code page: UTF-8
rem  Chinese text gets garbled and then executed as commands, and
rem  LF-only line endings break the parser. All Chinese output lives
rem  in the Node scripts under backend/scripts (Node reads UTF-8 natively).
rem
rem  chcp 65001 above makes the console render the UTF-8 output that
rem  Node prints. That line is ASCII, so it is safe here.
rem ============================================================
cd /d "%~dp0"
node backend/scripts/stopper.js
pause
