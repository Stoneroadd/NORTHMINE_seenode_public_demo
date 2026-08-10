param(
    [string]$Destination = (Join-Path $PSScriptRoot "..\models")
)

$ErrorActionPreference = "Stop"
$modelName = "vosk-model-small-es-0.42"
$modelRoot = [System.IO.Path]::GetFullPath($Destination)
$modelPath = Join-Path $modelRoot $modelName
if (Test-Path -LiteralPath (Join-Path $modelPath "conf\model.conf")) {
    Write-Output "Modelo español ya instalado: $modelPath"
    exit 0
}

New-Item -ItemType Directory -Path $modelRoot -Force | Out-Null
$archivePath = Join-Path $modelRoot "$modelName.zip"
try {
    Invoke-WebRequest `
        -Uri "https://alphacephei.com/vosk/models/$modelName.zip" `
        -OutFile $archivePath `
        -UseBasicParsing
    Expand-Archive -LiteralPath $archivePath -DestinationPath $modelRoot -Force
}
finally {
    if (Test-Path -LiteralPath $archivePath) {
        Remove-Item -LiteralPath $archivePath -Force
    }
}

if (-not (Test-Path -LiteralPath (Join-Path $modelPath "conf\model.conf"))) {
    throw "El modelo no quedo instalado correctamente."
}
Write-Output "Modelo español instalado: $modelPath"
