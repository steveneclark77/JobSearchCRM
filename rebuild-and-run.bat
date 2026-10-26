@echo off
setlocal EnableExtensions DisableDelayedExpansion
title JobSearchCRM - Update, Rebuild and Run

rem Always work from this file's folder, including paths with spaces or UNC paths.
pushd "%~dp0"
if errorlevel 1 goto location_error
set "CRM_PUSHED=1"

if not exist "frontend\package-lock.json" goto missing_project
if not exist "backend\pom.xml" goto missing_project
if /i "%~1"=="--after-pull" goto check_build_tools

set "CRM_STAGE=Updating the code from GitHub"
where git.exe >nul 2>&1
if errorlevel 1 (
  echo ERROR: Git was not found on PATH. Install Git for Windows first.
  goto failed
)
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo ERROR: This folder is not a Git checkout. ZIP downloads cannot pull updates.
  echo Clone the feat/personal-job-search-app branch, then copy your existing
  echo backend\data folder into that checkout while the app is stopped.
  goto failed
)
set "CRM_BRANCH="
for /f "delims=" %%B in ('git symbolic-ref --quiet --short HEAD 2^>nul') do set "CRM_BRANCH=%%B"
if not "%CRM_BRANCH%"=="feat/personal-job-search-app" (
  echo ERROR: Switch to the app branch before running this file:
  echo   git switch feat/personal-job-search-app
  goto failed
)
set "CRM_DIRTY="
for /f "delims=" %%S in ('git status --porcelain --untracked-files=normal 2^>nul') do set "CRM_DIRTY=1"
if defined CRM_DIRTY (
  echo ERROR: This checkout has local changes or untracked files.
  echo Commit or move your own changes before updating. Nothing will be discarded.
  git status --short
  goto failed
)

echo ============================================================
echo JobSearchCRM - Update, rebuild and run
echo Stop any running copy of this app with Ctrl+C before continuing.
echo Your backend\data folder is preserved.
echo ============================================================
echo.
echo Updating feat/personal-job-search-app from origin...
rem CMD parses this entire block before Git can replace this batch file.
rem Re-enter the updated file after pulling, rather than continue at stale offsets.
(
  git pull --ff-only origin feat/personal-job-search-app
  if errorlevel 1 goto failed
  call "%~f0" --after-pull
  if errorlevel 1 (
    popd
    exit /b 1
  ) else (
    popd
    exit /b 0
  )
)

:check_build_tools
set "CRM_STAGE=Checking installed tools"
where node.exe >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js was not found on PATH. Install Node.js 22 or newer.
  goto failed
)
call npm --version
if errorlevel 1 (
  echo ERROR: npm could not run in this command window.
  echo Run this batch file from the same command prompt where npm works.
  goto failed
)
call mvn -version >nul 2>&1
if errorlevel 1 (
  echo ERROR: Maven could not run in this command window.
  echo Check that mvn -version works in the same command prompt.
  goto failed
)
set "CRM_JAVA=java.exe"
if defined JAVA_HOME set "CRM_JAVA=%JAVA_HOME%\bin\java.exe"
if defined JAVA_HOME (
  if not exist "%JAVA_HOME%\bin\java.exe" goto invalid_jdk
  if not exist "%JAVA_HOME%\bin\javac.exe" goto invalid_jdk
) else (
  where java.exe >nul 2>&1
  if errorlevel 1 goto invalid_jdk
  where javac.exe >nul 2>&1
  if errorlevel 1 goto invalid_jdk
)
node.exe --version
"%CRM_JAVA%" -version
call mvn -version
if errorlevel 1 goto failed

set "CRM_STAGE=Installing frontend dependencies"
echo.
echo [1/4] Installing frontend dependencies...
cd frontend
if errorlevel 1 goto failed
call npm ci
if errorlevel 1 goto failed

set "CRM_STAGE=Building the frontend"
echo.
echo [2/4] Building the frontend...
call npm run build
if errorlevel 1 goto failed

set "CRM_STAGE=Building and testing the backend"
echo.
echo [3/4] Cleaning, testing, and packaging the backend...
cd ..\backend
if errorlevel 1 goto failed
call mvn clean package
if errorlevel 1 goto failed
if not exist "target\jobcrm-0.1.0.jar" (
  echo ERROR: The application JAR was not produced.
  goto failed
)

set "CRM_STAGE=Running the application"
echo.
echo [4/4] Starting JobSearchCRM...
echo Default address: http://127.0.0.1:8080
echo If you configured PORT, use that port instead.
echo Keep this window open while using the app. Press Ctrl+C to stop.
echo.
"%CRM_JAVA%" -jar "target\jobcrm-0.1.0.jar"
if errorlevel 1 goto failed
popd
endlocal
exit /b 0

:invalid_jdk
echo ERROR: A full Java JDK is required. Use JDK 21, not just a JRE.
echo Check JAVA_HOME and make sure Maven uses that same JDK.
goto failed

:missing_project
echo ERROR: Keep rebuild-and-run.bat in the JobSearchCRM project folder.
echo The frontend and backend folders must be next to this file.
goto failed

:failed
echo.
echo FAILED: %CRM_STAGE%
echo Read the error above. The app was not started successfully.
echo If another copy is running, stop it before rebuilding.
if defined CRM_PUSHED popd
echo.
pause
endlocal
exit /b 1

:location_error
echo ERROR: Could not open the folder containing this batch file.
pause
endlocal
exit /b 1
