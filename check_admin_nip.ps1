$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$wb = $excel.Workbooks.Open('c:\Users\MUHAMMAD RAFLI\OneDrive\Documents\Dokumen UI\kemenkau\BMN clone\BMN\backend\assets\Data-Pegawai-BPPK.xlsx')
$ws = $wb.Sheets.Item(1)
$lastCol = $ws.UsedRange.Columns.Count
$lastRow = $ws.UsedRange.Rows.Count

$headers = @()
for ($c = 1; $c -le $lastCol; $c++) {
    $headers += $ws.Cells.Item(1, $c).Text
}

$nipIdx = -1
$ue2Idx = -1
for ($i = 0; $i -lt $headers.Count; $i++) {
    if ($headers[$i] -eq 'NIP') { $nipIdx = $i + 1 }
    if ($headers[$i] -eq 'UE2') { $ue2Idx = $i + 1 }
}

# Build NIP -> UE2 map
$nipToUe2 = @{}
for ($r = 2; $r -le $lastRow; $r++) {
    $nip = $ws.Cells.Item($r, $nipIdx).Text.Trim()
    $ue2 = $ws.Cells.Item($r, $ue2Idx).Text.Trim()
    if ($nip -and $ue2) {
        if (-not $nipToUe2.ContainsKey($nip)) {
            $nipToUe2[$nip] = $ue2
        }
    }
}

Write-Output "Total NIP -> UE2 mappings: $($nipToUe2.Count)"
Write-Output "---"

# Admin NIPs from data_lokal.sql
$adminNips = @(
    "198001012010011001"
)

foreach ($nip in $adminNips) {
    if ($nipToUe2.ContainsKey($nip)) {
        Write-Output "ADMIN NIP $nip -> UE2: $($nipToUe2[$nip])"
    } else {
        Write-Output "ADMIN NIP $nip -> TIDAK DITEMUKAN di Excel"
    }
}

$wb.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
