$qextFilename = Get-ChildItem -Filter '*.qext' | Select-Object -First 1
$qext = Get-Content $qextFilename -raw | ConvertFrom-Json
$sourceDir = ".\editor"
$targetDir = "..\db-ext-gtour-editor\$($qext.version)"
$zipDir = "..\db-ext-gtour-editor"
$extension_name = "db-ext-gtour-editor"
# Read settings from Json file
$settings = Get-Content -Raw -Path ".vscode\settings.json" | ConvertFrom-Json

Write-Host "Will copy $($sourceDir) to $($targetDir)"
if (Test-Path -Path $targetDir) {
    Write-Host "Target already exists. Overwriting."
    Remove-Item -LiteralPath $targetDir -Force -Recurse
}
New-Item -ItemType "directory" -Path $targetDir
Get-ChildItem -Path $sourceDir | Copy-Item -Destination $targetDir -Recurse -Container



# Make a temp copy of this work folder but remove the .ps1 file (Qlik Cloud wont
# allow a .ps1 or .bat file to be part of an extension .zip)
$rnd = Get-Random
Copy-Item "$($targetDir)\.." -Destination "$($zipDir)$($rnd)" -Recurse -Container
# Remove-Item -LiteralPath "$($targetDir)$($rnd)\.vscode" -Force -Recurse
# if (Test-Path -Path "$($targetDir)$($rnd)\doc") {
#     Remove-Item -LiteralPath "$($targetDir)$($rnd)\doc" -Force -Recurse
# }
if (Test-Path -Path "$($targetDir)$($rnd)\.git") {
    Remove-Item -LiteralPath "$($targetDir)$($rnd)\.git" -Force -Recurse
}
if (Test-Path "$($targetDir)$($rnd)\*.ps1" -PathType leaf) {
    Remove-Item "$($targetDir)$($rnd)\*.ps1" -Force
}
# Write-Host "Creating zip file from folder '$($targetDir)'"

# create a zip file from the temp folder then remove the temp folder 
$file = "$($zipDir)_upload.zip"
if (Test-Path $file) {
    Remove-Item $file
}
Compress-Archive -Path "$($zipDir)$($rnd)" -DestinationPath "$file"
Remove-Item -LiteralPath "$($zipDir)$($rnd)" -Force -Recurse

# ------------------- Qlik Sense Windows ------------------------


# want to upload to Qlik Sense on Windows
Write-Host "`n--> Qlik Sense on Windows: Publishing extension '$($extension_name)'"
$cert = Get-PfxCertificate -FilePath $settings.christofs_options.client_cert_location
$api_url = $settings.christofs_options.qrs_url
$xrfkey = "A3VWMWM3VGRH4X3F"
$headers = @{
    "$($settings.christofs_options.header_key)" = $settings.christofs_options.header_value; 
    "X-Qlik-Xrfkey"                             = $xrfkey
}
    
    
$extension_list = Invoke-RestMethod "$($api_url)/extension?filter=name eq '$($extension_name)'&xrfkey=$($xrfkey)" `
    -Headers $headers `
    -Certificate $cert -SkipCertificateCheck `
| ConvertTo-Json   
$extension_list = $extension_list | ConvertFrom-Json
    
if ($extension_list.length -eq 0) {
    Write-Host "Extension '$($extension_name)' does not exist. Uploading it first time ...'" 
    $gotoupload = 1
}
elseif ($extension_list.length -eq 1) {
    $extension_id = $extension_list[0].id
    Write-Host "Removing existing extension '$($extension_name)' ($($extension_id)) ..." 
    Invoke-RestMethod -method 'DELETE' "$($api_url)/extension/$($extension_id)?xrfkey=$($xrfkey)" `
        -Headers $headers `
        -Certificate $cert -SkipCertificateCheck
    $gotoupload = 1
}
else {
    Write-Host "Error: The name '$($extension_name)' exists $($extension_list.value.length) times."
    $gotoupload = 0
}
    
if ($gotoupload -eq 1) {
    Write-Host "Uploading $($file) ..."
    $new_ext = Invoke-RestMethod -method 'POST' "$($api_url)/extension/upload?xrfkey=$($xrfkey)" `
        -Headers $headers `
        -Certificate $cert -SkipCertificateCheck `
        -inFile $file `
    | ConvertTo-Json -Depth 4
    # Remove-Item $file
    $new_ext = $new_ext | ConvertFrom-Json
    Write-Host "Extension '$($extension_name)' uploaded ($($new_ext[0].id))"
}

Write-Host "drag folder $($targetDir) also to https://github.com/ChristofSchwarz/ChristofSchwarz.github.io"