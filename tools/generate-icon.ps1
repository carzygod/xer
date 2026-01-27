Add-Type -AssemblyName System.Drawing

function Generate-Icon {
    param (
        [int]$Size,
        [string]$OutputPath
    )

    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    
    # High quality settings
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

    # 1. Background: Black Circle
    $rect = New-Object System.Drawing.Rectangle(0, 0, $Size, $Size)
    $blackBrush = [System.Drawing.Brushes]::Black
    $graphics.FillEllipse($blackBrush, $rect)

    # 2. Border: Blue Ring (#1d9bf0)
    # Inner ring needs to be slightly smaller than full size to not clip
    $ringWidth = $Size * 0.05
    if ($ringWidth -lt 2) { $ringWidth = 2 }
    
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(29, 155, 240), $ringWidth)
    $pad = [int]($ringWidth / 2)
    $rectSize = [int]($Size - 2 * $pad)
    $ringRect = New-Object System.Drawing.Rectangle($pad, $pad, $rectSize, $rectSize)
    $graphics.DrawEllipse($pen, $ringRect)

    # 3. Text: "X" in White
    $fontSize = $Size * 0.6
    $font = New-Object System.Drawing.Font("Verdana", $fontSize, [System.Drawing.FontStyle]::Bold)
    $whiteBrush = [System.Drawing.Brushes]::White
    
    # Center the text
    $text = "X"
    $textSize = $graphics.MeasureString($text, $font)
    $x = ($Size - $textSize.Width) / 2
    $y = ($Size - $textSize.Height) / 2
    
    # Slightly offset Y because fonts often have padding
    $y += $Size * 0.02
    
    $graphics.DrawString($text, $font, $whiteBrush, $x, $y)

    # Save
    $dir = Split-Path $OutputPath
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $bitmap.Dispose()
    
    Write-Host "Generated: $OutputPath"
}

# Generate all sizes
$publicDir = "$PSScriptRoot\..\public\assets\icons"
Generate-Icon -Size 128 -OutputPath "$publicDir\icon-128.png"
Generate-Icon -Size 48  -OutputPath "$publicDir\icon-48.png"
Generate-Icon -Size 32  -OutputPath "$publicDir\icon-32.png"
Generate-Icon -Size 16  -OutputPath "$publicDir\icon-16.png"
