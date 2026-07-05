<#
.SYNOPSIS
    Uninstaller for kikkoCode on Windows.

.DESCRIPTION
    Finds the installed kikkoCode entry in the Windows registry and runs its
    uninstaller. Run from the web with:

        irm "https://raw.githubusercontent.com/daniele9233/forkClaudeCode/claude/opencode-project-setup-1i59cg/scripts/uninstall.ps1" | iex
#>

$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }

Write-Step "Looking for an installed kikkoCode..."

$roots = @(
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*"
)

$entry = Get-ItemProperty $roots -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName -match "kikkoCode" } |
    Select-Object -First 1

if (-not $entry) {
    Write-Host "    kikkoCode does not appear to be installed." -ForegroundColor Yellow
    return
}

$cmd = $entry.QuietUninstallString
if (-not $cmd) { $cmd = $entry.UninstallString }
if (-not $cmd) { throw "Found kikkoCode but it has no uninstall command registered." }

Write-Step "Uninstalling $($entry.DisplayName) $($entry.DisplayVersion)..."

# UninstallString may be "\"C:\path\uninstall.exe\" /flags" — split exe from args.
if ($cmd -match '^\s*"([^"]+)"\s*(.*)$') {
    $exe = $Matches[1]; $args = $Matches[2]
} elseif ($cmd -match '^\s*(\S+)\s*(.*)$') {
    $exe = $Matches[1]; $args = $Matches[2]
} else {
    $exe = $cmd; $args = ""
}

if ($args) { Start-Process $exe -ArgumentList $args -Wait } else { Start-Process $exe -Wait }

Write-Host "    kikkoCode removed." -ForegroundColor Green
