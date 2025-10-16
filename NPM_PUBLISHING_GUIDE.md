# MOVA LSP - NPM Publishing Guide

**Date:** October 16, 2025  
**Status:** Ready for Publishing

---

## 📋 Pre-Publishing Checklist

### ✅ Completed:
- [x] All packages build successfully (0 errors)
- [x] Integration tests passing (26/26)
- [x] Code quality checks (lint, format)
- [x] AJV 8.17.1 verified
- [x] ESM modules configured
- [x] TypeScript strict mode enabled
- [x] Type definitions generated
- [x] Examples provided

### 📦 Packages Ready for Publishing:

| Package | Version | Main Entry | Description |
|---------|---------|-----------|-------------|
| @mova/schemas | 3.4.1 | dist/index.js | Canonical JSON Schema |
| @mova/sdk | 0.1.0 | dist/index.js | Core SDK - AJV Validator |
| @mova/server-lsp | 0.1.0 | dist/server.js | Language Server Protocol |
| @mova/client-vscode | 0.1.0 | dist/extension.js | VS Code Extension Client |
| @mova/cli | 0.1.0 | dist/cli.js | Command-Line Interface |

---

## 🔑 Prerequisites

### 1. NPM Account Setup
```bash
# Option A: If you have npm account
npm login
# Enter username, password, email

# Option B: Create new organization @mova (if not exists)
npm org create mova  # Creates organization
npm org add mova <username>  # Add yourself to org
```

### 2. Verify npm Configuration
```bash
npm config get registry
# Should output: https://registry.npmjs.org/
```

### 3. Check Package Access
```bash
npm access ls-packages
# Lists packages you can publish to
```

---

## 📝 Pre-Publishing Tasks

### Step 1: Verify Package Names Are Available

**Check each package:**
```bash
npm view @mova/schemas
npm view @mova/sdk
npm view @mova/server-lsp
npm view @mova/client-vscode
npm view @mova/cli
```

If package exists, you'll see 404 (good - available for first publish).  
If already published, you'll see package info.

### Step 2: Update .npmrc (Optional but Recommended)

Create/update `~/.npmrc`:
```
registry=https://registry.npmjs.org/
@mova:registry=https://registry.npmjs.org/
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
```

### Step 3: Verify Build Output

```bash
# Check dist directories exist for each package
ls packages/schemas/dist/
ls packages/sdk/dist/
ls packages/server-lsp/dist/
ls packages/client-vscode/dist/
ls packages/cli/dist/

# Verify package.json exports are correct
cat packages/sdk/package.json | grep -A 5 '"exports"'
```

### Step 4: Test Local Installation

```bash
# Create test directory
mkdir -p /tmp/test-mova
cd /tmp/test-mova
npm init -y

# Install from local (before publishing)
npm install file:path/to/mova_npm/packages/sdk
npm install file:path/to/mova_npm/packages/schemas

# Verify imports work
node -e "import('@mova/sdk').then(m => console.log('✓ SDK loaded'))"
```

---

## 🚀 Publishing Process

### Option 1: Manual Publishing (For Testing)

```bash
cd D:\Projects_Clean\mova_npm

# Step 1: Build all packages
npm run build

# Step 2: Publish each package individually
cd packages/schemas
npm publish --access public

cd ../sdk
npm publish --access public

cd ../server-lsp
npm publish --access public

cd ../client-vscode
npm publish --access public

cd ../cli
npm publish --access public
```

### Option 2: Using Changesets (Recommended)

```bash
cd D:\Projects_Clean\mova_npm

# Step 1: Create changeset
npm run changeset

# Follow prompts:
# - Select packages changed
# - Select semver bump (major/minor/patch)
# - Add changelog entry

# Step 2: Version packages
npx changeset version

# Step 3: Publish
npm run publish:all
```

### Option 3: Automated via GitHub Actions (Production)

1. Commit changes to main
2. GitHub Actions CI runs: build → test → lint
3. On success, GitHub Actions automatically:
   - Runs changesets
   - Bumps versions
   - Publishes to npm
4. Packages available on npm registry

**Requires:** `NPM_TOKEN` secret configured in GitHub

---

## ✅ Post-Publishing Verification

### Verify Packages Are Published

```bash
# Check npm registry
npm info @mova/schemas
npm info @mova/sdk
npm info @mova/server-lsp
npm info @mova/client-vscode
npm info @mova/cli

# Should show: name, version, latest, dist-tags, homepage
```

### Install from npm in Test Project

```bash
mkdir -p ~/mova-test
cd ~/mova-test
npm init -y

# Install packages
npm install @mova/sdk@0.1.0
npm install @mova/schemas@3.4.1
npm install @mova/cli@0.1.0

# Test imports
node -e "
import('@mova/sdk').then(sdk => {
  console.log('✓ @mova/sdk loaded');
  console.log('✓ Functions:', Object.keys(sdk).filter(k => typeof sdk[k] === 'function').length);
});
"

# Test CLI
npx @mova/cli --version
npx @mova/cli validate --help
```

