param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\\assets")
)

Add-Type -AssemblyName System.Drawing

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

function Save-PngAsIco {
  param(
    [byte[]]$PngBytes,
    [string]$IcoPath
  )

  $fileStream = [System.IO.File]::Open($IcoPath, [System.IO.FileMode]::Create)
  $writer = New-Object System.IO.BinaryWriter($fileStream)

  try {
    $writer.Write([UInt16]0)
    $writer.Write([UInt16]1)
    $writer.Write([UInt16]1)
    $writer.Write([byte]0)
    $writer.Write([byte]0)
    $writer.Write([byte]0)
    $writer.Write([byte]0)
    $writer.Write([UInt16]1)
    $writer.Write([UInt16]32)
    $writer.Write([UInt32]$PngBytes.Length)
    $writer.Write([UInt32]22)
    $writer.Write($PngBytes)
  }
  finally {
    $writer.Dispose()
    $fileStream.Dispose()
  }
}

[System.IO.Directory]::CreateDirectory($OutputDirectory) | Out-Null

$pngPath = [System.IO.Path]::Combine($OutputDirectory, "nts-icon.png")
$icoPath = [System.IO.Path]::Combine($OutputDirectory, "nts-icon.ico")

$bitmap = New-Object System.Drawing.Bitmap 256, 256, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

try {
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $paperBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 254, 248))
  $paperBorder = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 182, 194, 210)), 6
  $tabBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 15, 108, 189))
  $cornerBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 223, 232, 243))
  $linePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 212, 219, 230)), 4
  $holeBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $labelBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 24, 49, 83))
  $textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $font = New-Object System.Drawing.Font("Segoe UI", 52, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center

  $paperPath = New-RoundedRectanglePath -X 48 -Y 28 -Width 160 -Height 200 -Radius 18
  $labelPath = New-RoundedRectanglePath -X 66 -Y 170 -Width 124 -Height 36 -Radius 10

  $graphics.FillPath($paperBrush, $paperPath)
  $graphics.DrawPath($paperBorder, $paperPath)
  $graphics.FillRectangle($tabBrush, 48, 28, 160, 34)
  $graphics.FillPolygon($cornerBrush, @(
      (New-Object System.Drawing.PointF 176, 28),
      (New-Object System.Drawing.PointF 208, 60),
      (New-Object System.Drawing.PointF 208, 28)
    ))

  foreach ($x in 80, 104, 128, 152, 176) {
    $graphics.FillEllipse($holeBrush, $x - 5, 40, 10, 10)
  }

  foreach ($y in 96, 118, 140, 162) {
    $graphics.DrawLine($linePen, 74, $y, 182, $y)
  }

  $graphics.FillPath($labelBrush, $labelPath)
  $graphics.DrawString("NTS", $font, $textBrush, (New-Object System.Drawing.RectangleF 66, 170, 124, 36), $format)

  $bitmap.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
  Save-PngAsIco -PngBytes ([System.IO.File]::ReadAllBytes($pngPath)) -IcoPath $icoPath
}
finally {
  $graphics.Dispose()
  $bitmap.Dispose()
}

Write-Output "PNG: $pngPath"
Write-Output "ICO: $icoPath"
