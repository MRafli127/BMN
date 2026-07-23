$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$wb = $excel.Workbooks.Open('c:\Users\MUHAMMAD RAFLI\OneDrive\Documents\Dokumen UI\kemenkau\BMN clone\BMN\backend\assets\Data-Pegawai-BPPK.xlsx')
$ws = $wb.Sheets.Item(1)
$lastCol = $ws.UsedRange.Columns.Count
$lastRow = $ws.UsedRange.Rows.Count

# Get headers
$headers = @()
for ($c = 1; $c -le $lastCol; $c++) {
    $headers += $ws.Cells.Item(1, $c).Text
}
Write-Output "Columns: $($headers -join ', ')"

# Find UE2 column index
$ue2Idx = -1
for ($i = 0; $i -lt $headers.Count; $i++) {
    if ($headers[$i] -eq 'UE2') {
        $ue2Idx = $i + 1
        break
    }
}
Write-Output "UE2 column index: $ue2Idx"

# Get unique non-empty UE2 values
$seen = @{}
for ($r = 2; $r -le $lastRow; $r++) {
    $v = $ws.Cells.Item($r, $ue2Idx).Text
    $v = $v.Trim()
    if ($v -and $v -ne '') {
        $seen[$v] = $true
    }
}

Write-Output "---"
Write-Output "Total unique UE2 values: $($seen.Count)"
Write-Output "---"
$sorted = $seen.Keys | Sort-Object
foreach ($val in $sorted) {
    Write-Output $val
}

$wb.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
