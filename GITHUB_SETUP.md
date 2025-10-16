# GitHub Setup Guide - MOVA LSP CI/CD

**Last Updated:** October 16, 2025  
**Status:** ✅ Ready for Configuration

---

## 📋 Overview

This guide walks you through setting up GitHub Actions for continuous integration and automated npm publishing.

**What will be automated:**
- ✅ Build on every push/PR to `main` and `develop`
- ✅ Test on Node.js 18.x and 20.x
- ✅ Lint and format checks
- ✅ Security audits
- ✅ Automatic npm publishing on changeset
- ✅ GitHub release creation

---

## 🔑 Step 1: Create NPM Token

### Generate Token on npm.com

1. Go to https://www.npmjs.com/settings/~/tokens
2. Click **"Generate New Token"**
3. Select **"Automation"** (recommended for CI/CD)
4. Name it: `github-ci-token`
5. **Copy the token** (you'll only see it once!)

```
npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Token Permissions

```
✅ Publish packages to npm
✅ Create package tags
✅ Write scopes
```

---

## 🔐 Step 2: Add Secrets to GitHub

### Go to GitHub Repository Settings

1. Navigate to: `https://github.com/yourusername/mova-lsp/settings/secrets/actions`
2. Click **"New repository secret"**

### Add NPM_TOKEN

| Secret Name | Value |
|-------------|-------|
| **NPM_TOKEN** | `npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxx` |

### Verify Secrets

```bash
# These will be used by GitHub Actions workflows
# - GitHub Actions will read NPM_TOKEN from secrets
# - GITHUB_TOKEN is auto-generated (no action needed)
```

---

## 📁 Step 3: GitHub Actions Files (Already Configured)

### CI Workflow (`.github/workflows/ci.yml`)

```yaml
# Runs on every push/PR
# - Builds packages
# - Runs tests
# - Lints code
# - Checks format
# - Runs security audit
```

### Publish Workflow (`.github/workflows/publish.yml`)

```yaml
# Runs on main branch when packages/ or .changeset/ changes
# - Builds packages
# - Runs tests
# - Creates release PR with changesets
# - Publishes to npm
# - Creates GitHub Release
```

---

## 🚀 Step 4: Enable GitHub Actions

### Enable Actions

1. Go to: `https://github.com/yourusername/mova-lsp/actions`
2. You should see workflows listed:
   - ✅ `CI`
   - ✅ `Publish Packages`

### If Actions are Disabled

1. Go to: `Settings` → `Actions` → `General`
2. Set `Actions permissions` to: **"Allow all actions and reusable workflows"**
3. Click **"Save"**

---

## 📝 Step 5: Using Changesets

### Workflow for Publishing

```bash
# 1. Make changes and commit
git add .
git commit -m "feat: new feature"

# 2. Create a changeset
npm run changeset

# Follow prompts:
# - Select packages changed (e.g., leryk-sdk-mova)
# - Select bump type: patch/minor/major
# - Add changelog description

# 3. Commit changeset
git add .changeset/
git commit -m "chore: changesets"

# 4. Push to main
git push origin main

# GitHub Actions will:
# - Create a Release PR with version bumps
# - Publish to npm (when PR is merged)
# - Create GitHub Release
```

### Example Changeset

```
❯ npm run changeset

? Which packages would you like to include? leryk-sdk-mova
? What type of change? patch
? Please enter a summary: Fix validation error mapping

File created at .changeset/cozy-cats-1234.md
```

---

## ✅ Step 6: Verify Setup

### Check Workflows

```bash
# After pushing changesets to main, check:
# 1. Go to Actions tab
# 2. Watch the "Publish Packages" workflow run
# 3. Verify packages appear on npm
```

### Verify NPM Publish

```bash
# After workflow completes:
npm info leryk-sdk-mova
npm info leryk-schemas-mova
npm info leryk-lsp-mova
npm info leryk-cli-mova
npm info leryk-vscode-mova
```

### Check npm Profile

Visit: https://www.npmjs.com/~leryk1981

You should see all 5 packages published.

---

## 🔄 Automated Publishing Workflow

```
1. Developer commits code → Push to main
         ↓
2. GitHub Actions CI runs → Build, test, lint
         ↓
3. If changes to .changeset/ → Publish workflow starts
         ↓
4. Changesets creates Release PR → Shows version bumps
         ↓
5. Merge Release PR → Automatically publishes to npm
         ↓
6. GitHub Release created → Tags and notes
         ↓
7. ✅ All packages published to npm
```

---

## 🛠️ Troubleshooting

### CI Fails: "Cannot find module '@mova/sdk'"

**Fix:** Ensure `npm run build` runs before tests
- Check in `.github/workflows/ci.yml`
- Verify `npm install` is called before build

### Publish Fails: "NPM_TOKEN not set"

**Fix:** Verify token in GitHub Secrets
```bash
1. Go to Settings → Secrets and variables → Actions
2. Verify NPM_TOKEN exists and is not empty
3. Regenerate token if expired
```

### Changesets Action Fails

**Fix:** Ensure changesets directory exists
```bash
# Should exist at root:
ls .changeset/config.json
# If not, recreate:
npm run changeset -- init
```

### Version Already Published

**Fix:** Increment version in `package.json`
```bash
# Update version in:
packages/*/package.json
# Then create changeset with new version
```

---

## 📊 Monitoring Workflows

### View Workflow Runs

**URL:** `https://github.com/yourusername/mova-lsp/actions`

**Watch for:**
- ✅ Green checkmarks = Success
- ❌ Red X marks = Failure
- ⏳ Orange circles = In progress

### View Workflow Logs

1. Click workflow run
2. Click job (e.g., "build-and-test")
3. Expand steps to see logs

### Download Artifacts

If uploading artifacts:
1. Go to workflow run
2. Scroll down to "Artifacts"
3. Download files

---

## 🔑 Security Best Practices

### NPM Token Security

```bash
✅ DO:
- Rotate token every 90 days
- Use "Automation" token type
- Store only in GitHub Secrets
- Never commit token to git

❌ DON'T:
- Share token with anyone
- Use "Publish" token without automation
- Store in .env files
- Log token in CI output
```

### GitHub Token

- Auto-generated by GitHub Actions
- Scoped to repository
- Expires after job completes
- No action needed from you

---

## 📚 Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Changesets Documentation](https://github.com/changesets/changesets)
- [npm Token Management](https://docs.npmjs.com/using-private-packages-in-a-ci-cd-workflow)
- [Secrets in GitHub Actions](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

---

## ✨ Next Steps

1. ✅ Create NPM token
2. ✅ Add NPM_TOKEN to GitHub Secrets
3. ✅ Enable GitHub Actions
4. ✅ Make a change and create changeset
5. ✅ Push to main and watch workflow run
6. ✅ Verify packages published to npm

---

**Status:** ✅ GitHub Actions Configured  
**Last Updated:** October 16, 2025  
**Next:** Monitor first automated publish
