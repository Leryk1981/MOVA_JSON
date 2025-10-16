# Техническое задание (ТЗ) — LSP для MOVA (ESM, npm-first, SDK в npm)

Кратко: нужно разработать полнофункциональный Language Server (LSP) + сопровождающий SDK и CLI, всё организовать как mono-repo npm-workspaces, экспортировать в виде ESM-пакетов и публиковать каждую часть в npm. Ниже — подробное ТЗ с требованиями, архитектурой, API-контрактами, процессом сборки/публикации, критериями приёмки и checklist для разработки.

---

# 1. Цели и мотивы

* Дать разработчикам MOVA IDE-уровень опыта: hover, completion, diagnostics, code actions, formatting, rename, references, document symbols и workspace symbols.
* Использовать единую «single source of truth» — JSON Schema (AJV 2020-12) и frame/lexicon registry.
* Все модули — ESM, типизированы TypeScript, публикуются в npm (идентичные пакеты/версии для CI/CD).
* SDK для интеграции (вызов валидации, генерация quick-fix, лексикон) — доступен как npm-пакет, использующий ESM API.
* CI: автоматическая сборка, тесты, package publish через GitHub Actions + npm token.

---

# 2. Область работ (Scope)

Включить:

* language-server (server package) — реализация LSP на Node (v18+), ESM.
* client wrapper (optional) — vscode client starter (extension package) — экспортирует wire protocol + helper commands.
* sdk (sdk package) — AJV validator wrapper, lexicon registry loader, quickfix generator, schema sync util, utils for mapping AJV errors → diagnostics with positions.
* schemas (schemas package) — canonical AJV schemas (envelope.3.4.schema.json и вспомогательные).
* cli (cli package) — локальные команды: `mova-lsp validate`, `mova-lsp schema:sync`, `mova-lsp package:generate-snippets`.
* dev tooling, tests, docs, examples.
* publishing pipeline (CI) — build/test/publish.

Не входит:

* Marketplace publishing VS Code extension (может быть отдельной задачей).
* Отдельная реализация executor; только интеграция через конфиг/endpoint.

---

# 3. Высокоуровневая архитектура и пакеты (npm workspaces)

Рекомендуемая структура (mono-repo):

```
/repo-root (package.json with "workspaces")
├─ packages/
│  ├─ schemas/           # canonical AJV schemas (published)
│  ├─ sdk/               # core SDK (ESM) (published)
│  ├─ server-lsp/        # language server (published)
│  ├─ client-vscode/     # VSCode client starter (extension pack) (published, optional)
│  └─ cli/               # CLI thin wrapper (published)
├─ examples/
├─ scripts/
└─ .github/workflows/
```

Каждый пакет — свой package.json, `type: "module"`, ESM entry (`exports` field). Использовать npm workspaces для локальной разработки и синхронного bump/publish.

---

# 4. Технологии / стек

* Node.js >=18 (ESM native).
* TypeScript (strict true).
* `vscode-languageserver` (server) и `vscode-languageclient` (client) — поддерживать LSP протокол.
* AJV 2020-12 (shared в sdk) — валидатор (precompiled схемы).
* `jsonc-parser` — парсинг JSON с позициями (для точных diagnostics).
* Bundler: `tsup` или `esbuild` (предпочтение tsup для простоты).
* Testing: `mocha`/`ava` + `vscode-test` для client integration tests.
* Lint: `eslint` (TypeScript + ESM rules), `prettier`.
* Release: `changesets` (интеграция с npm publish) или npm version + automated publish via GitHub Actions.
* CI: GitHub Actions (build, test, package, publish).
* Docs: typedoc (для SDK) + MD examples.

---

# 5. Функциональные требования (LSP capabilities)

Минимум (MVP):

1. **TextDocumentSync**: full & incremental sync.
2. **Diagnostics**: AJV на лету, отображение ошибок/предупреждений.

   * Error → diagnostic с точной позицией (использовать jsonc-parser to map instancePath → Range).
3. **Completion**:

   * Contextual suggestions: verbs, nouns, policies, common template snippets.
   * Snippet support (insertTextFormat = Snippet).
4. **Hover**: краткие описания полей, ссылки на schema/docs.
5. **Code Actions / Quick Fixes**:

   * Автогенерация idempotency_key, исправление типов, autofix for common policy omissions.
6. **Document Symbols**: план → steps → show outline.
7. **Workspace Symbols**: список конвертов/plans по проекту.
8. **Formatting** (optional MVP): basic JSON/YAML formatting aligned with project style.
9. **Rename / References** (optional): поддержка рефакторинга идентификаторов внутри планов.
10. **Execute Command**: LSP command to run a plan (dry run) — send to local executor endpoint via SDK.

Продвинутые:

* Diagnostics severity mapping, quick-fix templates, integrated runner panel, trace logs, telemetry opt-in.

---

# 6. Нефункциональные требования

* **Performance**: server должен обслуживать workspace с 1000+ файлов, инкрементальная валидация.
* **Modularity**: исключительно ESM exports; SDK — легковесный, tree-shakeable.
* **Type safety**: все публичные API типизированы (d.ts via tsbuild).
* **Security**: secrets (executor token) не хардкодятся; CLI/extension используют system keyring or environment variables.
* **Licensing**: MIT/Apache (определить).
* **GDPR**: telemetry opt-in only; EU storage requirements respected.

---

# 7. SDK — контракт (API)

Публикуемый ESM пакет `@mova/sdk` (примерный API):

```ts
// packages/sdk/src/index.ts (ESM)
export type ValidateResult = {
  ok: boolean;
  errors?: Ajv.ErrorObject[];
  diagnostics?: Array<{ range: Range; severity: 'error'|'warning'; message: string }>;
};

export interface SchemaOptions {
  schemaDir?: string; // path to local schemas (default: from package)
}

export async function loadSchemas(opts?: SchemaOptions): Promise<void>;

export function validateDocument(text: string, filepath?: string): Promise<ValidateResult>;

export function ajvValidate(obj: unknown): { ok: boolean; errors?: Ajv.ErrorObject[] };

export function mapAjvErrorsToDiagnostics(errors: Ajv.ErrorObject[], text: string): Diagnostic[];

export function suggestCompletions(context: CompletionContext): CompletionItem[];

export function generateIdempotencyKey(context: { category: string; userId?: string; timestamp?: number }): string;
```

Требования к SDK:

* ESM only, `"exports"` + `"types"` в package.json.
* Small runtime (< 200KB gzipped preferable).
* Tests for each API.
* Expose utilities for server: schema hot-reload, cache invalidation.

---

# 8. Server (language server) — детали реализации

* Entry: `packages/server-lsp/src/server.ts` — createConnection(ProposedFeatures.all).
* Document store: TextDocuments (lsp helper) + JSONC parser for range mapping.
* Validation pipeline:

  1. onDidChangeContent → parse json/yaml using jsonc-parser → build AST.
  2. call sdk.validateDocument → get AJV errors.
  3. sdk.mapAjvErrorsToDiagnostics → produce LSP Diagnostics → connection.sendDiagnostics.
