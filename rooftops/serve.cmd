@echo off
rem Roof Road launcher: serves the repo this file lives in over http (ES modules
rem and the import map do not work from file://) on port 8131, then opens the page.
rem 8131 sits next to the Grass Lab's 8130 so both can run at once.
cd /d "%~dp0.."
echo Serving %CD%
echo Open http://localhost:8131/rooftops/   (Ctrl+C to stop)
start "" http://localhost:8131/rooftops/
python -m http.server 8131
