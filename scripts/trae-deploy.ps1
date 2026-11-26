#requires -Version 5.1
<#
重新构建静态站点并发布到 Trae 托管站点。

每次运行必须使用新的带版本静态资源前缀，否则平台会以 SERVICE_993511 拒绝部署。

示例：
  pwsh scripts/trae-deploy.ps1
  pwsh scripts/trae-deploy.ps1 -Title "Post: astro islands"
#>
# 发布参数：站点标识、目标 URL、应用标签；默认值对应线上站点。
param(
  [string]$SiteId = "37m3yb8lzbsl1uobsm2",
  [string]$SiteUrl = "https://mimas.ccwu.cc",
  [string]$AppTags = "289,101",
  [string]$Title = "",
  [string]$Description = "",
  [string]$DeployCli = "",
  [string]$PluginRoot = "$env:USERPROFILE\.trae-cn\plugins\trae-remote-official\deployment",
  [switch]$KeepArtifacts
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$repoRoot = Split-Path -Parent $PSScriptRoot

# 解析 trae-deploy CLI 路径：优先使用显式路径，否则取插件目录中版本号最高的一份。
function Resolve-DeployCli {
  param([string]$Explicit, [string]$Root)

  if ($Explicit -ne "") {
    if (-not (Test-Path -LiteralPath $Explicit)) {
      throw "trae-deploy CLI not found: $Explicit"
    }
    return (Resolve-Path -LiteralPath $Explicit).Path
  }
  if (-not (Test-Path -LiteralPath $Root)) {
    throw "Deployment plugin directory not found: $Root"
  }

  $dirs = Get-ChildItem -LiteralPath $Root -Directory |
    Sort-Object { try { [version]$_.Name } catch { [version]"0.0.0" } } -Descending
  foreach ($dir in $dirs) {
    $candidate = Join-Path $dir.FullName "skills\deployment\bin\win32-x64\trae-deploy.exe"
    if (Test-Path -LiteralPath $candidate) { return $candidate }
  }
  throw "trae-deploy CLI not found under $Root"
}

function Invoke-DeployCli {
  param([string[]]$CliArgs)

  $errFile = [System.IO.Path]::GetTempFileName()
  $stdout = @()
  $stderr = ""
  $exitCode = 0
  $previousEap = $ErrorActionPreference
  # PowerShell 5 在 $ErrorActionPreference 为 Stop 时会把原生命令的重定向 stderr
  # 视为终止性错误，因此在调用原生命令期间临时放宽该设置。
  $ErrorActionPreference = "Continue"
  try {
    $stdout = & $script:CliPath @CliArgs 2> $errFile
    $exitCode = $LASTEXITCODE
    if (Test-Path -LiteralPath $errFile) {
      $stderr = Get-Content -LiteralPath $errFile -Raw
    }
  } finally {
    $ErrorActionPreference = $previousEap
    Remove-Item -LiteralPath $errFile -Force -ErrorAction SilentlyContinue
  }

  $lines = @()
  if ($stdout) { $lines += @($stdout | ForEach-Object { "$_" }) }
  if ($stderr) { $lines += @($stderr -split "\r?\n") }

  $jsonLine = $lines | Where-Object { $_.TrimStart().StartsWith("{") } | Select-Object -Last 1
  if (-not $jsonLine) {
    throw ("trae-deploy {0} returned no JSON (exit {1}):`n{2}" -f ($CliArgs -join " "), $exitCode, ($lines -join "`n"))
  }

  $result = $jsonLine | ConvertFrom-Json
  if (-not $result.ok) {
    throw ("trae-deploy {0} failed: {1}" -f ($CliArgs -join " "), $jsonLine)
  }
  return $result
}

$script:CliPath = Resolve-DeployCli -Explicit $DeployCli -Root $PluginRoot
$skillDir = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $script:CliPath))
$helper = Join-Path $skillDir "scripts\prepare-static-function.mjs"
if (-not (Test-Path -LiteralPath $helper)) {
  throw "prepare-static-function.mjs not found: $helper"
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "node is required but was not found on PATH"
}

if ($Title -eq "") {
  $Title = "Deploy " + (Get-Date -Format "yyyy-MM-dd HH:mm")
}
if ($Description -eq "") {
  $Description = "Static mirror of d:\study\blog. Built with PUBLIC_SITE_URL=$SiteUrl and a fresh versioned asset set. Whole prerendered site: zh/en pages, posts, pagefind index, OG images."
}

$version = [guid]::NewGuid().ToString("N")
$sourceDir = Join-Path ([System.IO.Path]::GetTempPath()) ("trae-deploy-" + [guid]::NewGuid().ToString("N"))
$preparedDir = ""
$success = $false

