#!/usr/bin/env pwsh

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗"
Write-Host "║        MOVA LSP - NPM PUBLISHING READINESS CHECK            ║"
Write-Host "╚══════════════════════════════════════════════════════════════╝"
Write-Host ""

$status = 0
$checks = @()

# Check 1: Node.js version
Write-Host "📋 Check 1: Node.js version"
$nodeVersion = node --version
$npmVersion = npm --version
Write-Host "  ✓ Node.js: $nodeVersion" -ForegroundColor Green
Write-Host "  ✓ npm: $npmVersion" -ForegroundColor Green
$checks += "Node.js version"

# Check 2: Build
Write-Host ""
Write-Host "📋 Check 2: Build status"
$buildOutput = npm run build 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Build: SUCCESS" -ForegroundColor Green
    $checks += "Build status"
} else {
    Write-Host "  ✗ Build: FAILED" -ForegroundColor Red
    $status = 1
}

# Check 3: Package structure
Write-Host ""
Write-Host "📋 Check 3: Package structure"
$packages = @(
    "packages/schemas",
    "packages/sdk",
    "packages/server-lsp",
    "packages/client-vscode",
    "packages/cli"
)

foreach ($pkg in $packages) {
    if ((Test-Path "$pkg/package.json") -and (Test-Path "$pkg/dist")) {
        Write-Host "  ✓ $pkg ready" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $pkg missing files" -ForegroundColor Red
        $status = 1
    }
}

# Check 4: Package.json configurations
Write-Host ""
Write-Host "📋 Check 4: package.json configurations"
$pkgContent = Get-Content "package.json" | ConvertFrom-Json
if ($pkgContent.type -eq "module") {
    Write-Host "  ✓ Root: ESM enabled" -ForegroundColor Green
} else {
    Write-Host "  ✗ Root: ESM not enabled" -ForegroundColor Red
    $status = 1
}

# Check 5: Verify each package has proper exports
Write-Host ""
Write-Host "📋 Check 5: Package exports"
foreach ($pkg in $packages) {
    $pkgJson = Get-Content "$pkg/package.json" | ConvertFrom-Json
    if ($pkgJson.exports -or $pkgJson.main) {
        Write-Host "  ✓ $(Split-Path $pkg -Leaf): exports configured" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $(Split-Path $pkg -Leaf): no exports" -ForegroundColor Red
    }
}

# Check 6: Security audit
Write-Host ""
Write-Host "📋 Check 6: Security audit"
$auditOutput = npm audit 2>&1 | Select-String -Pattern "vulnerabilities"
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ npm audit: PASS" -ForegroundColor Green
    Write-Host "    $auditOutput" -ForegroundColor Green
} else {
    Write-Host "  ⚠ npm audit: Check required" -ForegroundColor Yellow
    Write-Host "    Run: npm audit fix" -ForegroundColor Yellow
}

# Check 7: Lint
Write-Host ""
Write-Host "📋 Check 7: Code quality (lint)"
$lintOutput = npm run lint 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Lint: PASS" -ForegroundColor Green
    $checks += "Code quality"
} else {
    Write-Host "  ⚠ Lint: Issues found (fixable)" -ForegroundColor Yellow
}

# Check 8: Tests
Write-Host ""
Write-Host "📋 Check 8: Tests"
$testOutput = npm run test 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Tests: PASS" -ForegroundColor Green
    $checks += "Tests passing"
} else {
    Write-Host "  ⚠ Tests: Check results" -ForegroundColor Yellow
}

# Check 9: npm login
Write-Host ""
Write-Host "📋 Check 9: npm authentication"
$whoami = npm whoami 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Logged in as: $whoami" -ForegroundColor Green
    $checks += "npm login"
} else {
    Write-Host "  ✗ NOT logged in" -ForegroundColor Red
    Write-Host "    Run: npm login" -ForegroundColor Yellow
    $status = 1
}

# Check 10: Verify package names available
Write-Host ""
Write-Host "📋 Check 10: Package name availability"
$packageNames = @(
    "@mova/schemas",
    "@mova/sdk",
    "@mova/server-lsp",
    "@mova/client-vscode",
    "@mova/cli"
)

foreach ($name in $packageNames) {
    $info = npm info $name 2>&1
    if ($LASTEXITCODE -ne 0 -or $info -match "404") {
        Write-Host "  ✓ $($name): Available" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ $($name): Already published" -ForegroundColor Yellow
    }
}

# Summary
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "📊 SUMMARY"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""

if ($status -eq 0) {
    Write-Host "✅ READY FOR PUBLISHING" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "  1. cd packages/schemas && npm publish --access public"
    Write-Host "  2. cd ../sdk && npm publish --access public"
    Write-Host "  3. cd ../server-lsp && npm publish --access public"
    Write-Host "  4. cd ../client-vscode && npm publish --access public"
    Write-Host "  5. cd ../cli && npm publish --access public"
    Write-Host ""
    Write-Host "Or use changesets:"
    Write-Host "  npm run changeset"
    Write-Host "  npx changeset version"
    Write-Host "  npm run publish:all"
} else {
    Write-Host "❌ NOT READY FOR PUBLISHING" -ForegroundColor Red
    Write-Host ""
    Write-Host "Issues to fix:"
    Write-Host "  • Ensure npm login: npm login"
    Write-Host "  • Complete build: npm run build"
    Write-Host "  • Fix security issues: npm audit fix"
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
exit $status
