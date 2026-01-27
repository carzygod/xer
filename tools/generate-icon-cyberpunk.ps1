Add-Type -AssemblyName System.Drawing

function Generate-Icon {
    param (
        [int]$Size,
        [string]$OutputPath
    )

    # larger canvas for pixelation effect, then scale down? 
    # Or just draw blocky on the target size.
    # Let's draw on a 16x16 grid and scale up to target size to force pixel look.
    
    $gridSize = 16
    $pixelMap = New-Object 'int[,]' $gridSize, $gridSize
    
    # Colors suitable for Cyberpunk
    # 0 = Transparent/Background (Dark Deep Purple)
    # 1 = Gear (Neon Magenta)
    # 2 = Center (Cyan)
    
    # Init Background
    for ($i=0; $i -lt $gridSize; $i++) {
        for ($j=0; $j -lt $gridSize; $j++) {
            $pixelMap[$i,$j] = 0
        }
    }

    # Define Gear Shape (approximate circle with teeth)
    # Center is 7.5, 7.5
    # Radius approx 6
    
    $center = 7.5
    $radius = 5.5
    $holeRadius = 2.0
    
    for ($x=0; $x -lt $gridSize; $x++) {
        for ($y=0; $y -lt $gridSize; $y++) {
            $dx = $x - $center
            $dy = $y - $center
            $dist = [Math]::Sqrt($dx*$dx + $dy*$dy)
            
            # Gear Body
            if ($dist -lt $radius - 0.5) {
               $pixelMap[$x,$y] = 1
            }
            
            # Gear Teeth (every 45 degrees approx)
            # using atan2
            if ($dist -ge $radius - 1.5 -and $dist -lt $radius + 1.5) {
                 $angle = [Math]::Atan2($dy, $dx) * (180 / [Math]::PI)
                 # Normalize angle
                 if ($angle -lt 0) { $angle += 360 }
                 
                 # 8 teeth
                 $section = $angle % 45
                 if ($section -lt 15 -or $section -gt 30) {
                     # Tooth
                     if ($dist -lt $radius + 1.2) {
                        $pixelMap[$x,$y] = 1
                     }
                 }
            }
            
            # Center Hole
            if ($dist -lt $holeRadius) {
                $pixelMap[$x,$y] = 2 # inner accent
            }
        }
    }

    # Create actual bitmap
    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    
    # Cyberpunk Palette
    $bgColor = [System.Drawing.Color]::FromArgb(10, 10, 20)      # Almost black
    $gearColor = [System.Drawing.Color]::FromArgb(255, 0, 255)   # Neon Magenta
    $holeColor = [System.Drawing.Color]::FromArgb(0, 255, 255)   # Neon Cyan
    
    # Fill background
    $graphics.Clear($bgColor)
    
    $pixelSize = $Size / $gridSize
    
    for ($x=0; $x -lt $gridSize; $x++) {
        for ($y=0; $y -lt $gridSize; $y++) {
            $val = $pixelMap[$x,$y]
            $brush = $null
            
            if ($val -eq 1) { $brush = New-Object System.Drawing.SolidBrush($gearColor) }
            elseif ($val -eq 2) { $brush = New-Object System.Drawing.SolidBrush($holeColor) }
            
            if ($brush -ne $null) {
                $rect = New-Object System.Drawing.Rectangle([int]($x * $pixelSize), [int]($y * $pixelSize), [int]($pixelSize + 1), [int]($pixelSize + 1))
                $graphics.FillRectangle($brush, $rect)
                $brush.Dispose()
            }
        }
    }

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
