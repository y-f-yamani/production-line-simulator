$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$assetDirectory = Join-Path $projectRoot 'assets'
$pngPath = Join-Path $assetDirectory 'Production-Line-Simulator-Icon.png'
$icoPath = Join-Path $assetDirectory 'Production-Line-Simulator-Icon.ico'
$size = 256

function New-RoundedRectanglePath {
  param(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )
  $diameter = $Radius * 2
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

$bitmap = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$backgroundBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#07111e'))
$panelBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#0e2232'))
$statusBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#0b2b21'))
$greenPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#42d77d'), 8)
$greenPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
$linePen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#365e75'), 7)
$linePen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
$thinLinePen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#365e75'), 5)

try {
  $outerPath = New-RoundedRectanglePath 0 0 256 256 40
  $innerPath = New-RoundedRectanglePath 8 8 240 240 32
  $graphics.FillPath($backgroundBrush, $outerPath)
  $graphics.DrawPath((New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#365e75'), 8)), $innerPath)

  $productPoints = [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new(52, 80),
    [System.Drawing.PointF]::new(172, 80),
    [System.Drawing.PointF]::new(204, 112),
    [System.Drawing.PointF]::new(204, 180),
    [System.Drawing.PointF]::new(52, 180)
  )
  $graphics.FillPolygon($panelBrush, $productPoints)
  $graphics.DrawPolygon($greenPen, $productPoints)
  $graphics.DrawLines($linePen, [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new(172, 80),
    [System.Drawing.PointF]::new(172, 112),
    [System.Drawing.PointF]::new(204, 112)
  ))
  $graphics.FillRectangle($backgroundBrush, 72, 104, 72, 48)
  $graphics.DrawRectangle($thinLinePen, 72, 104, 72, 48)
  $graphics.DrawLines((New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#42d77d'), 6)), [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new(84, 136),
    [System.Drawing.PointF]::new(100, 120),
    [System.Drawing.PointF]::new(116, 140),
    [System.Drawing.PointF]::new(132, 124)
  ))
  $graphics.FillEllipse($statusBrush, 156, 120, 32, 32)
  $graphics.DrawEllipse((New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#42d77d'), 6)), 156, 120, 32, 32)
  $graphics.DrawLine($linePen, 152, 168, 188, 168)
  $graphics.DrawLine($linePen, 72, 180, 72, 196)
  $graphics.DrawLine($linePen, 176, 180, 176, 196)

  $bitmap.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
  $graphics.Dispose()
  $bitmap.Dispose()
  $backgroundBrush.Dispose()
  $panelBrush.Dispose()
  $statusBrush.Dispose()
  $greenPen.Dispose()
  $linePen.Dispose()
  $thinLinePen.Dispose()
}

$pngBytes = [System.IO.File]::ReadAllBytes($pngPath)
$iconStream = [System.IO.File]::Open($icoPath, [System.IO.FileMode]::Create)
$writer = New-Object System.IO.BinaryWriter($iconStream)
try {
  $writer.Write([UInt16]0)
  $writer.Write([UInt16]1)
  $writer.Write([UInt16]1)
  $writer.Write([Byte]0)
  $writer.Write([Byte]0)
  $writer.Write([Byte]0)
  $writer.Write([Byte]0)
  $writer.Write([UInt16]1)
  $writer.Write([UInt16]32)
  $writer.Write([UInt32]$pngBytes.Length)
  $writer.Write([UInt32]22)
  $writer.Write($pngBytes)
} finally {
  $writer.Dispose()
  $iconStream.Dispose()
}

Write-Host "Built $icoPath"