* Completion/hover: use lexicon registry (from `packages/schemas/lexicon.json` or remote). Support fuzzy matching.
* Commands: `mova.runPlanDry`, `mova.schemaSync`, `mova.generateSnippet`.
* Config: accept `mova.lsp` workspace settings (schema path, allowlist, executor endpoint).
* Logging: structured traces (PINO or console) with traceId per request.
* Hot reload of schemas on file change.

---

# 9. Client-side (vscode) — minimal wrapper

* package `client-vscode` provides a ready-to-use extension that starts the server and registers:

  * Commands: validate, run dry, generate idempotency token.
  * Diagnostics display (from server).
  * Snippets and language association `.mova`, `envelope.json`.
* Extension is thin: relies on server for logic. Keep publish optional.

---

# 10. CLI

* package `cli` exports an executable ESM script (`bin` field) with commands:

  * `mova validate [file]`
  * `mova schema:sync --from <url>`
  * `mova snippet:generate --type booking`
  * `mova run --dry [file]` (calls server or executor endpoint via sdk)
* Use `cac` or `commander` for CLI.

---

# 11. Build & packaging

* Use `tsup` (ESM target) per package:

  * `tsup src/index.ts --format esm --dts`.
* package.json template (each package):

```json
{
  "name": "@mova/sdk",
  "version": "0.0.0-dev",
  "type": "module",
  "main": "./dist/index.js",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsup",
    "test": "mocha -r ts-node/register test",
    "lint": "eslint . --ext .ts",
    "prepublishOnly": "npm run build && npm test"
  },
  "engines": { "node": ">=18" },
  "files": ["dist/**/*"],
  "dependencies": { "ajv": "^8.12.0", "jsonc-parser": "^3.0.0" },
  "devDependencies": { "tsup": "^6.0.0", "typescript": "^5.0.0" }
}
```

* Root `package.json` enables workspaces and scripts:

```json
{
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "pnpm -w -r run build",
    "test": "pnpm -w -r run test",
    "lint": "pnpm -w -r run lint",
    "publish:all": "changeset publish --snapshot"
  },
  "devDependencies": { "changesets": "^2.0.0" }
}
```

(замена pnpm на npm: `npm` тоже поддерживает workspaces; рекомендую pnpm для speed, но вы просили npm — можно использовать `npm` workspaces аналогично).

---

# 12. Publishing strategy (npm)

* Использовать npm workspaces + `changesets`:

  1. Разработчик создаёт changeset при изменениях.
  2. GitHub Action при push на main: run tests, build, run `changesets/action` → publish updated packages to npm using `NODE_AUTH_TOKEN` secret.
* Каждый пакет имеет собственный `name` и `version`, но publish координируется через changesets.
* Договориться о namespace: `@mova/sdk`, `@mova/server-lsp`, `@mova/client-vscode`, `@mova/schemas`, `@mova/cli`.
* `package.json` каждого пакета — `publishConfig.access = "public"`.

---

# 13. CI / GitHub Actions (outline)

Workflows:

1. `ci.yml`:

   * triggers: push/pr to main.
   * steps: checkout, cache node modules, install (npm ci), build (root `npm run build`), test (`npm run test`), lint.
2. `publish.yml`:

   * triggers: on tag or merge to main with changesets.
   * steps: checkout, setup node, install, build, changesets publish (uses `NODE_AUTH_TOKEN` from secrets).

Security: run `npm audit` in CI and fail on high severity by default (configurable).

---

# 14. Testing & Quality

* Unit tests: for SDK functions (AJV mapping, suggestions, idempotency generator).
* Integration tests:

  * LSP integration test using `vscode-test` (start vscode with the extension and run sample workspace).
  * JSON files set (valid/invalid) to assert diagnostics and completion.
* Performance tests: validate workspace with 1000 sample files; measure time and memory.
* Code coverage: report via nyc/coverage; keep >80% for SDK core.

---

# 15. Документация

* README в корне + per-package README.
* SDK API docs (typedoc) auto-published to GitHub Pages.
* Quickstart: how to run server locally, connect vscode client, use CLI.
* Schema changelog (automatically generated by changesets).
* Migration notes: schema version gate (e.g., accept only mova_version 3.3.x/3.4.x).

---

# 16. Acceptance criteria / Критерии приёмки

MVP must pass all items:

1. `@mova/sdk` published to npm with documented API and tests passing.
2. `@mova/schemas` published with envelope schema, consumable by SDK.
3. `@mova/server-lsp` starts, connects via LSP to a client and:

   * on open of an `envelope.json` shows diagnostics from AJV mapped to file ranges.
   * provides completions for verbs/nouns from registry.
   * supports hover descriptions for top-level fields.
   * exposes `mova.runPlanDry` command that returns a structured “dry run” response.
4. CLI `mova validate file` returns the same diagnostics as server for the file.
5. CI builds, tests, and publishes packages automatically given `NODE_AUTH_TOKEN`.
6. Performance: full workspace validation < 2s for 100 small files; scale target to 1000 files documented and profiling included.

---

# 17. Риски и их смягчение

* **Позиция ошибок (error→range)**: AJV не даёт позиции → используем `jsonc-parser` + mapping from instancePath → location. Добавить utility в SDK; покрыть тестами.
* **Large workspace perf**: кеширование AST + incremental validation; тестировать на CI.
* **Schema drift**: enforce schema sync in CI; include `schema:verify` step that compares published schema and local copy.
* **Node ESM pitfalls**: убедиться, что всё `type: "module"`, тесты запускаются с `node --loader ts-node/esm` или использовать prebuild step.

---

# 18. План-микро-milestones (MVP)

* Sprint 0 (setup): repo skeleton, workspaces, basic build pipeline.
* Sprint 1 (sdk + schemas): implement SDK core, publish schemas, unit tests.
* Sprint 2 (server skeleton): basic LSP — diagnostics + completions (registry) + hover.
* Sprint 3 (cli + client): CLI commands + small vscode client starter.
* Sprint 4 (polish): code actions, quick fixes, tests, CI publish.
* Sprint 5 (perf/security): profiling, add telemetry opt-in, release.

---

# 19. Deliverables

* Mono-repo with packages listed выше.
* Published packages in npm under agreed namespace.
* GitHub Actions configured for CI/publish.
* Docs: README, API docs, Quickstart.
* Test suites & benchmark reports.
* Acceptance test results (checklist passed).

---

# 20. Checklist для разработки (кратко)

* [ ] Инициализация repo + workspaces.
* [ ] Schema package + AJV schemas.
* [ ] SDK API + unit tests.
* [ ] Server skeleton (diagnostics pipeline) + integration tests.
* [ ] Completion + hover + code actions.
* [ ] CLI.
* [ ] Client vscode starter.
* [ ] CI build/test + lint.
* [ ] changesets publish flow + npm token secret.
* [ ] Docs & examples.
* [ ] Performance tests & profiling.
* [ ] Security review (secret handling, telemetry opt-in).

