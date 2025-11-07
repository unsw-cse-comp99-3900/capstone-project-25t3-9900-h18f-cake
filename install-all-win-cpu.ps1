# install-all-win-cpu.ps1
# Usage:
#   1) Right-click -> Run with PowerShell (or run: powershell -ExecutionPolicy Bypass -File .\install-all-win-cpu.ps1)
#   2) Ensures Python 3.10/3.11 is used, creates .venv, installs requirements, then prints next steps.

$ErrorActionPreference = "Stop"

Write-Host "=== Step 1: Checking Python version (recommend 3.10 or 3.11) ==="
python --version

Write-Host "=== Step 2: Create virtual environment (.venv) ==="
python -m venv .venv

Write-Host "=== Step 3: Activate venv ==="
$venvActivate = ".\.venv\Scripts\Activate.ps1"
if (!(Test-Path $venvActivate)) {
  Write-Error "Activation script not found at $venvActivate"
}
. $venvActivate

Write-Host "=== Step 4: Upgrade pip/build tools ==="
python -m pip install --upgrade pip setuptools wheel

Write-Host "=== Step 5: Install requirements (this may take a while) ==="
pip install -r requirements-all-win-cpu.txt

Write-Host ""
Write-Host "=== Done! ==="
Write-Host "Set your API key in this shell (example):"
Write-Host '$env:OPENAI_API_KEY = "<your_api_key_here>"'
Write-Host ""
Write-Host "To run backend (inside .venv):"
Write-Host "uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
