<#
.SYNOPSIS
    One-command installer for kikkoCode on Windows.

.DESCRIPTION
    Downloads the latest published kikkoCode release from GitHub and runs the
    Windows installer. No developer tools (Rust, Node, pnpm) are required — the
    release already bundles the OpenCode engine as a sidecar.

    Designed to be run straight from the web, no clone needed:

        Windows PowerShell (run as your normal user):
        irm "https://raw.githubusercontent.com/daniele9233/forkClaudeCode/claude/opencode-project-setup-1i59cg/scripts/install.ps1" | iex

.NOTES
    - Requires Windows 10/11 (x64) and an internet connection.
    - WebView2 is installed on Windows 11 by default; on older Windows 10 the
      installer will offer to fetch it if missing.
    - Only *published* releases are installed. A freshly built release starts as
      a draft — the maintainer must publish it once for this script to see it.
#>

$ErrorActionPreference = "Stop"
$Repo = "daniele9233/forkClaudeCode"

function Write-Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    $msg" -ForegroundColor Green }
function Write-Warn2($msg){ Write-Host "    $msg" -ForegroundColor Yellow }

Write-Host ""
Write-Host "  kikkoCode installer" -ForegroundColor Magenta
Write-Host "  a calm desktop shell over the OpenCode engine" -ForegroundColor DarkGray
Write-Host ""

# --- Sanity checks --------------------------------------------------------
if ([Environment]::Is64BitOperatingSystem -eq $false) {
    throw "kikkoCode ships as a 64-bit Windows app; this machine is 32-bit."
}
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}

# --- Find the latest published release ------------------------------------
Write-Step "Looking up the latest kikkoCode release..."
$apiUrl = "https://api.github.com/repos/$Repo/releases/latest"
$headers = @{ "User-Agent" = "kikkoCode-installer"; "Accept" = "application/vnd.github+json" }

try {
    $release = Invoke-RestMethod -Uri $apiUrl -Headers $headers
} catch {
    throw @"
Could not find a published release for $Repo.

If you are the maintainer: build a release by pushing a version tag, e.g.

    git tag v0.1.0
    git push origin v0.1.0

That triggers the 'Release (Windows)' GitHub Action, which builds the installer
and attaches it to a *draft* release. Open the repo's Releases page, edit that
draft, and click 'Publish release'. Then re-run this installer.
"@
}

$version = $release.tag_name
Write-Ok "Found $version"

# Prefer the NSIS .exe setup; fall back to the .msi.
$asset = $release.assets | Where-Object { $_.name -match '\.exe$' -and $_.name -match '(?i)setup|kikko' } | Select-Object -First 1
if (-not $asset) { $asset = $release.assets | Where-Object { $_.name -match '\.msi$' } | Select-Object -First 1 }
if (-not $asset) { $asset = $release.assets | Where-Object { $_.name -match '\.exe$' } | Select-Object -First 1 }
if (-not $asset) {
    throw "The $version release has no Windows installer asset (.exe/.msi) attached."
}

# --- Download -------------------------------------------------------------
$dest = Join-Path $env:TEMP $asset.name
Write-Step "Downloading $($asset.name) ..."
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $dest -Headers @{ "User-Agent" = "kikkoCode-installer" }
Write-Ok "Saved to $dest"

# --- Run the installer ----------------------------------------------------
Write-Step "Launching the installer..."
if ($dest -match '\.msi$') {
    Start-Process "msiexec.exe" -ArgumentList "/i", "`"$dest`"" -Wait
} else {
    Start-Process $dest -Wait
}

Write-Host ""
Write-Ok "kikkoCode $version installed."
Write-Host "    Launch it from the Start menu. On first run a short wizard helps you" -ForegroundColor DarkGray
Write-Host "    connect an AI provider — your API keys stay on this machine." -ForegroundColor DarkGray
Write-Host ""
