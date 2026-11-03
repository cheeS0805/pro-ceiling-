# Зменшує й стискає фото для портфоліо: довша сторона до MaxSide px, JPEG якості Quality.
# Повертає фото з телефона правильно (EXIF Orientation), щоб воно не «лежало на боці».
#
# Запуск:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .claude/skills/add-portfolio-item/optimize-photo.ps1 `
#     -Source "C:\шлях\до\фото.jpg" -Destination "images/portfolio/2026-11-matova-kukhnia.jpg"

param(
  [Parameter(Mandatory = $true)][string]$Source,
  [Parameter(Mandatory = $true)][string]$Destination,
  [int]$MaxSide = 1600,
  [int]$Quality = 82
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8  # українські повідомлення без кракозябр
Add-Type -AssemblyName System.Drawing

$src = (Resolve-Path -LiteralPath $Source).Path
$dst = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Destination)
if (Test-Path -LiteralPath $dst) { throw "Файл уже існує: $dst — обери іншу назву." }
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dst) | Out-Null

$img = [System.Drawing.Image]::FromFile($src)
try {
  # EXIF Orientation (тег 0x0112): 3 = 180°, 6 = 90° за год. стрілкою, 8 = 270°
  if ($img.PropertyIdList -contains 0x0112) {
    switch ([int]$img.GetPropertyItem(0x0112).Value[0]) {
      3 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone) }
      6 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone) }
      8 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone) }
    }
  }

  $scale = [Math]::Min(1.0, $MaxSide / [Math]::Max($img.Width, $img.Height))
  $w = [int][Math]::Round($img.Width * $scale)
  $h = [int][Math]::Round($img.Height * $scale)

  $bmp = New-Object System.Drawing.Bitmap $w, $h
  try {
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::White) # прозорий PNG → білий фон
    $g.DrawImage($img, 0, 0, $w, $h)
    $g.Dispose()

    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $params = New-Object System.Drawing.Imaging.EncoderParameters 1
    $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]$Quality)
    $bmp.Save($dst, $codec, $params)
  } finally { $bmp.Dispose() }
} finally { $img.Dispose() }

$before = [Math]::Round((Get-Item -LiteralPath $src).Length / 1KB)
$after = [Math]::Round((Get-Item -LiteralPath $dst).Length / 1KB)
Write-Output "OK: $dst"
Write-Output "Розмір: ${w}x${h}px, $before КБ → $after КБ"
