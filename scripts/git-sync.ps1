# ============================================================
# BALLOT.IO - AUTOMATED GIT SYNC SCRIPT
# Usage: powershell -ExecutionPolicy Bypass -File scripts/git-sync.ps1 -Message "Your commit message"
# ============================================================

param (
    [string]$Message = "Update project changes - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
    [string]$Branch = "main"
)

Write-Host "🔄 Starting Ballot.io Git Synchronization..." -ForegroundColor Cyan

# Ensure we are in project directory
$projectDir = Split-Path -Parent $PSScriptRoot
Set-Location $projectDir

# Check git status
$status = git status --porcelain
if (-not $status) {
    Write-Host "✨ No changes to commit. Working directory is clean." -ForegroundColor Green
    exit 0
}

# Stage all files
Write-Host "📦 Staging changes..." -ForegroundColor Yellow
git add -A

# Commit changes
Write-Host "📝 Committing: '$Message'..." -ForegroundColor Yellow
git commit -m "$Message"

# Check if remote 'origin' exists
$hasRemote = git remote
if ($hasRemote -contains "origin") {
    Write-Host "🚀 Pushing changes to GitHub ($Branch)..." -ForegroundColor Yellow
    git push -u origin $Branch
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Successfully pushed to GitHub!" -ForegroundColor Green
    } else {
        Write-Warning "⚠️ Git push encountered an issue. Check your authentication or branch name."
    }
} else {
    Write-Host "ℹ️ No remote 'origin' found. Add remote using: git remote add origin <url>" -ForegroundColor Cyan
}
