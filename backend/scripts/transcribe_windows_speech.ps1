param(
    [string]$AudioPath,
    [string]$Language = "es-ES",
    [switch]$Probe
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.Speech

$recognizers = [System.Speech.Recognition.SpeechRecognitionEngine]::InstalledRecognizers()
$recognizer = $recognizers | Where-Object { $_.Culture.Name -eq $Language } | Select-Object -First 1
if ($null -eq $recognizer) {
    $languagePrefix = ($Language -split "-")[0]
    $recognizer = $recognizers | Where-Object { $_.Culture.TwoLetterISOLanguageName -eq $languagePrefix } | Select-Object -First 1
}
if ($null -eq $recognizer) {
    Write-Error "No hay un reconocedor de voz instalado para $Language"
    exit 2
}

$engine = [System.Speech.Recognition.SpeechRecognitionEngine]::new($recognizer)
try {
    $engine.LoadGrammar([System.Speech.Recognition.DictationGrammar]::new())
    if ($Probe) {
        [Console]::Out.Write("available")
        exit 0
    }
    if ([string]::IsNullOrWhiteSpace($AudioPath)) {
        Write-Error "AudioPath es obligatorio para transcribir"
        exit 4
    }
    $resolvedAudioPath = (Resolve-Path -LiteralPath $AudioPath).Path
    $engine.SetInputToWaveFile($resolvedAudioPath)
    $result = $engine.Recognize()
    if ($null -eq $result -or [string]::IsNullOrWhiteSpace($result.Text)) {
        exit 3
    }
    [Console]::Out.Write($result.Text.Trim())
}
finally {
    $engine.Dispose()
}
