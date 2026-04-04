$steps = @("95=homepage", "96=search", "97=novel_detail", "98=novel_viewer", "99=my_library")
foreach ($item in $steps) {
    $parts = $item.Split("=")
    $step = $parts[0]
    $name = $parts[1]
    $file = "C:\Users\rimur\.gemini\antigravity\brain\6f444f71-21f9-44f7-b1b5-4e86b7cde924\.system_generated\steps\$step\output.txt"
    $json = Get-Content $file -Raw | ConvertFrom-Json
    $url = $json.outputComponents[0].design.screens[0].htmlCode.downloadUrl
    $outFile = "d:\nova\" + $name + "_pc.html"
    Invoke-RestMethod -Uri $url -OutFile $outFile
    Write-Host "Downloaded $outFile"
}
