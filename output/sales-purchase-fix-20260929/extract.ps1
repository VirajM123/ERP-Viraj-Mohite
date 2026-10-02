Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead('C:/Users/Total Solution/Desktop/Purchasekucchal.xlsx')
function Read-Entry($name) {
    $reader = [IO.StreamReader]::new($zip.GetEntry($name).Open())
    try { [xml]$reader.ReadToEnd() } finally { $reader.Dispose() }
}
try {
    $xml = Read-Entry 'xl/sharedStrings.xml'
    $strings = @($xml.sst.si | ForEach-Object { $_.InnerText })
    $sheet = Read-Entry 'xl/worksheets/sheet1.xml'
    $names = @{}
    foreach ($cell in $sheet.worksheet.sheetData.row[0].c) { $names[($cell.r -replace '\d','')] = $strings[[int]$cell.v] }
    $columns = @('InvoiceNo','InvoiceDate','ProductCode','MarketName','SellerCode','BuyerCode','Quantity','BaseRateWithTax','TaxableAmount','Discount','TaxAmount','NetValue','TCSAmount','NetValueIncludingTCS','TransactionType','IMEI')
    $lines = [Collections.Generic.List[string]]::new()
    $lines.Add(($columns -join "`t"))
    foreach ($row in $sheet.worksheet.sheetData.row | Select-Object -Skip 1) {
        $values = @{}
        foreach ($cell in $row.c) {
            $value = [string]$cell.v
            if ($cell.t -eq 's') { $value = $strings[[int]$value] }
            $name = $names[($cell.r -replace '\d','')]
            if ($name -eq 'InvoiceDate' -and $cell.t -ne 's') { $value = [datetime]::FromOADate([double]$value).ToString('yyyy-MM-dd') }
            $values[$name] = $value
        }
        $lines.Add((($columns | ForEach-Object { $values[$_] }) -join "`t"))
    }
    [IO.File]::WriteAllLines((Join-Path $PSScriptRoot 'source.tsv'), $lines)
    Write-Output "Extracted $($lines.Count - 1) rows read-only."
} finally { $zip.Dispose() }