try {
  Write-Host "[1/5] Building static output (asset version $version) ..."
  $env:PUBLIC_SITE_URL = $SiteUrl
  $env:PUBLIC_ASSET_PREFIX = "/_assets/$version"
  Push-Location $repoRoot
  try {
    & pnpm build
    if ($LASTEXITCODE -ne 0) { throw "pnpm build failed with exit code $LASTEXITCODE" }
  } finally {
    Pop-Location
  }
  if (-not (Test-Path -LiteralPath (Join-Path $repoRoot "dist\index.html"))) {
    throw "build output dist/index.html not found"
  }

  Write-Host "[2/5] Preparing deployment source ..."
  New-Item -ItemType Directory -Path $sourceDir | Out-Null
  $versionJson = '{"version_id":"' + $version + '"}'
  [System.IO.File]::WriteAllText(
    (Join-Path $sourceDir "assets-version.json"),
    $versionJson,
    (New-Object System.Text.UTF8Encoding($false))
  )
  Copy-Item -LiteralPath (Join-Path $repoRoot "dist") -Destination (Join-Path $sourceDir "public") -Recurse

  # PowerShell 5 在 $ErrorActionPreference = Stop 时会把原生命令的 stderr 重定向
  # 包装成 NativeCommandError，因此改为把诊断信息写入文件。
  $prepareErrFile = [System.IO.Path]::GetTempFileName()
  $prepareRaw = @()
  $prepareErr = ""
  $prepareExit = 0
  $previousEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $prepareRaw = & node $helper --source-dir $sourceDir 2> $prepareErrFile
    $prepareExit = $LASTEXITCODE
    if (Test-Path -LiteralPath $prepareErrFile) {
      $prepareErr = Get-Content -LiteralPath $prepareErrFile -Raw
    }
  } finally {
    $ErrorActionPreference = $previousEap
    Remove-Item -LiteralPath $prepareErrFile -Force -ErrorAction SilentlyContinue
  }
  if ($prepareExit -ne 0) {
    throw ("prepare-static-function.mjs failed (exit {0}):`n{1}" -f $prepareExit, $prepareErr)
  }
  $prepareJson = ($prepareRaw | ForEach-Object { "$_" } | Where-Object { $_.TrimStart().StartsWith("{") } | Select-Object -Last 1)
  if (-not $prepareJson) { throw "prepare-static-function.mjs returned no JSON" }
  $prepared = $prepareJson | ConvertFrom-Json
  if (-not $prepared.ok -or $prepared.data.deploy_type -ne "function-web") {
    throw "unexpected prepare result: $prepareJson"
  }
  $preparedDir = $prepared.data.source_dir
  $executionConfig = $prepared.data.execution_config

  Write-Host "[3/5] Applying root redirect (/ -> /zh/) ..."
  $serverFile = Join-Path $preparedDir "server.mjs"
  $serverText = [System.IO.File]::ReadAllText($serverFile)
  if ($serverText -notmatch [regex]::Escape("pathname === '/'")) {
    $anchor = "    const target = routes.get(pathname);"
    if ($serverText -notmatch [regex]::Escape($anchor)) {
      throw "could not patch server.mjs: anchor not found"
    }
    $inject = "    if (pathname === '/') {`r`n" +
      "      response.writeHead(301, { Location: '/zh/', 'Cache-Control': 'no-store', 'Content-Length': '0' }).end();`r`n" +
      "      return;`r`n" +
      "    }`r`n"
    $serverText = $serverText.Replace($anchor, $inject + $anchor)
    [System.IO.File]::WriteAllText($serverFile, $serverText, (New-Object System.Text.UTF8Encoding($false)))
  }

  Write-Host "[4/5] Checking active deployments ..."
  $list = Invoke-DeployCli @("deployments", "list", "--site-id", $SiteId)
  $active = @(@($list.data.items) | Where-Object { $_ -ne $null -and [int]$_.status -lt 9 })
  if ($active.Count -gt 0) {
    throw ("site already has an active deployment: {0}; wait for it or cancel it before redeploying" -f ($active[0].deployment_id))
  }

  Write-Host "[5/5] Uploading and deploying ..."
  $created = Invoke-DeployCli @(
    "deployments", "create",
    "--site-id", $SiteId,
    "--title", $Title,
    "--description", $Description,
    "--type", "function-web",
    "--source-dir", $preparedDir,
    "--execution-config", $executionConfig,
    "--app-tags", $AppTags
  )
  $deploymentId = $created.data.deployment_id
  if (-not $deploymentId) { throw "deployment id missing in response" }

  $waited = Invoke-DeployCli @("deployments", "wait", "--deployment-id", $deploymentId, "--timeout-seconds", "240")
  $status = [int]$waited.data.deployment.status
  if ($status -ne 9) {
    throw ("deployment {0} did not succeed (status {1}, reason {2}). Run: trae-deploy deployments wait --deployment-id {0}" -f $deploymentId, $status, $waited.data.wait_reason)
  }

  $domain = $waited.data.deployment.resource_data.domain
  if (-not $domain) { $domain = "$SiteId.traesite.cn" }
  $success = $true
  Write-Host ""
  Write-Host "Deployment succeeded."
  Write-Host "  URL:           https://$domain"
  Write-Host "  Deployment ID: $deploymentId"
  Write-Host "  Visibility:    public"
}
finally {
  if ($success -and -not $KeepArtifacts) {
    Remove-Item -LiteralPath $sourceDir -Recurse -Force -ErrorAction SilentlyContinue
    if ($preparedDir -ne "" -and (Test-Path -LiteralPath $preparedDir)) {
      Remove-Item -LiteralPath $preparedDir -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
  if (-not $success) {
    Write-Host ""
    Write-Host "Deployment did not complete. Artifacts kept for debugging:"
    Write-Host "  source:   $sourceDir"
    if ($preparedDir -ne "") { Write-Host "  prepared: $preparedDir" }
  }
}
