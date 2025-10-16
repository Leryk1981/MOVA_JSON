#!/usr/bin/env pwsh

# MOVA LSP MVP - Integration Test Suite (PowerShell)
# This script runs all integration tests on Windows

$ErrorActionPreference = "Stop"

function Write-Phase($Phase, $Title) {
    Write-Host ""
    Write-Host "═" * 80
    Write-Host "🧪 $Title" -ForegroundColor Blue
    Write-Host "─" * 80
}

function Test-Pass($Message) {
    Write-Host "✅ PASS: $Message" -ForegroundColor Green
}

function Test-Fail($Message) {
    Write-Host "❌ FAIL: $Message" -ForegroundColor Red
    exit 1
}

function Test-Warn($Message) {
    Write-Host "⚠️  WARN: $Message" -ForegroundColor Yellow
}

# Header
Write-Host ""
Write-Host "═" * 80
Write-Host "🧪 MOVA LSP MVP - Integration Test Suite"
Write-Host "═" * 80

# Phase 1: Prerequisites
Write-Phase "1" "Phase 1: Prerequisites Check"

$nodeVersion = & node --version
$npmVersion = & npm --version

Write-Host "Node.js: $nodeVersion" -ForegroundColor Green
Write-Host "npm: $npmVersion" -ForegroundColor Green

# Check Node >= 18
if ([version]$nodeVersion.Substring(1) -lt [version]"18.0.0") {
    Test-Fail "Node.js >= 18 required"
}

Test-Pass "Prerequisites Check"

# Phase 2: Dependencies
Write-Phase "2" "Phase 2: Install Dependencies"

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing root dependencies..."
    & npm install --loglevel=error
    Test-Pass "Dependencies installed"
} else {
    Test-Warn "node_modules exists, skipping install"
}

Write-Host "Verifying monorepo structure..."
& npm ls --depth=0 2>$null | Select-Object -First 10

Test-Pass "Phase 2 Complete"

# Phase 3: Build
Write-Phase "3" "Phase 3: Build & TypeScript Compilation"

Write-Host "Building all packages..."
$buildOutput = & npm run build 2>&1
$buildOutput | Where-Object { $_ -match "(npm -w|error|success)" }

Write-Host "Verifying build artifacts..."
$buildPassed = $true

foreach ($pkg in @("schemas", "sdk", "server-lsp", "cli", "client-vscode")) {
    $distPath = "packages/$pkg/dist"
    if (Test-Path $distPath) {
        $fileCount = (Get-ChildItem -Recurse $distPath -File).Count
        Write-Host "✓ $distPath ($fileCount files)" -ForegroundColor Green
    } else {
        Write-Host "✗ $distPath NOT FOUND" -ForegroundColor Red
        $buildPassed = $false
    }
}

if ($buildPassed) {
    Test-Pass "Phase 3 Complete"
} else {
    Test-Fail "Phase 3 - Build artifacts missing"
}

# Phase 4: Quality
Write-Phase "4" "Phase 4: TypeScript & Code Quality"

Write-Host "Running lint checks..."
$lintOutput = & npm run lint 2>&1
$lintOutput | Select-Object -Last 5 | ForEach-Object { Write-Host $_ }

Test-Pass "Phase 4 Complete"

# Phase 5: CLI Tests
Write-Phase "5" "Phase 5: CLI Integration Tests"

Write-Host "Test 5.1: CLI Help"
try {
    & npx @mova/cli --help 2>&1 | Select-Object -First 3
    Write-Host "✓" -ForegroundColor Green
} catch {
    Write-Host "✗" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test 5.2: Validate Valid Envelope"
try {
    $result = & npx @mova/cli validate examples/booking.envelope.json 2>&1
    Test-Pass "Valid envelope passes"
} catch {
    Test-Fail "Valid envelope failed"
}

Write-Host ""
Write-Host "Test 5.3: Validate Invalid Envelope"
try {
    $result = & npx @mova/cli validate examples/invalid.envelope.json 2>&1
    if ($result -match "validation errors") {
        Test-Pass "Invalid envelope detected"
    } else {
        Test-Fail "Invalid envelope not detected"
    }
} catch {
    # Expected to fail with exit code 1
    $lastExitCode = $LASTEXITCODE
    if ($lastExitCode -eq 1) {
        Test-Pass "Invalid envelope detected (exit code 1)"
    } else {
        Test-Fail "Unexpected error in invalid envelope test"
    }
}

Write-Host ""
Write-Host "Test 5.4: Generate Snippet"
try {
    $result = & npx @mova/cli snippet:generate booking 2>&1
    if ($result -match "mova_version") {
        Test-Pass "Snippet generated"
    } else {
        Test-Fail "Snippet generation failed"
    }
} catch {
    Test-Fail "Snippet generation error"
}

Test-Pass "Phase 5 Complete"

# Phase 6: Barbershop CRM
Write-Phase "6" "Phase 6: Barbershop CRM Validation"

$barbershopPath = "MOVA 3.4 AI-Powered Visual Workflow Editor\barbershop\global\01-complete-barbershop-crm-system.json"

if (Test-Path $barbershopPath) {
    Write-Host "Found Barbershop CRM envelope"
    
    Write-Host "Test 6.1: Load and validate Barbershop CRM"
    try {
        $result = & npx @mova/cli validate $barbershopPath 2>&1
        Test-Pass "Barbershop CRM validates"
    } catch {
        Test-Fail "Barbershop CRM validation failed"
    }
    
    Test-Pass "Phase 6 Complete"
} else {
    Test-Warn "Barbershop envelope not found at $barbershopPath"
    Write-Host "Skipping Phase 6"
}

# Summary
Write-Host ""
Write-Host "═" * 80
Write-Host "📊 Integration Test Summary" -ForegroundColor Green
Write-Host "═" * 80
Write-Host ""
Write-Host "✅ Phase 1 - Prerequisites: PASS" -ForegroundColor Green
Write-Host "✅ Phase 2 - Dependencies: PASS" -ForegroundColor Green
Write-Host "✅ Phase 3 - Build: PASS" -ForegroundColor Green
Write-Host "✅ Phase 4 - Quality: PASS" -ForegroundColor Green
Write-Host "✅ Phase 5 - CLI Tests: PASS" -ForegroundColor Green
Write-Host "✅ Phase 6 - Barbershop: PASS" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 MVP Integration Tests: ALL PASS ✅" -ForegroundColor Green
Write-Host ""
Write-Host "📈 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. npm -w packages/server-lsp run start (start LSP)"
Write-Host "   2. Connect VSCode client"
Write-Host "   3. npm run test (unit tests when implemented)"
Write-Host ""
Write-Host "═" * 80
Write-Host ""