---

Отлично — интегрируем GCP в ТЗ. Ниже — обновлённое, практическое Technical Design / Deployment Plan, где вся «npm-периметрика» остаётся (вы публикуете SDK/LSP/CLI в npm), а серверная и workflow-части (валидация, schema sync, runner/dry-run, webhooks, job-orchestration) разворачиваются на Google Cloud. Я дал конкретные рекомендации по сервисам, безопасности, CI/CD и привёл готовые примеры артефактов: Dockerfile для Cloud Run, пример Cloud Function (TypeScript ESM) для `validate`, и пример GitHub Actions workflow, который публикует в npm и деплоит в GCP.

Ниже — всё по пунктам.

# Ключевая идея

* **Код и API** (SDK, LSP server, CLI, schemas) публикуются в **npm** (ESM, TypeScript).
* **Сервисы** (валидатор, schema store, dry-run, webhooks, sync tasks, orchestrator) — располагаются в **Google Cloud**: Cloud Run (long-lived / WebSocket / heavier), Cloud Functions (light, event HTTP), Cloud Workflows / Cloud Tasks / Pub/Sub для orchestration.
* **Edge Webhook Proxy** (если нужен) остаётся на Cloudflare Workers; он форвардит запросы в GCP (аутентифицировано).
* CI/CD — GitHub Actions (build/test/npm publish) + deployment в GCP (gcloud / Cloud Build). Образы контейнеров — в **Artifact Registry**; npm — в публичный npm (как вы просили).

# Какие пакеты/функции на какие GCP-сервисы

1. **@mova/schemas (npm)**

   * Публикация в npm (single source of truth).
   * Дополнительно: зеркалить копию в **Cloud Storage** (bucket `mova-schemas`) для быстрого fetch из Cloud Run/Functions.

2. **@mova/sdk (npm)**

   * ESM npm пакет. Используется локально (client) и в облаке (Cloud Functions / Cloud Run) для валидации, mapping AJV→diagnostics, генерации idempotency etc.

3. **@mova/server-lsp (npm)**

   * Сохраняется в npm для локального LSP.
   * *Опция удалённого LSP:* разворачивать server-lsp как сервис на **Cloud Run** и соединять с VS Code через websocket (via thin client-extension). (См. раздел «Remote LSP — риски/замечания».)

4. **Validate endpoint — Cloud Function (HTTP)**

   * Лёгкий, статeless: принимает JSON/YAML, использует `@mova/sdk` для валидации и возвращает diagnostics. Хорош для quick checks, pre-commit hooks, webhooks.

5. **Schema sync / registry — Cloud Run + Cloud Storage**

   * Endpoint для pull/publish схем; CI может пушить в Cloud Storage; Cloud Run service делает caching, versioning, и serves lexicon.json.

6. **Dry-run / Runner API — Cloud Run**

   * Более тяжёлые операции (симуляция/интеграция), может запускать sandboxed execution, имеет more memory/CPU and concurrency control. Connects to executor components, optionally to Cloud Tasks for background jobs.

7. **Orchestration**

   * **Cloud Workflows** для stepwise flows (e.g., validate → enrich → store → publish).
   * **Pub/Sub** for event bus (webhook events → flows); **Cloud Tasks** for retries/delayed work and idempotency.

8. **Auth & Secrets**

   * **Secret Manager** for service tokens (npm token for CI, executor tokens, webhook HMAC secrets).
   * **IAM service accounts**: least privilege roles for Cloud Run, Functions, Cloud Build.

9. **Observability**

   * Cloud Logging, Cloud Monitoring (Uptime checks, SLO), Error Reporting. Export traces to Cloud Trace and/or external APM if needed.

10. **Edge / Webhook Proxy**

* Cloudflare Workers → forward to GCP endpoints. Use mutual auth (JWT signed by worker service account) or HMAC + rate limit.

# Архитектурный рисунок (словами)

Client (VS Code + local extension) ↔ (WS / Secure HTTP) ↔ Cloud Run LSP (optional)
Client / CI / Webhook Proxy → Cloud Functions (validate, schema:fetch)
Cloud Functions / Cloud Run → Pub/Sub → Workflows / Cloud Tasks → Cloud Run workers
Artifacts: npm packages (SDK/LSP), Docker images (Artifact Registry), schema store (GCS), secrets (Secret Manager)

# Важные замечания по Remote LSP

* LSP по сети возможно, но: это усложняет авторизацию, нужно low-latency соединение (WebSocket) и поддержка reconnection. Обычно LSP запускают локально в extension (лучше UX).
* Рекомендация: делать **гибрид**:

  * LSP logic + heavy features (schema registry, suggestions) stay in SDK and server code in npm; local extension runs LSP locally and queries cloud *only* for heavy ops (schema sync, index search, remote completions, dry run).
  * Если нужен полностью remote LSP (multi-user), deploy server-lsp to Cloud Run with WebSocket endpoint and build the client to connect to it — но учитывайте latency & cost.

# Безопасность и аутентификация

* Все HTTP endpoints в GCP защищены: require bearer token (service account JWT) or API key stored in Secret Manager.
* Cloudflare Workers добавляет signature header (signed JWT with worker’s key) when forwarding.
* Use **IAM service accounts** with minimal roles: Cloud Run only needs access to read schemas from GCS and to Pub/Sub publish (if needed).
* For npm publish in CI: keep `NODE_AUTH_TOKEN` in GitHub Secrets; for deploy to GCP use `GCP_SA_KEY` or `gcloud` OIDC (recommended).

# Cost / scaling notes

* Cloud Functions = cheap for short requests; Cloud Run = better for moderate sustained traffic & WebSocket.
* Set concurrency, CPU/Memory, and autoscale settings for Cloud Run. Use Cloud Tasks/Workflows for background work to avoid long Cloud Run times.

# CI/CD — предложение (GitHub Actions + gcloud)

* **Pipeline tasks**:

  1. Lint / test / build packages (npm workspaces).
  2. Publish npm packages (changesets → npm).
  3. Build Docker images (`packages/server-lsp`, `packages/runner`) → push to Artifact Registry.
  4. Deploy to Cloud Run (or Cloud Functions) using `gcloud run deploy` or `gcloud functions deploy`.
  5. After deploy — run smoke tests (call validate endpoint with sample file).
* Use GitHub Actions with `google-github-actions/auth` and OIDC to avoid storing long-lived keys.

---

# Конкретные артефакты (готовые примеры)

## 1) Dockerfile для Cloud Run (ESM + tsup build)

