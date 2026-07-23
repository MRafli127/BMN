$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$wb = $excel.Workbooks.Open('c:\Users\MUHAMMAD RAFLI\OneDrive\Documents\Dokumen UI\kemenkau\BMN clone\BMN\backend\assets\Data-Pegawai-BPPK.xlsx')
$ws = $wb.Sheets.Item(1)
$lastRow = $ws.UsedRange.Rows.Count
$lastCol = $ws.UsedRange.Columns.Count

# Get headers
$headers = @()
for ($c = 1; $c -le $lastCol; $c++) {
    $headers += $ws.Cells.Item(1, $c).Text
}

# Find column indices
$nipIdx = 1
$ue2Idx = -1
for ($i = 0; $i -lt $headers.Count; $i++) {
    if ($headers[$i] -eq 'NIP') { $nipIdx = $i + 1 }
    if ($headers[$i] -eq 'UE2') { $ue2Idx = $i + 1 }
}

Write-Output "nip,eselon2"

# Build NIP -> UE2 map and output all rows
for ($r = 2; $r -le $lastRow; $r++) {
    $nip = $ws.Cells.Item($r, $nipIdx).Text.Trim()
    $ue2 = $ws.Cells.Item($r, $ue2Idx).Text.Trim()
    if ($nip -and $ue2) {
        Write-Output "$nip,$ue2"
    }
}

$wb.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
