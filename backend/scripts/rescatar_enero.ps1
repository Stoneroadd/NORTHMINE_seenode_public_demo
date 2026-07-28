# Rescate puntual: ultimo correo con ENERO-ESTATUS (o *ESTATUS-4001* entre
# el 20-01 y el 04-02-2026) -> guarda el adjunto en la carpeta Averias.
$desde = Get-Date "2026-01-15"
$hasta = Get-Date "2026-02-04"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$WatchDir = if ($env:NORTHMINE_AVERIAS_WATCH_DIR) { $env:NORTHMINE_AVERIAS_WATCH_DIR } else { Join-Path $RepoRoot "Averias" }

$outlook = New-Object -ComObject Outlook.Application
$namespace = $outlook.GetNamespace("MAPI")
$mejor = $null
$mejorFecha = $desde

foreach ($store in $namespace.Stores) {
    try { $inbox = $store.GetDefaultFolder(6) } catch { continue }
    $items = $inbox.Items
    try { $items.Sort("[ReceivedTime]", $true) } catch { }
    foreach ($item in $items) {
        try {
            if ($null -eq $item.ReceivedTime) { continue }
            if ($item.ReceivedTime -lt $desde) { break }
            if ($item.ReceivedTime -gt $hasta) { continue }
            if ($item.Attachments.Count -eq 0) { continue }
            foreach ($att in $item.Attachments) {
                if ($att.FileName -like "*ESTATUS-4001*" -and $att.FileName -like "*.xls*") {
                    Write-Output ("VISTO {0} | {1} | {2}" -f $item.ReceivedTime.ToString("yyyy-MM-dd HH:mm"), $att.FileName, $item.Subject)
                    if ($item.ReceivedTime -gt $mejorFecha -and $att.FileName -like "ENERO*") {
                        $mejor = $att
                        $mejorFecha = $item.ReceivedTime
                    }
                }
            }
        } catch { }
    }
}

if ($mejor) {
    $dest = Join-Path $WatchDir $mejor.FileName
    $mejor.SaveAsFile($dest)
    Write-Output ("GUARDADO {0} (correo de {1})" -f $mejor.FileName, $mejorFecha)
} else {
    Write-Output "SIN RESULTADO: no se encontro adjunto ENERO-ESTATUS en el rango."
}