```dockerfile
# packages/server-lsp/Dockerfile
FROM node:18-bullseye-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/server-lsp/package.json ./packages/server-lsp/
# install deps at repo root if monorepo; for simplicity assume single package
RUN npm ci --production=false
COPY . .
RUN npm run -w packages/server-lsp build

FROM node:18-bullseye-slim
WORKDIR /app
ENV NODE_ENV=production
# copy built package
COPY --from=builder /app/packages/server-lsp/dist ./dist
COPY --from=builder /app/packages/server-lsp/package.json ./package.json
# install production deps only
RUN npm ci --production
EXPOSE 8080
CMD ["node", "--enable-source-maps", "dist/server.js"]
```

> Примечание: в монорепо нюансы npm workspaces — возможно собирать артефакт через root build, затем копировать нужные dist-артефакты в контейнер.

---

## 2) Cloud Function (TypeScript ESM) — `validate` endpoint

`packages/cloud-functions/validate/src/index.ts`

```ts
import {Request, Response} from 'express';
import express from 'express';
import {validateDocument} from '@mova/sdk'; // ESM import; build prior

const app = express();
app.use(express.json({limit: '1mb'}));

app.post('/', async (req: Request, res: Response) => {
  const payload = req.body;
  try {
    // payload: { text?: string, file?: string, format?: 'json'|'yaml' }
    const text = payload.text ?? JSON.stringify(payload.file ?? {});
    const result = await validateDocument(text);
    // result: { ok, diagnostics }
    res.json(result);
  } catch (err) {
    console.error('validate error', err);
    res.status(500).json({ error: String(err) });
  }
});

export default app;
```

* Сборка: `tsup` → скомпилировать `dist/index.js` и деплоить как function (HTTP).
* Для Cloud Functions (2nd gen) можно деплоить контейнер (preferred).

---

## 3) Пример GitHub Actions (sketch) — build → publish npm → deploy Cloud Run

`.github/workflows/ci-deploy.yml`

```yaml
name: CI & Deploy

on:
  push:
    branches: [ main ]

jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'
      - name: Install deps
        run: npm ci
      - name: Build all
        run: npm run build
      - name: Run tests
        run: npm run test

  publish-npm:
    needs: build-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          registry-url: https://registry.npmjs.org
      - name: Publish packages (changesets)
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: |
          npm run changeset publish

  deploy-gcp:
    needs: publish-npm
    runs-on: ubuntu-latest
    permissions:
      contents: 'read'
    steps:
      - uses: actions/checkout@v4
      - name: Authenticate to GCP
        uses: google-github-actions/auth@v1
        with:
          workload_identity_provider: projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL/providers/PROVIDER
          service_account: svc-deployer@PROJECT_ID.iam.gserviceaccount.com
      - name: Configure gcloud
        uses: google-github-actions/setup-gcloud@v1
        with:
          project_id: ${{ env.GCP_PROJECT }}
          install_components: 'gke-gcloud-auth-plugin'
      - name: Build & Push image
        run: |
          docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/mova/server-lsp:latest -f packages/server-lsp/Dockerfile .
          docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/mova/server-lsp:latest
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy mova-server-lsp \
            --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/mova/server-lsp:latest \
            --region ${REGION} \
            --allow-unauthenticated=false \
            --platform managed \
            --memory 512Mi \
            --concurrency 10
```

> В примере рекомендуется использовать Workload Identity (OIDC) для безопасности.

---

# Конфигурации / параметры запуска (рекомендации)

* **Cloud Run**: CPU 1, Memory 512Mi, concurrency 10 (tune), minInstances 0/1 depending on cold start policy.
* **Cloud Functions** (HTTP): memory 256–512Mi.
* **Timeouts**: validate — short (30s), dry-run — up to 5m (or use Cloud Tasks).
* **Autoscaling**: use requests/sec SLO, add concurrency tuning to avoid CPU contention.

# Operational playbook (инцидент/rollback)

* Blue/green deploys for Cloud Run with traffic splitting.
* Quick rollback: `gcloud run services update-traffic --to-revisions ...` or redeploy previous image.
* Health checks: add /health endpoint for readiness; Cloud Run uses container health checks via readiness probes (via HTTP path).

# Migration / dev workflow (recommended)

* Local dev: run LSP locally via `npm run start:server-lsp` (local node).
* Cloud dev: deploy to a dev project; configure extension to use `mova.lsp.remoteEndpoint` pointing to dev Cloud Run for heavy ops.
* Schema changes: bump via changesets → publish to npm and sync to GCS via `schema:sync` CI step.

# Риски и компромиссы (быстро)

* Remote LSP introduces latency & auth complexity — recommend hybrid approach.
* Cold starts (Cloud Run/Functions) — mitigate with minInstances or use Cloud Run with warm instances for critical low-latency endpoints.
* Cost vs UX tradeoff: remote features cost money; keep local LSP core to minimize cloud calls.

Отлично — делаю максимально просто и по-полочкам, так чтобы всё было понятно «как ребёнку». Ниже — полная декомпозиция проекта: **что** это, **зачем**, и **как** собрать и запустить каждую часть. Я разбил всё на маленькие шаги, указал конкретные команды и файлы, которые нужно создать, и дал компактные чеклисты для каждой части. Поехали.

# 1. Коротко одной фразой

Мы строим набор программ: часть — в виде библиотек и инструментов, которые публикуются в npm (это общий магазин кода), а часть — это серверные функции, которые запускаются в Google Cloud (это место, где код работает в интернете). VS Code — наш рабочий инструмент, куда можно добавить расширение, чтобы удобно редактировать и запускать планы MOVA.

# 2. Простые роли (аналогии)

* **npm-пакеты** — как набор инструментов в ящике с надписью «MOVA»: SDK, схемы, сервер LSP, CLI. Их можно ставить в любой проект (npm install).
* **Cloud Functions / Cloud Run** — это кухонные плиты в облаке: туда ставим код, и он готовит ответ на запросы (например: «проверь этот JSON»).
* **VS Code extension / LSP** — это помощник в редакторе: показывает ошибки, подсказки и даёт кнопки «Validate» / «Run dry».
* **CI (GitHub Actions)** — это робот-кулинар, который автоматически собирает, тестирует и выкладывает наши пакеты и контейнеры в магазин и облако.
* **Secret Manager, IAM** — это сейфы и ключи: кто может что включать на кухне.

# 3. Главные части проекта (список, простыми словами)

1. **schemas** — набор правил (форм) для JSON, которые объясняют, как выглядит правильный «конверт» (envelope).
   — Зачем: чтобы понимать, что правильно, а что нет.
2. **sdk** — библиотека, которая проверяет JSON по правилам, переводит ошибки в понятные строки и даёт вспомогательные функции (сгенерировать idempotency_key и т.д.).
   — Зачем: чтобы не писать валидатор в каждом месте заново.
3. **server-lsp** — сервер языка (Language Server). Он даёт VS Code подсказки, ошибки и автодополнение.
   — Зачем: чтобы в редакторе было удобно писать планы MOVA.
