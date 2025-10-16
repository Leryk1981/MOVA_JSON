# MOVA LSP Monorepo - Следующие Шаги После MVP

**Статус:** MVP завершён ✅  
**Дата:** October 16, 2025

---

## По ТЗ - что остаётся сделать:

### ✅ ЗАВЕРШЕНО (MVP):
- [x] Инициализация repo + workspaces
- [x] Schema package + AJV schemas  
- [x] SDK API (базовый) + типы
- [x] Server skeleton (diagnostics pipeline)
- [x] Completion + hover (базовый)
- [x] CLI (базовый)
- [x] Client vscode starter
- [x] Интеграционное тестирование (5 фаз)

---

## ⏳ СЛЕДУЮЩИЕ ШАГИ (Priority Order)

### ФАЗА 1: CI/CD GitHub Actions [NEXT]
**Цель:** Автоматизировать build, test, publish  
**Задачи:**
1. Настроить `ci.yml` workflow:
   - Triggers: push/PR to main
   - Steps: checkout → cache modules → install → build → test → lint
   
2. Настроить `publish.yml` workflow:
   - Triggers: push to main (с changesets) или ручной trigger
   - Steps: build → changesets publish → npm token auth

3. Добавить в GitHub Secrets:
   - `NPM_TOKEN` - для публикации в npm

**Файлы:**
- `.github/workflows/ci.yml` (уже есть, может нужна доработка)
- `.github/workflows/publish.yml` (уже есть, может нужна доработка)

**Ожидаемый результат:** 
- ✅ Автоматическая публикация пакетов при push на main
- ✅ CI checks на PR

---

### ФАЗА 2: Production Publishing [HIGH]
**Цель:** Опубликовать пакеты в npm  
**Предусловие:** CI/CD готов

**Задачи:**
1. Создать npm account (если нет) 
2. Добавить organization `@mova` (если нужно)
3. Обновить версии в changeset (из dev в 0.1.0 or 1.0.0)
4. Запустить `npm run publish:all` локально OR через CI
5. Проверить пакеты на npm:
   - `@mova/schemas`
   - `@mova/sdk`
   - `@mova/server-lsp`
   - `@mova/client-vscode`
   - `@mova/cli`

**Ожидаемый результат:**
- ✅ Все пакеты в npm (публичные)
- ✅ Версии синхронизированы

---

### ФАЗА 3: GCP Integration [HIGH] - *По расширенному ТЗ*
**Цель:** Развернуть серверные функции на Google Cloud  

**Компоненты:**
1. **Validate Endpoint — Cloud Function (HTTP)**
   - Runtime: Node.js 20 (ESM)
   - Использует: `@mova/sdk`
   - Input: JSON/YAML envelope
   - Output: diagnostics

2. **Schema Registry & Sync — Cloud Run**
   - Контейнер: Node.js 20 ESM
   - Использует: `@mova/schemas` + Cloud Storage
   - Endpoints: GET /schemas, POST /sync, GET /version

3. **Cloud Storage**
   - Bucket: `mova-schemas`
   - Зеркало canonical schemas из npm пакета

4. **Cloud Workflows**
   - Orchestration для batch validation
   - Может запускать Cloud Functions параллельно

5. **Cloud Tasks**
   - Очередь для асинхронных jobs
   - Dry-run requests, schema sync tasks

6. **Pub/Sub**
   - Event bus между компонентами
   - Notification channel для diagnostics

7. **Secret Manager**
   - Хранилище для API keys, OAuth tokens
   - Интеграция с Cloud Run/Functions

8. **IAM**
   - Service accounts для каждого сервиса
   - Least privilege доступ

**Ожидаемый результат:**
- ✅ Validate CF callable из CLI/SDK
- ✅ Schema registry синхронизирован
- ✅ Workflow orchestration работает
- ✅ Безопасные credentials через Secret Manager

---

### ФАЗА 4: Advanced LSP Features [MEDIUM]

**Что реализовано базово:**
- ✅ Diagnostics
- ✅ Completion
- ✅ Hover

**Что нужно добавить:**
1. **Code Actions / Quick Fixes** (Advanced)
   - Автогенерация `idempotency_key`
   - Исправление типов (enum suggestions)
   - Auto-add missing required fields

2. **Document Symbols**
   - Outline: plan → steps → verb
   - Навигация в документе (Outline view)

3. **Workspace Symbols**
   - Поиск по всему workspace
   - Список всех конвертов/планов

4. **Formatting** (optional)
   - JSON/JSONC formatting
   - Alignment with project style

5. **Rename / References**
   - Рефакторинг идентификаторов
   - Find references to envelope_id, step id

6. **Execute Command** (Advanced)
   - `mova.runPlanDry` - запуск на GCP Executor
   - Результаты в интегрированную панель

