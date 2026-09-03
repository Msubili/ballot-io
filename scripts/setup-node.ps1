$ErrorActionPreference = 'Stop'
$destDir = "$env:LOCALAPPDATA\Programs\nodejs"
$tempDir = "$env:TEMP\node_temp"
$zipPath = "$env:TEMP\node.zip"

Write-Host "Creating $destDir..."
if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
}

Write-Host "Downloading Node.js v20.18.0..."
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri "https://nodejs.org/dist/v20.18.0/node-v20.18.0-win-x64.zip" -OutFile $zipPath

Write-Host "Extracting archive..."
if (Test-Path $tempDir) { Remove-Item -Path $tempDir -Recurse -Force }
Expand-Archive -Path $zipPath -DestinationPath $tempDir -Force

Write-Host "Copying files to $destDir..."
Copy-Item -Path "$tempDir\node-v20.18.0-win-x64\*" -Destination $destDir -Recurse -Force

Write-Host "Cleaning up temporary files..."
Remove-Item -Path $zipPath -Force
Remove-Item -Path $tempDir -Recurse -Force

Write-Host "Adding to user PATH..."
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentPath -notlike "*$destDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$destDir;$currentPath", "User")
}

Write-Host "Verifying Node.js:"
& "$destDir\node.exe" -v
& "$destDir\npm.cmd" -v
Write-Host "Node.js successfully installed!" -ForegroundColor Green