4. **client-vscode** — тонкий «переходник» для VS Code: запускает server-lsp локально и регистрирует команды (Validate, Run).
   — Зачем: простая интеграция с редактором.
5. **cli** — командная утилита в терминале (mova validate file.json).
   — Зачем: запускать проверки из терминала или CI.
6. **cloud-functions / cloud-run services** — облачные эндпоинты: validate, schema sync, dry-run.
   — Зачем: чтобы можно было вызывать проверку и сухой запуск через интернет (например, из CI или из webhook proxy).
7. **CI (GitHub Actions)** — автоматизация: собирает, тестирует, публикует, деплоит.
   — Зачем: чтобы не делать всё вручную.

# 4. Что происходит, когда кто-то отправляет файл на проверку

1. Вы нажали «Validate» в VS Code или вызвали `mova validate file.json` в терминале.
2. Код (либо локальный при помощи `sdk`, либо облачный через `validate` endpoint) загружает схему (schemas) и проверяет файл.
3. Если есть ошибки, они возвращаются в виде списка с указанием строки/столбца. VS Code подсвечивает ошибки.
4. Если всё ок — сообщение «OK».

# 5. Детально: каждый элемент — что делать и почему (пошагово)

---

## A. schemas — правила (где хранить и как создать)

**Что это:** JSON Schema файлы (например `envelope.3.4.schema.json`).
**Для чего:** объясняют, какие поля обязательны, какие типы данных, что допустимо.
**Как сделать (шаги):**

1. Создать папку `packages/schemas`.
2. Положить туда файлы схем: `envelope.3.4.schema.json`.
3. В `package.json` этого пакета: `name: "@mova/schemas"`, `type: "module"`.
4. Опубликовать в npm командой (после настройки): `npm publish --access public` (робот CI сделает это для вас позже).

**Файлы минимум:**

* `packages/schemas/package.json`
* `packages/schemas/envelope.3.4.schema.json`

**Чеклист:**

* [ ] schema лежит в `packages/schemas`
* [ ] schema проходит `ajv` локально (проверить скриптом)

---

## B. sdk — библиотека валидатора + утилиты

**Что это:** набор функций: `validateDocument(text)`, `mapErrorsToDiagnostics`, `generateIdempotencyKey` и т.д.
**Для чего:** чтобы centralize (собирать воедино) логику проверки и подсказок. Другие части (сервер, cloud functions, CLI) просто вызывают SDK.
**Как сделать (шаги):**

1. Создать `packages/sdk`.
2. Установить зависимости: `npm i ajv jsonc-parser` внутри монорепо.
3. Написать `src/index.ts` с функцией `validateDocument(text)`:

   * парсит JSON (или JSONC),
   * вызывает AJV с схемой из `@mova/schemas`,
   * возвращает `{ ok: boolean, errors: [...] }` и также diagnostics с диапазонами (line/col).
4. Собрать пакет через `tsup` или `tsc` (в итоге получим `dist/index.js`).
5. Добавить тесты (unit tests) — простые файлы с валидным и невалидным JSON.

**Пример использования (терминал / другой код):**

```js
import { validateDocument } from '@mova/sdk';
const res = await validateDocument('{ "mova_version": "3.4" }');
console.log(res.ok, res.errors);
```

**Чеклист:**

* [ ] validateDocument возвращает позиции ошибок
* [ ] SDK экспортирован в npm (`package.json` с `"exports"`)

---

## C. server-lsp — Language Server (то, что дает подсказки в VS Code)

**Что это:** сервер по стандарту LSP: получает текст документа и отвечает подсказками, ошибками, автодополнениями.
**Для чего:** чтобы в VS Code работать как в IDE: ошибки подчеркиваются, при наведении — объяснения, при наборе — автодополнение verb/noun.
**Как сделать (шаги):**

1. Создать `packages/server-lsp`.
2. Установить `vscode-languageserver` и подключить `@mova/sdk`.
3. В `src/server.ts`:

   * Создаём LSP соединение `createConnection(...)`.
   * Подписываемся на `onDidChangeContent` — при изменении текста вызываем `sdk.validateDocument` и отправляем diagnostics (ошибки) клиенту.
   * Реализовать `onCompletion` — возвращать список потенциальных слов (verbs/nouns) из registry.
   * Реализовать `onHover` — возвращать описание поля.
4. Собрать и протестировать локально (запустить сервер и подключить через клиент VS Code).

**Почему важен mapping ошибок → позиции:** AJV даёт путь ошибки (например `/plan/steps/1/verb`), но не даёт строку. Используйте `jsonc-parser` чтобы найти строку и столбец.

**Чеклист:**

* [ ] diagnostics приходят в VS Code и показывают правильные строки
* [ ] completion предлагает verbs/nouns
* [ ] hover показывает краткое описание поля

---

## D. client-vscode — расширение VS Code

**Что это:** файл расширения, который запускает server-lsp (локально) и добавляет команды в палитру: Validate, Run Dry.
**Для чего:** пользователю удобнее работать прямо в редакторе.
**Как сделать (шаги):**

1. В `packages/client-vscode` выполнить `yo code` (шаблон) или создать вручную `package.json` и `src/extension.ts`.
2. В `extension.ts` — стартовать `LanguageClient` и зарегистрировать команды:

   * `mova.validate` — вызывает сервер, или локально `@mova/sdk`.
   * `mova.runDry` — отправляет содержимое файла на Cloud Function `dry-run` или локальный runner.
3. Настроить file-associations: `.mova`, `envelope.json`.

**Чеклист:**

* [ ] расширение запускает LSP
* [ ] команды доступны в Command Palette (Ctrl+Shift+P)

---

## E. cli — утилита в терминале

**Что это:** команда `mova` с подкомандами: `validate`, `schema:sync`, `run --dry`.
**Для чего:** запускать проверки в CI или вручную без VS Code.
**Как сделать (шаги):**

1. Создать `packages/cli`.
2. Использовать `commander` или `cac` для парсинга аргументов.
3. Команда `validate file.json` вызывает `@mova/sdk.validateDocument` и печатает результат.
4. В `package.json` добавить `bin` запись, чтобы команда была доступна после установки.

**Пример:**

```bash
npx @mova/cli validate ./examples/booking.envelope.json
```

**Чеклист:**

* [ ] `mova validate` возвращает код ошибки (0 — OK, 1 — ошибки)
* [ ] вывод понятный: строка, столбец, сообщение

---

## F. cloud-functions / cloud-run — облачные части (GCP)

Мы разделяем на простые (Cloud Functions) и более тяжёлые (Cloud Run).

### F1. Cloud Function: validate

**Что это:** маленькая функция, которая принимает JSON и возвращает diagnostics.
**Для чего:** чтобы внешние системы (CI, webhook proxy) могли проверить файл через HTTP.
**Как сделать (шаги):**

