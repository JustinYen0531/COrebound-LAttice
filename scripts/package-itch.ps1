$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$distRoot = Join-Path $projectRoot "dist"
$outputRoot = Join-Path $projectRoot "output"
$stageRoot = Join-Path $outputRoot "itch-stage"
$zipPath = Join-Path $outputRoot "corebound-lattence-itch.zip"

Push-Location $projectRoot
try {
  & npm run build
  if ($LASTEXITCODE -ne 0) {
    throw "Production build failed."
  }

  if (Test-Path -LiteralPath $stageRoot) {
    Remove-Item -LiteralPath $stageRoot -Recurse -Force
  }
  New-Item -ItemType Directory -Path $stageRoot -Force | Out-Null
  Copy-Item -Path (Join-Path $distRoot "*") -Destination $stageRoot -Recurse -Force

  $renames = @()
  $nonAsciiFiles = Get-ChildItem -LiteralPath $stageRoot -Recurse -File | Where-Object {
    $_.Name -match '[^\x00-\x7F]'
  }

  foreach ($file in $nonAsciiFiles) {
    $oldRelative = $file.FullName.Substring($stageRoot.Length + 1).Replace("\", "/")
    $pathBytes = [Text.Encoding]::UTF8.GetBytes($oldRelative)
    $sha256 = [Security.Cryptography.SHA256]::Create()
    try {
      $hash = ([BitConverter]::ToString($sha256.ComputeHash($pathBytes))).Replace("-", "").ToLowerInvariant()
    }
    finally {
      $sha256.Dispose()
    }

    $newName = "asset-$($hash.Substring(0, 16))$($file.Extension.ToLowerInvariant())"
    $newPath = Join-Path $file.DirectoryName $newName
    Rename-Item -LiteralPath $file.FullName -NewName $newName
    $newRelative = $newPath.Substring($stageRoot.Length + 1).Replace("\", "/")
    $renames += [PSCustomObject]@{
      OldRelative = $oldRelative
      NewRelative = $newRelative
      OldName = $file.Name
      NewName = $newName
    }
  }

  $textExtensions = @(".css", ".html", ".js", ".json", ".map", ".md", ".txt", ".xml")
  $textFiles = Get-ChildItem -LiteralPath $stageRoot -Recurse -File | Where-Object {
    $textExtensions -contains $_.Extension.ToLowerInvariant()
  }

  foreach ($textFile in $textFiles) {
    $content = [IO.File]::ReadAllText($textFile.FullName)
    $updated = $content
    foreach ($rename in $renames) {
      $oldEncoded = (($rename.OldRelative -split "/") | ForEach-Object { [Uri]::EscapeDataString($_) }) -join "/"
      $newEncoded = (($rename.NewRelative -split "/") | ForEach-Object { [Uri]::EscapeDataString($_) }) -join "/"
      $oldNameEncoded = [Uri]::EscapeDataString($rename.OldName)
      $newNameEncoded = [Uri]::EscapeDataString($rename.NewName)
      $updated = $updated.Replace($rename.OldRelative, $rename.NewRelative)
      $updated = $updated.Replace($oldEncoded, $newEncoded)
      # Bundled modules refer to sibling chunks by filename, without the assets/ prefix.
      $updated = $updated.Replace($rename.OldName, $rename.NewName)
      $updated = $updated.Replace($oldNameEncoded, $newNameEncoded)
    }
    $updated = [regex]::Replace(
      $updated,
      '(?<![A-Za-z0-9.:/])/(audio|images|video|transparent-portraits)/',
      './$1/'
    )
    if ($updated -cne $content) {
      [IO.File]::WriteAllText($textFile.FullName, $updated, [Text.UTF8Encoding]::new($false))
    }
  }

  if (-not (Test-Path -LiteralPath (Join-Path $stageRoot "index.html"))) {
    throw "itch.io package must contain index.html at the ZIP root."
  }

  $unsafeStagePaths = Get-ChildItem -LiteralPath $stageRoot -Recurse | Where-Object {
    $_.FullName.Substring($stageRoot.Length + 1) -match '[^\x00-\x7F]'
  }
  if ($unsafeStagePaths) {
    $unsafeList = ($unsafeStagePaths | ForEach-Object { $_.FullName.Substring($stageRoot.Length + 1) }) -join "`n"
    throw "Non-ASCII package paths remain:`n$unsafeList"
  }

  foreach ($rename in $renames) {
    foreach ($textFile in $textFiles) {
      $content = [IO.File]::ReadAllText($textFile.FullName)
      $oldEncoded = (($rename.OldRelative -split "/") | ForEach-Object { [Uri]::EscapeDataString($_) }) -join "/"
      $oldNameEncoded = [Uri]::EscapeDataString($rename.OldName)
      if (
        $content.Contains($rename.OldRelative) -or
        $content.Contains($oldEncoded) -or
        $content.Contains($rename.OldName) -or
        $content.Contains($oldNameEncoded)
      ) {
        throw "A renamed asset still has a stale reference: $($rename.OldRelative)"
      }
    }
  }

  foreach ($textFile in $textFiles) {
    $content = [IO.File]::ReadAllText($textFile.FullName)
    if ($content -match '(?<![A-Za-z0-9.:/])/(audio|images|video|transparent-portraits)/') {
      throw "An itch.io-unsafe root asset reference remains in $($textFile.FullName)."
    }
  }

  if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
  }
  Add-Type -AssemblyName System.IO.Compression
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $writeArchive = [IO.Compression.ZipFile]::Open($zipPath, [IO.Compression.ZipArchiveMode]::Create)
  try {
    foreach ($stageFile in Get-ChildItem -LiteralPath $stageRoot -Recurse -File) {
      $entryName = $stageFile.FullName.Substring($stageRoot.Length + 1).Replace("\", "/")
      [IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
        $writeArchive,
        $stageFile.FullName,
        $entryName,
        [IO.Compression.CompressionLevel]::Optimal
      ) | Out-Null
    }
  }
  finally {
    $writeArchive.Dispose()
  }

  $archive = [IO.Compression.ZipFile]::OpenRead($zipPath)
  try {
    $entries = @($archive.Entries)
    if (-not ($entries | Where-Object { $_.FullName -eq "index.html" })) {
      throw "ZIP validation failed: index.html is not at the archive root."
    }
    $unsafeEntries = $entries | Where-Object { $_.FullName -match '[^\x00-\x7F]' }
    if ($unsafeEntries) {
      throw "ZIP validation failed: non-ASCII entry names remain."
    }
    $backslashEntries = $entries | Where-Object { $_.FullName.Contains("\") }
    if ($backslashEntries) {
      throw "ZIP validation failed: non-standard path separators remain."
    }
  }
  finally {
    $archive.Dispose()
  }

  $zip = Get-Item -LiteralPath $zipPath
  $zipHash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
  Write-Host "itch.io package ready: $($zip.FullName)"
  Write-Host "Files renamed to ASCII: $($renames.Count)"
  Write-Host "ZIP size: $([Math]::Round($zip.Length / 1MB, 2)) MB"
  Write-Host "SHA256: $zipHash"
}
finally {
  Pop-Location
}