### Update Package Documentation

```bash
# Verify README links to npm
npm package @mova/sdk
# Should show: https://www.npmjs.com/package/@mova/sdk
```

---

## 🔒 Security Checklist

Before publishing to production:

- [ ] npm audit passes (no high/critical vulnerabilities)
- [ ] Credentials not in code/git history
- [ ] .npmrc includes auth token (locally only)
- [ ] GitHub Secrets configured:
  - [ ] `NPM_TOKEN` set and active
  - [ ] Only publish workflow uses token
- [ ] 2FA enabled on npm account (recommended)
- [ ] Package access verified (public access)
- [ ] No private keys in dist/

**Run security check:**
```bash
npm audit
npm audit fix  # if needed

# Check for secrets
npm run lint  # ESLint checks for hardcoded secrets
```

---

## 📊 Publishing Checklist

### Before First Publish:

- [ ] npm account created & verified
- [ ] `@mova` organization created (if needed)
- [ ] npm authentication working locally
- [ ] All tests passing (npm run test)
- [ ] Lint clean (npm run lint)
- [ ] Build succeeds (npm run build)
- [ ] Versions set correctly (0.1.0 for MVP)
- [ ] package.json `publishConfig.access: "public"` set
- [ ] README.md present in each package
- [ ] LICENSE file present (in root)
- [ ] .npmignore or files field configured

### First Publish (One-Time):

- [ ] Manual test install from file://
- [ ] Manually publish first package (@mova/schemas)
- [ ] Verify on npm registry
- [ ] Publish remaining packages in order:
  1. @mova/schemas ✅
  2. @mova/sdk (depends on schemas) ✅
  3. @mova/server-lsp (depends on sdk) ✅
  4. @mova/client-vscode (depends on sdk, server-lsp) ✅
  5. @mova/cli (depends on sdk) ✅

### Post-First-Publish (Automation):

- [ ] GitHub Actions publish.yml configured
- [ ] NPM_TOKEN secret added to GitHub
- [ ] Changesets configured in CI
- [ ] Test: push change → verify auto-publish

---

## 🎯 Quick Start (For Release)

```bash
# 1. Build everything
npm run build

# 2. Verify login
npm whoami

# 3. Publish all (manual - one-time)
cd packages/schemas && npm publish --access public
cd ../sdk && npm publish --access public
cd ../server-lsp && npm publish --access public
cd ../client-vscode && npm publish --access public
cd ../cli && npm publish --access public

# 4. Verify
npm info @mova/sdk

# 5. Test installation
mkdir ~/test-mova-pkg && cd ~/test-mova-pkg
npm init -y
npm install @mova/sdk
node -e "import('@mova/sdk').then(m => console.log('✓ Works!'))"
```

---

## 📱 GitHub Actions Integration

### Setup NPM_TOKEN Secret

1. **Local:** Generate npm token
   ```bash
   npm token create --read-only  # For CI
   # Or:
   npm token create  # For publish (use with caution)
   ```

2. **GitHub:** Add token as secret
   - Go to repo Settings → Secrets and variables → Actions
   - Add `NPM_TOKEN` with value from step 1
   - Scope: All workflows

3. **Workflows:** Use in CI
   ```yaml
   - name: Publish to npm
     run: npm run publish:all
     env:
       NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
   ```

---

## ⚠️ Troubleshooting

### "Package already exists"
- Increment version in package.json or changeset
- Cannot republish same version to npm

### "Need auth" error
```bash
npm login
# OR
npm token create  # Generate new token
```

### "@mova is not a valid package name"
- Create npm organization first
- Or use scoped package with public access

### "dist/ not found"
```bash
# Rebuild before publishing
npm run build
# Verify files field in package.json includes dist/
```

### Publish stuck/failed
- Check npm status: https://status.npmjs.org/
- Re-run publish command
- Try different internet connection

---

## 📚 References

- npm Docs: https://docs.npmjs.com/
- Changesets: https://github.com/changesets/changesets
- Scoped Packages: https://docs.npmjs.com/cli/v8/using-npm/scope
- npm Publish: https://docs.npmjs.com/cli/v8/commands/npm-publish

---

## 🎉 Success Criteria

After publishing, you should see:

✅ Packages available on https://www.npmjs.com/  
✅ Each package has correct version  
✅ README visible on npm  
✅ Installation works: `npm install @mova/sdk`  
✅ Imports work in Node.js  
✅ CLI executable: `npx @mova/cli`  

---

**Status:** Ready to publish 🚀  
**Next:** Execute steps above to publish to npm!
