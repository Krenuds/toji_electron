# Setup Review Workspace
# Creates directories and generates initial analysis

Write-Host "🔧 Setting up Log-Driven Review Workspace" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Create directories
$directories = @(
    "graphs",
    "analysis",
    "reviews"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
        Write-Host "✅ Created directory: $dir" -ForegroundColor Green
    } else {
        Write-Host "⏭️  Directory exists: $dir" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "📊 Generating dependency graphs..." -ForegroundColor Yellow

# Generate graphs
$graphConfigs = @(
    @{ Name = "toji-core"; Path = "src/main/toji"; Description = "Core Toji System" },
    @{ Name = "services"; Path = "src/main/services"; Description = "Service Layer" },
    @{ Name = "handlers"; Path = "src/main/handlers"; Description = "IPC Handlers" },
    @{ Name = "discord"; Path = "src/plugins/discord"; Description = "Discord Plugin" },
    @{ Name = "renderer"; Path = "src/renderer/src"; Description = "UI Layer" },
    @{ Name = "full"; Path = "src"; Description = "Full Architecture" }
)

foreach ($config in $graphConfigs) {
    Write-Host "  Generating $($config.Description)..." -ForegroundColor White

    $dotFile = "graphs/$($config.Name).dot"
    $svgFile = "graphs/$($config.Name).svg"

    # Generate DOT file
    npx depcruise $config.Path --output-type dot 2>$null | Out-File -Encoding ASCII $dotFile

    # Convert to SVG
    if (Test-Path $dotFile) {
        & "C:\Program Files (x86)\Graphviz\bin\dot.exe" -Tsvg $dotFile -o $svgFile 2>$null
        if (Test-Path $svgFile) {
            Write-Host "    ✅ Created $svgFile" -ForegroundColor Green
        } else {
            Write-Host "    ⚠️  Failed to create SVG" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "📋 Analyzing logs..." -ForegroundColor Yellow

# Find most recent log file
$logPath = "$env:APPDATA\toji3\logs"
if (Test-Path $logPath) {
    $latestLog = Get-ChildItem $logPath -Filter "*.log" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

    if ($latestLog) {
        Write-Host "  Found log: $($latestLog.Name)" -ForegroundColor White

        # Extract basic statistics
        $logContent = Get-Content $latestLog.FullName
        $totalEntries = ($logContent | Where-Object { $_ -match '^\[' }).Count
        $errorCount = ($logContent | Where-Object { $_ -match 'ERROR' }).Count
        $warnCount = ($logContent | Where-Object { $_ -match 'WARN' }).Count

        # Extract namespaces
        $namespaces = $logContent | Where-Object { $_ -match '\[.*?\]\s+\w+\s+([^:]+):' } | ForEach-Object {
            if ($_ -match '\[.*?\]\s+\w+\s+([^:]+):') {
                $matches[1]
            }
        } | Group-Object | Sort-Object Count -Descending

        # Create summary
        $summary = @{
            logFile = $latestLog.Name
            totalEntries = $totalEntries
            errorCount = $errorCount
            warnCount = $warnCount
            topNamespaces = $namespaces | Select-Object -First 10 | ForEach-Object {
                @{ namespace = $_.Name; count = $_.Count }
            }
        }

        $summary | ConvertTo-Json -Depth 3 | Out-File "analysis/log-summary.json"
        Write-Host "    ✅ Created analysis/log-summary.json" -ForegroundColor Green

        # Display summary
        Write-Host ""
        Write-Host "  📊 Log Summary:" -ForegroundColor Cyan
        Write-Host "    Total entries: $totalEntries" -ForegroundColor White
        Write-Host "    Errors: $errorCount" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Green" })
        Write-Host "    Warnings: $warnCount" -ForegroundColor $(if ($warnCount -gt 0) { "Yellow" } else { "Green" })
        Write-Host "    Top namespace: $($namespaces[0].Name) ($($namespaces[0].Count) entries)" -ForegroundColor White
    }
} else {
    Write-Host "  ⚠️  No logs found at $logPath" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎯 Generating review priorities..." -ForegroundColor Yellow

# Analyze dependency metrics
Write-Host "  Analyzing module complexity..." -ForegroundColor White

# Get dependency analysis
$jsonFile = "analysis/dependency-metrics.json"
npx depcruise src --output-type json 2>$null | Out-File -Encoding UTF8 $jsonFile

if (Test-Path $jsonFile) {
    Write-Host "    ✅ Created $jsonFile" -ForegroundColor Green
}

Write-Host ""
Write-Host "✨ Workspace setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Generated files:" -ForegroundColor Cyan
Write-Host "  graphs/         - Dependency visualizations" -ForegroundColor White
Write-Host "  analysis/       - Log and metric analysis" -ForegroundColor White
Write-Host "  reviews/        - Review checklists (create as you go)" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Open graphs/full.svg to see architecture" -ForegroundColor White
Write-Host "  2. Review analysis/log-summary.json" -ForegroundColor White
Write-Host "  3. Run: node scripts/generate-review-priorities.js" -ForegroundColor White
Write-Host "  4. Start reviewing high-priority modules!" -ForegroundColor White
Write-Host ""