1. Создать `packages/cloud/validate`.
2. Код:

   * Принимает POST с телом `{ text: "<json or yaml>" }`.
   * Вызывает `@mova/sdk.validateDocument(text)`.
   * Возвращает JSON с `ok` и `errors`.
3. Деплой:

   * Сборка `npm run build`.
   * Деплой через `gcloud functions deploy mova-validate --runtime nodejs18 --trigger-http --allow-unauthenticated` (или через контейнер на Cloud Run).

**Чеклист:**

* [ ] endpoint отвечает за 200/500 и возвращает JSON с diagnostics
* [ ] endpoint защищён (токен/ключ) для продакшена

### F2. Cloud Run: dry-run / runner

**Что это:** сервис, который выполняет «сухой запуск» плана (симуляция). Требует больше ресурсов.
**Для чего:** если нужно симулировать шаги и видеть, что произойдёт.
**Как сделать (шаги):**

1. Создать `packages/cloud/runner`.
2. Код принимает план, выполняет проверку и возвращает лог симуляции.
3. Собрать образ Docker и задеплоить в Cloud Run:

   * `docker build -t gcr.io/PROJECT/mova-runner:latest .`
   * `gcloud run deploy mova-runner --image gcr.io/PROJECT/mova-runner:latest --region europe-west1`

**Чеклист:**

* [ ] dry-run возвращает понятный лог
* [ ] timeout настроен (например 3–5 минут)

---

## G. CI — GitHub Actions (автоматизация)

**Что это:** скрипты, которые автоматически собирают, тестируют и публикуют.
**Для чего:** не делать всё вручную.
**Как сделать (шаги, простая версия):**

1. Файл `.github/workflows/ci.yml` содержит шаги:

   * checkout
   * setup node
   * npm ci
   * npm run build (на весь монорепо)
   * npm test
2. Второй workflow `publish.yml` запускается по тегу или после merge в main:

   * build
   * changesets publish → публикует в npm (нужен `NPM_TOKEN` в Secrets)
   * docker build & push → deploy to Cloud Run (нужен доступ к GCP; используем OIDC или сервисный аккаунт)

**Чеклист:**

* [ ] CI запускает тесты и билдит пакеты
* [ ] Публикация npm автоматизирована и использует секреты

---

## H. Безопасность — простыми словами

* Секреты (ключи) хранятся в **Secret Manager** или в GitHub Secrets — никто в репозитории их не видит.
* Сервисы получают минимальные права: только то, что нужно (чтобы читать схемы, публиковать в Pub/Sub и т.д.).
* Для публичных эндпоинтов ставим проверку токена в заголовке `Authorization: Bearer <token>`.

---

# 6. Конкретные команды «что ввести» — быстрый набор

(предположение: у вас установлен Node.js >=18 и npm)

Создаем монорепо и packages:

```bash
mkdir mova-lsp-monorepo
cd mova-lsp-monorepo
npm init -y
# включаем workspaces в package.json: "workspaces": ["packages/*"]
mkdir -p packages/schemas packages/sdk packages/server-lsp packages/client-vscode packages/cli packages/cloud/validate packages/cloud/runner
```

Установка общих dev-зависимостей:

```bash
npm i -D typescript tsup eslint mocha
```

Пример установки для sdk:

```bash
cd packages/sdk
npm init -y
npm i ajv jsonc-parser
# создать src/index.ts и написать validateDocument
```

Сборка пакетов (в корне):

```bash
npm run build   # зависит от scripts в root package.json, обычно прописываем: "build": "npm -w packages/sdk run build && npm -w packages/server-lsp run build ..."
```

Деплой Cloud Function (локально собранный пакет):

```bash
# собрать функцию в папке packages/cloud/validate
gcloud functions deploy mova-validate --runtime nodejs18 --trigger-http --allow-unauthenticated --region europe-west1
```

Публикация npm (локально тестово):

```bash
# если у вас есть npm token
npm publish --access public   # внутри каждой папки, или используйте changesets для многопакетной публикации
```

Запуск локального LSP для теста (терминал):

```bash
# в server-lsp
node dist/server.js
# в client-vscode extension подключаете local server (в настройках extension)
```

# 7. Мини-плана работ (пошагово, 10 задач, как ребёнку)

1. Создать папки `packages/*` (см. выше).
2. Положить базовую schema `envelope.3.4.schema.json` в `packages/schemas`.
3. Написать SDK: `validateDocument` + тесты (2 простых файла).
4. Написать CLI: `mova validate file.json` (вызывает SDK).
5. Написать Cloud Function validate (вызов SDK) и задеплоить в тестовый GCP проект.
6. Написать server-lsp: diagnostics + completion (очень базовые).
7. Написать client-vscode: запускает server-lsp локально и регистрирует команды.
8. Настроить GitHub Actions: тесты и build.
9. Добавить publishing: `NPM_TOKEN` в secrets → publish packages.
10. Подключить в VS Code: установить extension (локально) и проверить flow: редактирование → подсветка ошибок → Validate → OK.

// packages/server-lsp/src/server.ts
// Language Server skeleton (ESM + TypeScript)
// - LSP: diagnostics pipeline (AJV via @mova/sdk)
// - maps AJV instancePath -> text ranges using jsonc-parser parseTree/findNodeAtLocation
// - basic completion and hover (delegates to @mova/sdk when available)
// - exposes command "mova.runPlanDry" which delegates to remote runner (configurable)
//
// Usage (dev):
//  - build this package (tsup/tsc) and run node dist/server.js
//  - client (VS Code extension) should spawn this server (stdio or socket)
//  - workspace settings (optional):
//      mova.lsp.executorEndpoint - HTTP URL for dry-run
//      mova.lsp.schemaPath - local path or URL for schema sync (optional)

import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  CompletionItem,
  CompletionItemKind,
  Hover,
  InitializeParams,
  InitializeResult,
  TextDocumentPositionParams,
  Range,
  Position,
  DidChangeConfigurationNotification,
  WorkspaceFolder,
  TextDocumentSyncKind,
  ExecuteCommandParams,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { parseTree, findNodeAtLocation, Node as JsonNode } from 'jsonc-parser';

// Import your SDK — expected to be ESM (replace with actual package name if different)
import * as movaSdk from '@mova/sdk';

// --- Create connection and documents manager ---
const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Simple in-memory settings cache
interface ServerSettings {
  executorEndpoint?: string;
  schemaPath?: string;
  maxDiagnostics?: number;
}
let globalSettings: ServerSettings = {
  maxDiagnostics: 200,
};

// Per-document settings cache (optional)
const documentSettings = new Map<string, Thenable<ServerSettings>>();

