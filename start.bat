@echo off
where nodemon >nul 2>&1
if %ERRORLEVEL% equ 0 (
    start cmd /c nodemon index.js
) else (
    start cmd /c node index.js
)
timeout /t 1 /nobreak
start http://localhost:3000/
