@echo off
rem Grass Lab launcher: serves the repo this file lives in over http (ES modules
rem and the import map do not work from file://) on port 8130, then opens the page.
rem Port 8130 is deliberately not 8000, so it cannot collide with another server.
cd /d "%~dp0.."
echo Serving %CD%
echo Open http://localhost:8130/grass/   (Ctrl+C to stop)
start "" http://localhost:8130/grass/
python -m http.server 8130
