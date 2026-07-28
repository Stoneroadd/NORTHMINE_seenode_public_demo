# Busqueda puntual del reporte de ENERO: recorre TODAS las carpetas de todas
# las cuentas de Outlook buscando correos del 20-01 al 15-02-2026 con Excel.
$desde = Get-Date "2026-01-20"
$hasta = Get-Date "2026-02-15"

$outlook = New-Object -ComObject Outlook.Application
$namespace = $outlook.GetNamespace("MAPI")

function Scan-Folder($folder, $depth) {
    if ($depth -gt 4) { return }
    try { $items = $folder.Items } catch { return }
    try { $items.Sort("[ReceivedTime]", $true) } catch { }
    foreach ($item in $items) {
        try {
            if ($null -eq $item.ReceivedTime) { continue }
            if ($item.ReceivedTime -lt $desde) { break }
            if ($item.ReceivedTime -gt $hasta) { continue }
            if ($item.Attachments.Count -eq 0) { continue }
            foreach ($att in $item.Attachments) {
                if ($att.FileName -like "*.xls*") {
                    Write-Output ("{0} | {1} | {2} | {3}" -f $item.ReceivedTime.ToString("yyyy-MM-dd"), $folder.FolderPath, $att.FileName, $item.Subject)
                }
            }
        } catch { }
    }
    foreach ($sub in $folder.Folders) { Scan-Folder $sub ($depth + 1) }
}

foreach ($store in $namespace.Stores) {
    try { $root = $store.GetRootFolder() } catch { continue }
    foreach ($folder in $root.Folders) { Scan-Folder $folder 1 }
}
