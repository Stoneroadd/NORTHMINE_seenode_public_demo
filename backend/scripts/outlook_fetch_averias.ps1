# NORTHMINE - Extractor automatico de reportes de averias desde Outlook.
# Recorre la bandeja de entrada de TODAS las cuentas configuradas en Outlook
# de escritorio, busca correos recientes con adjuntos Excel cuyo nombre
# calce con $NamePattern y los guarda en la carpeta vigilada del backend
# (NORTHMINE_AVERIAS_WATCH_DIR). Si el adjunto ya existe pero el correo es
# mas nuevo que el archivo, lo sobreescribe (el libro ESTATUS crece cada dia).
# El backend NORTHMINE importa automaticamente lo que aparezca en la carpeta.
#
# Programado via Tarea de Windows (cada 30 min). Log: _outlook_fetch.log.

param([int]$DaysBack = 7)    # dias hacia atras; la tarea usa el default, un backfill puede pasar mas

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$WatchDir = if ($env:NORTHMINE_AVERIAS_WATCH_DIR) { $env:NORTHMINE_AVERIAS_WATCH_DIR } else { Join-Path $RepoRoot "Averias" }
$NamePattern = if ($env:NORTHMINE_AVERIAS_NAME_PATTERN) { $env:NORTHMINE_AVERIAS_NAME_PATTERN } else { "*ESTATUS-4001*" }   # patron del nombre del adjunto
$Log = Join-Path $WatchDir "_outlook_fetch.log"

function Write-Log([string]$Message) {
    Add-Content -Path $Log -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message" -Encoding utf8
}

try {
    if (-not (Test-Path $WatchDir)) { New-Item -ItemType Directory -Force $WatchDir | Out-Null }
    $outlook = New-Object -ComObject Outlook.Application
    $namespace = $outlook.GetNamespace("MAPI")
    $cutoff = (Get-Date).AddDays(-$DaysBack)
    $saved = 0
    $scanned = 0

    foreach ($store in $namespace.Stores) {
        try { $inbox = $store.GetDefaultFolder(6) } catch { continue }  # 6 = olFolderInbox
        $items = $inbox.Items
        $items.Sort("[ReceivedTime]", $true)
        foreach ($item in $items) {
            if ($null -eq $item.ReceivedTime) { continue }
            if ($item.ReceivedTime -lt $cutoff) { break }
            $scanned++
            if ($item.Attachments.Count -eq 0) { continue }
            foreach ($attachment in $item.Attachments) {
                $name = $attachment.FileName
                if (-not $name) { continue }
                if ($name -notlike "*.xls" -and $name -notlike "*.xlsx" -and $name -notlike "*.xlsm") { continue }
                if ($NamePattern -and $name -notlike $NamePattern) { continue }
                $dest = Join-Path $WatchDir $name
                if (Test-Path $dest) {
                    # Tolerancia de 2 min: SaveAsFile deja el archivo con timestamp
                    # ~1 s anterior al ReceivedTime y sin esto se re-guardaba siempre.
                    $fileTime = (Get-Item $dest).LastWriteTime.AddMinutes(2)
                    if ($item.ReceivedTime -le $fileTime) { continue }
                }
                $attachment.SaveAsFile($dest)
                $saved++
                Write-Log "GUARDADO $name (correo de $($item.ReceivedTime), cuenta $($store.DisplayName))"
            }
        }
    }
    Write-Log "OK - $scanned correos revisados, $saved adjuntos guardados"
}
catch {
    Write-Log "ERROR - $($_.Exception.Message)"
}
