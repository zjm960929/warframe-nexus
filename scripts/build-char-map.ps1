# Generates a compact Traditional -> Simplified character map from the
# characters observed in the Warframe zh worldstate feed. Windows-only:
# Microsoft.VisualBasic handles the conversion without extra packages.
param(
  [string]$Source = (Join-Path $PSScriptRoot 'data\hant-chars.txt'),
  [string]$Out = (Join-Path $PSScriptRoot '..\public\data\zh-hant-map.json')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName Microsoft.VisualBasic

if (-not (Test-Path -LiteralPath $Source)) {
  throw "Character source not found: $Source"
}

$text = [System.IO.File]::ReadAllText((Resolve-Path -LiteralPath $Source), [System.Text.Encoding]::UTF8)
$map = [ordered]@{}
foreach ($ch in $text.ToCharArray()) {
  $code = [int][char]$ch
  if ($code -lt 0x4E00 -or $code -gt 0x9FFF) { continue }
  $converted = [Microsoft.VisualBasic.Strings]::StrConv(
    [string]$ch,
    [Microsoft.VisualBasic.VbStrConv]::SimplifiedChinese,
    2052
  )
  if ($converted -and $converted.Length -eq 1 -and $converted -ne [string]$ch) {
    $map[[string]$ch] = [string]$converted
  }
}

$json = $map | ConvertTo-Json -Compress
$parent = Split-Path -Parent $Out
if (-not (Test-Path -LiteralPath $parent)) {
  New-Item -ItemType Directory -Path $parent -Force | Out-Null
}
[System.IO.File]::WriteAllText(
  [System.IO.Path]::GetFullPath($Out),
  $json + "`n",
  [System.Text.UTF8Encoding]::new($false)
)
Write-Output "Wrote $Out ($($map.Count) mappings)"
