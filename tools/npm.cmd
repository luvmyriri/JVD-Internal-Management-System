@echo off
SETLOCAL
SET "PATH=%~dp0node;%PATH%"
"%~dp0node\npm.cmd" %*
