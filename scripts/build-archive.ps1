$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

try {
    $sevenZipCommand = Get-Command 7z.exe -ErrorAction SilentlyContinue
    $sevenZip = if ($sevenZipCommand) { $sevenZipCommand.Source } else { $null }
    if (-not $sevenZip) {
        foreach ($candidate in @("$env:ProgramFiles\7-Zip\7z.exe", "${env:ProgramFiles(x86)}\7-Zip\7z.exe")) {
            if (Test-Path -LiteralPath $candidate) { $sevenZip = $candidate; break }
        }
    }
    if (-not $sevenZip) { throw '7-Zip was not found. Install 7-Zip or add 7z.exe to PATH.' }
    if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'Node.js/npm was not found.' }
    if (-not (Test-Path -LiteralPath 'node_modules/@electron/packager/package.json')) {
        throw 'Build dependencies are missing. Run npm ci in the project folder first.'
    }

    & npm.cmd run build:electron
    if ($LASTEXITCODE -ne 0) { throw 'Electron build failed; no archive was created.' }
    $buildInfoPath = Join-Path $projectRoot 'launchers/builds/latest-build.json'
    $buildInfo = Get-Content -LiteralPath $buildInfoPath -Raw | ConvertFrom-Json
    if (-not (Test-Path -LiteralPath (Join-Path $buildInfo.directory 'Sunny.exe'))) { throw 'The built Sunny.exe was not found.' }
    $archivePath = Join-Path $projectRoot ("launchers/builds/Sunny-" + $buildInfo.buildName + '-Windows-x64.7z')
    $buildParent = Split-Path -Parent $buildInfo.directory
    $buildFolder = Split-Path -Leaf $buildInfo.directory
    Push-Location -LiteralPath $buildParent
    try {
        & $sevenZip a -t7z -m0=LZMA2 -mx=9 -ms=on $archivePath $buildFolder
        if ($LASTEXITCODE -ne 0) { throw '7-Zip could not create the archive.' }
        & $sevenZip t $archivePath
        if ($LASTEXITCODE -ne 0) { throw 'Archive integrity check failed.' }
    } finally { Pop-Location }
    $buildInfo | Add-Member -NotePropertyName archive -NotePropertyValue $archivePath -Force
    $buildInfo | ConvertTo-Json | Set-Content -LiteralPath $buildInfoPath -Encoding UTF8
    Write-Host "`nREADY: $archivePath" -ForegroundColor Green
    Write-Host 'Send this 7z archive. Extract the entire folder and launch Sunny.exe.'
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