// When the server receives initialize request
connection.onInitialize((params: InitializeParams): InitializeResult => {
  connection.console.log('MOVA LSP: initializing');

  // Optionally load lexicon/registry from SDK (if SDK exposes loader)
  try {
    if (typeof movaSdk.loadSchemas === 'function') {
      // best-effort: if SDK exposes schema loader, call it (may fetch embedded schemas)
      void movaSdk.loadSchemas().catch((e: any) =>
        connection.console.warn('movaSdk.loadSchemas() warning:', String(e))
      );
    }
  } catch (e) {
    connection.console.warn('Error calling movaSdk.loadSchemas', String(e));
  }

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: ['"', "'", '/', '.', ':'], // basic triggers; adjust as needed
      },
      hoverProvider: true,
      executeCommandProvider: {
        commands: ['mova.runPlanDry'],
      },
      // add workspace/symbol, rename, codeAction as needed later
    },
  };

  return result;
});

// Called when client is ready
connection.onInitialized(() => {
  connection.console.log('MOVA LSP: initialized');
  // Register for configuration change notifications
  connection.client.register(DidChangeConfigurationNotification.type, undefined);
});

// --- Helpers: text position utilities ---

function offsetToPosition(text: string, offset: number): Position {
  // compute line/character from offset (simple, efficient)
  // Note: Node.js substring operations are fine for moderate file sizes.
  const lines = text.slice(0, offset).split(/\r\n|\n/);
  const line = lines.length - 1;
  const character = lines[lines.length - 1].length;
  return Position.create(line, character);
}

function nodeToRange(node: JsonNode, text: string): Range {
  const start = offsetToPosition(text, node.offset);
  const end = offsetToPosition(text, node.offset + node.length);
  return Range.create(start, end);
}

