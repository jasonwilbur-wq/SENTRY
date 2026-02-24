@echo off
REM SENTRY Morning Report - Daily 0500 Scheduled Task
REM This batch file is called by Windows Task Scheduler.
REM It activates the SENTRY venv and runs the report generator + emailer.

cd /d C:\Users\j0w16ja\SENTRY_v2-main\backend
call .venv\Scripts\activate.bat
python scheduled_morning_report.py >> C:\Users\j0w16ja\SENTRY_v2-main\output\morning_report.log 2>&1