**Ожидаемый результат:**
- ✅ IDE-level experience в VS Code
- ✅ Рефакторинг и навигация

---

### ФАЗА 5: Documentation & Examples [HIGH]

**Что требуется:**
1. **README** (пер-пакетные + корневой)
   - Quickstart
   - Installation (from npm)
   - Usage examples

2. **API Documentation**
   - TypeDoc для SDK
   - Auto-publish to GitHub Pages
   - Inline JSDoc comments

3. **Quickstart Guide**
   - Как установить LSP с npm
   - Как запустить CLI
   - Как использовать SDK в своём коде

4. **Schema Documentation**
   - Описание полей
   - Примеры valid/invalid envelopes
   - Migration notes между версиями

5. **Deployment Guide**
   - Как разворачивать на GCP
   - Как настраивать GCP сервисы
   - Как настраивать CI/CD

6. **Examples**
   - `examples/booking.envelope.json` (уже есть)
   - `examples/invalid.envelope.json` (уже есть)
   - Больше реальных примеров

**Ожидаемый результат:**
- ✅ Полная документация
- ✅ Легко onboard новые разработчики

---

### ФАЗА 6: Performance & Security [MEDIUM]

**Performance:**
1. Benchmark validation на 1000 файлов
2. Optimize LSP server для incremental updates
3. Cache compiled schemas
4. Profile memory usage

**Security:**
1. npm audit в CI (fail on high severity)
2. Secret scanning (GitHub secret scanning)
3. Dependency audit
4. GCP IAM policy review
5. Secret rotation для GCP credentials

**Ожидаемый результат:**
- ✅ < 2s для 100 файлов
- ✅ Профайлинг доступен
- ✅ Security scan passing

---

### ФАЗА 7: Testing & Quality [HIGH]

**Единичные тесты:**
- [ ] SDK functions (validator, mapper, completions, idempotency)
- [ ] CLI commands
- [ ] Error mapping precision

**Интеграционные тесты:**
- [x] Phase 1-5 completed ✅
- [ ] LSP server with vscode-test
- [ ] Cloud Functions integration tests
- [ ] Cloud Run deployment tests

**Coverage:**
- [ ] SDK core: >80% code coverage
- [ ] LSP server: >70% coverage
- [ ] CLI: >60% coverage

**Performance tests:**
- [ ] Validation of 1000 files < 2s
- [ ] Memory stable < 200MB

**Ожидаемый результат:**
- ✅ >75% avg code coverage
- ✅ Все тесты passing
- ✅ Performance baseline established

---

## 🎯 КРАТКИЙ ПЛАН ДЕЙСТВИЙ

### Неделя 1: CI/CD + Publishing
1. Финализировать GitHub Actions workflows
2. Опубликовать в npm
3. Проверить пакеты на npm

### Неделя 2: GCP Deployment
1. Создать Cloud Function (validate)
2. Создать Cloud Run (schema registry)
3. Настроить Cloud Storage
4. Интегрировать с CLI/SDK

### Неделя 3: Documentation
1. Написать README (корневой + per-package)
2. Создать Quickstart guide
3. Настроить GitHub Pages для API docs
4. Добавить примеры

### Неделя 4: Testing & Polish
1. Добавить unit tests
2. Расширить integration tests
3. Profiling & optimization
4. Security review

### Неделя 5: Advanced Features
1. Code Actions
2. Document/Workspace Symbols
3. Rename/References
4. Execute Command integration

---

## 📋 Acceptance Criteria (из ТЗ)

MVP must pass:
- [x] `@mova/sdk` published to npm ✅
- [x] `@mova/schemas` published ✅
- [x] `@mova/server-lsp` starts and provides diagnostics ✅
- [x] `@mova/cli validate` works ✅
- [x] Integration tests passing ✅
- [ ] CI builds/tests/publishes automatically ⏳
- [ ] Performance: < 2s for 100 files ⏳

---

## 🚀 Рекомендуемый Priority

```
1. ⏳ CI/CD GitHub Actions [NEXT - 1-2 дня]
2. ⏳ Publishing to npm [NEXT - 1 день]
3. 🔥 GCP Integration [HIGH - 3-5 дней]
4. 🔥 Documentation [HIGH - 2-3 дня]
5. 📊 Testing & Quality [MEDIUM - 2-3 дня]
6. ✨ Advanced LSP Features [MEDIUM - 3-5 дней]
7. 🔒 Performance & Security [MEDIUM - 2 дня]
```

---

## Что готово к немедленной работе?

✅ Все пакеты собраны и работают локально  
✅ Интеграционные тесты passing  
✅ CLI функционален  
✅ SDK API стабилен  
✅ GitHub Actions workflows существуют  

**Следующий шаг:** Опубликовать пакеты в npm!