function instancePathToPathArray(instancePath: string): Array<string | number> {
  // AJV instancePath looks like: "/plan/steps/1/verb"
  if (!instancePath) return [];
  // remove leading slash then split
  const parts = instancePath.replace(/^\//, '').split('/');
  return parts.map((p) => {
    // if numeric -> convert to number for findNodeAtLocation
    if (/^\d+$/.test(p)) return Number(p);
    // unescape ~1 and ~0 per JSON Pointer spec if needed
    return p.replace(/~1/g, '/').replace(/~0/g, '~');
  });
}

// --- Diagnostics pipeline ---

async function validateAndSendDiagnostics(text: string, uri: string): Promise<void> {
  // validateDocument is expected to return structure with errors and/or diagnostics
  // SDK should return diagnostics with messages + instancePaths OR AJV errors
  try {
    const res = await movaSdk.validateDocument(text, uri);
    const diagnostics: Diagnostic[] = [];

    if (res && Array.isArray(res.diagnostics) && res.diagnostics.length > 0) {
      // If SDK already returned diagnostics with ranges, map them directly
      for (const d of res.diagnostics) {
        if (d.range) {
          diagnostics.push({
            message: d.message ?? 'validation error',
            severity: (d.severity === 'warning' ? DiagnosticSeverity.Warning : DiagnosticSeverity.Error),
            range: d.range as Range,
            source: 'mova-ajv',
          });
        } else if (d.instancePath) {
          // map instancePath -> range with jsonc-parser
          const docParse = parseTree(text);
          const path = instancePathToPathArray(d.instancePath);
          const node = docParse ? findNodeAtLocation(docParse, path) : undefined;
          const range = node ? nodeToRange(node, text) : Range.create(Position.create(0, 0), Position.create(0, 1));
          diagnostics.push({
            message: (d.message ?? `${d.instancePath} ${d.keyword ?? ''}`).trim(),
            severity: (d.severity === 'warning' ? DiagnosticSeverity.Warning : DiagnosticSeverity.Error),
            range,
            source: 'mova-ajv',
          });
        } else {
          // fallback: entire document
          diagnostics.push({
            message: d.message ?? 'validation error',
            severity: DiagnosticSeverity.Error,
            range: Range.create(Position.create(0, 0), Position.create(0, 1)),
            source: 'mova-ajv',
          });
        }
      }
    } else if (res && Array.isArray(res.errors) && res.errors.length > 0) {
      // If SDK returned raw AJV errors, map them
      const parse = parseTree(text);
      for (const err of res.errors) {
        const instancePath: string = err.instancePath ?? err.dataPath ?? '';
        const path = instancePathToPathArray(instancePath);
        const node = parse ? findNodeAtLocation(parse, path) : undefined;
        const range = node ? nodeToRange(node, text) : Range.create(Position.create(0, 0), Position.create(0, 1));
        const message = `${err.message ?? 'validation error'}${err.keyword ? ` (${err.keyword})` : ''}`;
        diagnostics.push({
          message,
          severity: DiagnosticSeverity.Error,
          range,
          source: 'mova-ajv',
        });
      }
    } else {
      // no errors
    }

    // cap diagnostics
    const maxD = globalSettings.maxDiagnostics ?? 200;
    connection.sendDiagnostics({ uri, diagnostics: diagnostics.slice(0, maxD) });
  } catch (err: any) {
    // In case of internal server error while validating, push a single diagnostic at top
    connection.window.showErrorMessage(`MOVA LSP validate error: ${String(err)}`);
    connection.console.error('validateAndSendDiagnostics error', String(err));
    const diag: Diagnostic = {
      message: `Internal validator error: ${String(err)}`,
      severity: DiagnosticSeverity.Error,
      range: Range.create(Position.create(0, 0), Position.create(0, 1)),
      source: 'mova-internal',
    };
    connection.sendDiagnostics({ uri, diagnostics: [diag] });
  }
}

// --- Document change handlers ---

documents.onDidChangeContent((change) => {
  const text = change.document.getText();
  validateAndSendDiagnostics(text, change.document.uri);
});

documents.onDidClose((e) => {
  // clear diagnostics on close
  connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
});

// --- Completion handler (delegates to SDK when possible) ---
connection.onCompletion(async (params: TextDocumentPositionParams): Promise<CompletionItem[]> => {
  try {
    // Attempt to delegate to SDK's suggestion function (if exists)
    if (typeof movaSdk.suggestCompletions === 'function') {
      try {
        const doc = documents.get(params.textDocument.uri);
        const text = doc?.getText() ?? '';
        const ctx = {
          text,
          uri: params.textDocument.uri,
          position: params.position,
        };
        const items = await movaSdk.suggestCompletions(ctx);
        if (Array.isArray(items)) return items;
      } catch (e) {
        connection.console.warn('movaSdk.suggestCompletions failed:', String(e));
      }
    }

    // Fallback: return a small set of helpful verbs/nouns (you can extend from registry)
    const fallback: CompletionItem[] = [
      { label: 'http_fetch', kind: CompletionItemKind.Function, detail: 'action: http_fetch' },
      { label: 'set', kind: CompletionItemKind.Function, detail: 'action: set variable' },
      { label: 'assert', kind: CompletionItemKind.Function, detail: 'action: assert condition' },
      { label: 'emit_event', kind: CompletionItemKind.Function, detail: 'action: emit event' },
      { label: 'book_by_time', kind: CompletionItemKind.Snippet, detail: 'booking helper' },
    ];
    return fallback;
  } catch (err) {
    connection.console.error('onCompletion error', String(err));
    return [];
  }
});

// --- Hover handler (delegates to SDK or provides short help) ---
connection.onHover(async (params: TextDocumentPositionParams): Promise<Hover | null> => {
  try {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return null;
    const text = doc.getText();
    // Try to find the JSON path at the offset using jsonc-parser
    const offset = positionToOffset(text, params.position);
    const tree = parseTree(text);
    if (!tree) return null;

    // Walk up to find a node covering offset, and construct a JSON Pointer-like path
    const node = findNodeCoveringOffset(tree, offset);
    if (!node) return null;

    // Derive simple key path str like "plan.steps.1.verb" from node path
    const jsonPathArr = nodePathArray(node);
    const pathKey = jsonPathArr.join('.');

    // Prefer SDK-provided hover info if exists
    if (typeof movaSdk.getHoverInfo === 'function') {
      try {
        const info = await movaSdk.getHoverInfo(pathKey);
        if (info) {
          return { contents: { kind: 'markdown', value: info } };
        }
      } catch (e) {
        connection.console.warn('movaSdk.getHoverInfo failed:', String(e));
      }
    }

    // Fallback: simple hover with path
    return { contents: { kind: 'markdown', value: `\`${pathKey}\`` } };
  } catch (e) {
    connection.console.error('onHover error', String(e));
    return null;
  }
});

// --- Helper: position <-> offset conversions and node helpers ---

function positionToOffset(text: string, pos: Position): number {
  const lines = text.split(/\r\n|\n/);
  let offset = 0;
  for (let i = 0; i < pos.line; i++) {
    offset += lines[i].length;
    offset += 1; // newline
  }
  offset += pos.character;
  return offset;
}

function findNodeCoveringOffset(root: JsonNode | undefined, offset: number): JsonNode | undefined {
  if (!root) return undefined;
  // simple DFS to find smallest node that covers offset
  let result: JsonNode | undefined = undefined;
  const stack: JsonNode[] = [root];
  while (stack.length) {
    const n = stack.pop()!;
    if (n.offset <= offset && offset <= n.offset + n.length) {
      result = n;
      if (n.children && n.children.length) {
        for (const c of n.children) stack.push(c);
      }
    }
  }
  return result;
}

function nodePathArray(node: JsonNode): Array<string | number> {
  // climb parent links to build path. jsonc-parser Node has 'parent' property in some builds;
  // if not available, best-effort: fallback to empty
  const path: Array<string | number> = [];
  let curr: JsonNode | undefined = node;
  // @ts-ignore parent exists on Node in parseTree output
  while (curr && (curr as any).parent) {
    const parent = (curr as any).parent as JsonNode;
    if (!parent) break;
    // find index/key of curr in parent
    if (parent.type === 'array') {
      const idx = parent.children ? parent.children.indexOf(curr) : -1;
      path.unshift(idx >= 0 ? idx : '?');
    } else if (parent.type === 'object') {
      // object's children are property nodes; property node children: [keyNode, valueNode]
      // if curr is a valueNode inside property, parent of property is the object
      // the property node's children[0] is key node
      // climb until we reach property node
      // as a fallback, use '?'
      const prop = findPropertyNodeForChild(parent, curr);
      if (prop) {
        const keyNode = prop.children && prop.children[0];
        if (keyNode && keyNode.value) path.unshift(String(keyNode.value));
        else path.unshift('?');
      } else {
        path.unshift('?');
      }
    } else {
      path.unshift('?');
    }
    curr = parent;
  }
  return path;
}

function findPropertyNodeForChild(objNode: JsonNode, child: JsonNode): JsonNode | undefined {
  if (!objNode.children) return undefined;
  for (const prop of objNode.children) {
    // property node typically has children [keyNode, valueNode]
    if (!prop.children) continue;
    if (prop.children.length >= 2) {
      const val = prop.children[1];
      if (val === child || (val.offset <= child.offset && child.offset <= val.offset + val.length)) {
        return prop;
      }
    }
  }
  return undefined;
}

// --- Commands (executeCommand) ---

connection.onExecuteCommand(async (params: ExecuteCommandParams) => {
  if (params.command === 'mova.runPlanDry') {
    // expecting args: [ uri | text ]
    const args = params.arguments ?? [];
    let text: string | undefined;
    if (args.length > 0 && typeof args[0] === 'string') {
      const first = args[0] as string;
      if (first.startsWith('file://') || first.startsWith('untitled:') || first.startsWith('vscode:')) {
        const doc = documents.get(first);
        text = doc?.getText();
      } else {
        text = first;
      }
    }
    if (!text) {
      connection.window.showErrorMessage('mova.runPlanDry: no document provided');
      return;
    }

    // If SDK exposes a dryRun function, call it; otherwise call executor endpoint from settings
    try {
      if (typeof movaSdk.dryRun === 'function') {
        const result = await movaSdk.dryRun(text);
        connection.window.showInformationMessage('Dry-run finished: see output channel');
        connection.console.log('mova.dryRun result: ' + JSON.stringify(result).slice(0, 400));
      } else {
        // fallback: use executor endpoint from settings
        const endpoint = globalSettings.executorEndpoint;
        if (!endpoint) {
          connection.window.showErrorMessage('No executorEndpoint configured (mova.lsp.executorEndpoint)');
          return;
        }
        // perform HTTP POST (no fetch in Node by default older; use native fetch if available)
        // Keep this minimal — show message and attempt a fetch
        let fetchFn: any = (globalThis as any).fetch;
        if (!fetchFn) {
          // dynamic import node-fetch if available
          try {
            const nodeFetch = await import('node-fetch');
            fetchFn = nodeFetch.default;
          } catch (e) {
            connection.window.showErrorMessage('No fetch available to call executor endpoint');
            return;
          }
        }
        const resp = await fetchFn(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        const json = await resp.json();
        connection.console.log('executor response: ' + JSON.stringify(json).slice(0, 1000));
        connection.window.showInformationMessage('Dry-run posted to executor (check logs)');
      }
    } catch (e: any) {
      connection.window.showErrorMessage('mova.runPlanDry failed: ' + String(e));
      connection.console.error('mova.runPlanDry error', String(e));
    }
  }
});

// --- Settings update (optional) ---
connection.onDidChangeConfiguration((change) => {
  const settings = change.settings?.mova ?? {};
  globalSettings.executorEndpoint = settings.executorEndpoint ?? globalSettings.executorEndpoint;
  globalSettings.schemaPath = settings.schemaPath ?? globalSettings.schemaPath;
  globalSettings.maxDiagnostics = settings.maxDiagnostics ?? globalSettings.maxDiagnostics;
  // revalidate all open documents with possibly new settings
  documents.all().forEach((doc) => {
    validateAndSendDiagnostics(doc.getText(), doc.uri);
  });
});

// --- Make the text document manager listen on the connection ---
documents.listen(connection);

// Start listening
connection.listen();

// --- End of server.ts ---



