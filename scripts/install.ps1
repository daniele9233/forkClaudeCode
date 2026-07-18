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

# Pick the installer with the HIGHEST version, not just the first in the list.
# A single GitHub release can carry assets from more than one build (the app
# version is in the filename, e.g. kikkoCode_0.4.20_x64-setup.exe), so choosing
# the first match could hand back an older installer. Parse the version out of
# each filename and take the newest; fall back to upload time.
function Get-AssetVersion($name) {
    if ($name -match '(\d+)\.(\d+)\.(\d+)') {
        return [version]("{0}.{1}.{2}" -f $matches[1], $matches[2], $matches[3])
    }
    return [version]"0.0.0"
}
function Select-Newest($candidates) {
    $candidates |
        Sort-Object @{ Expression = { Get-AssetVersion $_.name } },
                    @{ Expression = { $_.created_at } } -Descending |
        Select-Object -First 1
}

# Prefer the NSIS .exe setup; fall back to the .msi, then any .exe.
$asset = Select-Newest ($release.assets | Where-Object { $_.name -match '\.exe$' -and $_.name -match '(?i)setup|kikko' })
if (-not $asset) { $asset = Select-Newest ($release.assets | Where-Object { $_.name -match '\.msi$' }) }
if (-not $asset) { $asset = Select-Newest ($release.assets | Where-Object { $_.name -match '\.exe$' }) }
if (-not $asset) {
    throw "The $version release has no Windows installer asset (.exe/.msi) attached."
}
Write-Ok "Selected installer: $($asset.name)"

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
# Report the version actually installed (from the asset filename), which is
# more reliable than the release tag when a release carries mixed assets.
$installed = Get-AssetVersion $asset.name
$installedLabel = if ("$installed" -ne "0.0.0") { "v$installed" } else { $version }
Write-Ok "kikkoCode $installedLabel installed."
Write-Host "    Launch it from the Start menu. On first run a short wizard helps you" -ForegroundColor DarkGray
Write-Host "    connect an AI provider — your API keys stay on this machine." -ForegroundColor DarkGray
Write-Host ""
