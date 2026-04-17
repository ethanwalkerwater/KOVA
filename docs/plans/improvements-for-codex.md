# Kova — 改进 Plan (For Codex)

> **目标读者：** Codex CLI 执行此 plan，对当前 Kova 代码库（Phase 0+1 已完成）做架构和质量改进，为 Phase 2 上线做准备。
>
> **执行方式：** 按 P0 → P1 → P2 顺序执行。每完成一个 task 后 commit。每个 task 内部按 step 顺序，所有 step 完成才能 commit。

---

## 项目背景（必读）

**Kova** 是一个 B2B 关系智能 PWA。已完成：
- ✅ Phase 0：Next.js 16 + Tailwind + 设计系统 + UI 组件
- ✅ Phase 1：5 个屏幕 + Mock 数据 + Vercel 部署 (https://kova-chi-two.vercel.app)
- 🚀 Phase 2：即将开始（Supabase + AI 重生成）

**核心架构：**
- `interactions` 表是 append-only 真实来源
- AI（GPT-4o）从 interactions 重新生成 `sections`（markdown）和 `contacts` 元数据
- Mobile-first PWA，支持 offline

**完整 plan 在：** `/Users/hanchaoxu/.claude/plans/synchronous-greeting-horizon.md`

---

## 🔴 P0 任务（Phase 2 之前必须完成）

### Task P0.1：建立测试基础设施

**为什么：** AI 重生成是核心逻辑，没测试上线即灾难。当前 0 测试覆盖。

**步骤：**

- [ ] **Step 1：** 安装测试依赖
  ```bash
  npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react happy-dom
  npm install -D @playwright/test
  npx playwright install --with-deps chromium webkit
  ```

- [ ] **Step 2：** 在 `vitest.config.ts` 配置 Vitest
  ```ts
  import { defineConfig } from "vitest/config";
  import react from "@vitejs/plugin-react";
  import path from "node:path";

  export default defineConfig({
    plugins: [react()],
    test: {
      environment: "happy-dom",
      globals: true,
      setupFiles: ["./vitest.setup.ts"],
    },
    resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  });
  ```

- [ ] **Step 3：** 在 `vitest.setup.ts` 加 jest-dom 扩展
  ```ts
  import "@testing-library/jest-dom/vitest";
  ```

- [ ] **Step 4：** 在 `playwright.config.ts` 配置 Playwright
  ```ts
  import { defineConfig, devices } from "@playwright/test";
  export default defineConfig({
    testDir: "./tests/e2e",
    use: { baseURL: "http://localhost:3000" },
    projects: [
      { name: "mobile-chrome", use: { ...devices["Pixel 5"] } },
      { name: "mobile-safari", use: { ...devices["iPhone 13"] } },
    ],
    webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: !process.env.CI },
  });
  ```

- [ ] **Step 5：** 在 `package.json` 添加脚本
  ```json
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
  ```

- [ ] **Step 6：** 写 3 个示例 unit test 验证设置可用
  - `src/lib/utils/date.test.ts` — `formatRelativeTime` 边界测试（现在 0、1分钟、1小时、29天、30天、364天、365天）
  - `src/components/ui/Avatar.test.tsx` — 空字符串 guard、初始字符提取、颜色稳定性
  - `src/lib/mock-data.test.ts` — `getMockContact` 不存在的 ID 返回 undefined、`getMockFollowupSuggestions` 至少返回 1 条

- [ ] **Step 7：** 写 1 个 E2E smoke test
  - `tests/e2e/smoke.spec.ts` — 访问 `/home`，看到 "Good morning"，点击 Clients tab，看到至少 7 个联系人

- [ ] **Step 8：** 运行 `npm test && npm run test:e2e` 全绿

- [ ] **Step 9：** Commit
  ```bash
  git add -A && git commit -m "test: add Vitest + Playwright infrastructure with smoke tests"
  ```

---

### Task P0.2：环境变量管理

**为什么：** Phase 2 需要 Supabase URL、Anon Key、OpenAI Key。当前 0 个 env file。

**步骤：**

- [ ] **Step 1：** 创建 `.env.example`（提交到 git）
  ```env
  # ── Supabase ──────────────────────────────────────
  NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
  SUPABASE_SERVICE_ROLE_KEY=eyJxxx...  # server-side only

  # ── OpenAI ────────────────────────────────────────
  OPENAI_API_KEY=sk-xxx
  OPENAI_MODEL=gpt-4o
  OPENAI_MODEL_FALLBACK=gpt-4o-mini

  # ── Web Search (choose one) ───────────────────────
  TAVILY_API_KEY=tvly-xxx
  SERPER_API_KEY=

  # ── Feature Flags ─────────────────────────────────
  NEXT_PUBLIC_ENABLE_VOICE=true
  NEXT_PUBLIC_ENABLE_REGENERATION=true
  ```

- [ ] **Step 2：** 创建 `.env.local`（已经在 .gitignore，本地占位即可）
  ```env
  # 复制 .env.example 内容，本地填入真实值
  ```

- [ ] **Step 3：** 创建 `src/lib/env.ts` 做类型安全的环境变量加载
  ```ts
  // 使用 zod 验证 env vars
  // 区分 client-safe (NEXT_PUBLIC_*) 和 server-only
  ```

- [ ] **Step 4：** 安装 `zod`：`npm install zod`

- [ ] **Step 5：** 在 README 加一节 "Environment Setup" 说明如何复制 `.env.example`

- [ ] **Step 6：** Commit
  ```bash
  git add .env.example src/lib/env.ts README.md && git commit -m "chore: add typed environment variable management with zod"
  ```

---

### Task P0.3：AI 重生成成本控制设计

**为什么：** 当前 plan 每个 interaction 都触发完整重生成。100 个 interactions 的客户，每条新笔记 = 读全部历史 = $0.10–$0.30 一次。每天 100 条笔记 = $20+。无法承受。

**步骤：**

- [ ] **Step 1：** 写一份设计文档 `docs/architecture/ai-regeneration.md`
  - 描述 3 个层级的重生成策略：
    - **Tier 1 - Immediate (cheap)**: 用 GPT-4o-mini 做轻量级摘要 + metadata 提取，立即更新 `ai_summary`、`relationship_score`、`suggested_next_step`
    - **Tier 2 - Debounced (mid)**: 30 秒内的多个 interactions 合并触发 1 次重生成，使用 GPT-4o
    - **Tier 3 - Manual/Scheduled**: 用户点击 "Regenerate" 或每周一次完整重生成 sections
  - 描述 incremental 策略：保留上次 regeneration 的 hash，只有真正有"质变"信号（关键事件、5+ 新 interactions）时才完整重生成
  - 描述 cache 策略：interactions hash → result 缓存

- [ ] **Step 2：** 创建 TypeScript 接口框架（不实现，只定义合同）
  ```ts
  // src/lib/ai/types.ts
  export interface RegenerationStrategy {
    tier: "immediate" | "debounced" | "scheduled" | "manual";
    model: "gpt-4o" | "gpt-4o-mini";
    inputs: { interactions: Interaction[]; previousMetadata?: Contact };
    outputs: { metadata: Partial<Contact>; sections: Section[] };
  }

  export interface RegenerationQueue {
    enqueue(contactId: string, trigger: InteractionType): Promise<void>;
    flush(contactId: string): Promise<void>;
    getStatus(contactId: string): "pending" | "running" | "idle";
  }
  ```

- [ ] **Step 3：** 创建 `src/lib/ai/cost-estimator.ts`
  ```ts
  // 给定 interactions 数量和长度，估算 GPT-4o tokens 和 USD 成本
  // 用于在 UI 显示 "This regeneration will cost ~$0.05"
  export function estimateCost(interactions: Interaction[]): { tokens: number; usd: number };
  ```

- [ ] **Step 4：** 写测试（cost estimator 边界）
  ```ts
  // src/lib/ai/cost-estimator.test.ts
  // - 0 interactions → 最小成本
  // - 100 interactions × 200 chars → 准确估算
  ```

- [ ] **Step 5：** 在主 plan (`docs/plans/synchronous-greeting-horizon.md`) 加一段 "AI Cost Architecture" 引用此文档

- [ ] **Step 6：** Commit
  ```bash
  git add docs/architecture/ src/lib/ai/ && git commit -m "docs(ai): tiered regeneration strategy with cost estimation framework"
  ```

---

### Task P0.4：AI 幻觉防御机制

**为什么：** GPT-4o 会编造没在 interactions 里的事实（如随便写 deal_value）。如果用户基于错误数据做决策会失去信任。

**步骤：**

- [ ] **Step 1：** 修改 plan 中的 AI Regeneration Pipeline 章节，加入 "Source Attribution" 设计：
  - 每个 metadata 字段必须有 `source_interaction_ids: string[]` 引用
  - 如果 AI 不能从 interactions 直接推断出某字段，必须返回 `null` 而非编造
  - 系统提示加入硬约束："Only output a value if it is explicitly stated or strongly implied by interactions. Otherwise return null."

- [ ] **Step 2：** 扩展 `Section` 类型加 `source_interaction_ids`
  ```ts
  // src/types/section.ts
  export interface Section {
    // ... 现有字段
    source_interaction_ids: string[]; // 新增：哪些 interactions 贡献了此 section
  }
  ```
  对应在 Supabase schema 加一列 `source_interaction_ids uuid[] default '{}'`

- [ ] **Step 3：** 写一个 contracts 测试 `src/lib/ai/contract.test.ts`，验证：
  - 假的 GPT-4o 输出（含编造的 `deal_value`）能被检测到
  - 正确的输出（每个 metadata 都有 source 引用）通过验证

- [ ] **Step 4：** 创建 `src/lib/ai/validators.ts`：
  ```ts
  /**
   * 验证 AI 输出是否符合 anti-hallucination 契约。
   * - 每个非 null metadata 字段必须有至少 1 个 source_interaction_id
   * - source_interaction_ids 必须是有效的 interaction id（在输入集中）
   */
  export function validateRegeneration(
    interactions: Interaction[],
    output: AIRegenerationResult
  ): { valid: boolean; errors: string[] };
  ```

- [ ] **Step 5：** Commit
  ```bash
  git add -A && git commit -m "feat(ai): add source attribution + anti-hallucination validators"
  ```

---

### Task P0.5：Section 编辑 escape hatch

**为什么：** Plan 说 sections "NOT directly edited by users"，但 AI 一旦写错（哪怕罕见），用户没法修正。会失去信任。

**步骤：**

- [ ] **Step 1：** 修改 `src/types/section.ts`，加：
  ```ts
  export interface Section {
    // ... 现有字段
    user_overrides_md: string | null;     // 用户手动编辑后的内容
    overridden_at: string | null;          // 何时被覆盖
    override_reason: string | null;        // 为何覆盖（短）
  }
  ```
  对应 Supabase schema 加 3 列。

- [ ] **Step 2：** 修改 `SectionRenderer` 显示逻辑：
  - 如果 `user_overrides_md` 存在，显示用户内容
  - 在 section header 显示一个 "Edited by you · [Restore AI version]" 小标识
  - "Edit" 按钮触发 inline 编辑模式（保存到 `user_overrides_md`）
  - "Restore AI version" 清空 `user_overrides_md` 让 AI 内容重新可见

- [ ] **Step 3：** 重生成逻辑要尊重 override：
  - 如果 section 有 `user_overrides_md`，AI 重生成时不更新 `content_md` 显示，但仍更新 `content_md`（保持 AI 版本作为参考）
  - UI 用 `user_overrides_md ?? content_md` 显示

- [ ] **Step 4：** 在 mock data 给 1 个 section 加 `user_overrides_md` 示例，看 UI 是否正确显示标识

- [ ] **Step 5：** 写 component test 验证 SectionRenderer 的两种模式

- [ ] **Step 6：** Commit
  ```bash
  git add -A && git commit -m "feat(sections): add user override escape hatch for AI-generated content"
  ```

---

### Task P0.6：Lint 和 Prettier 配置

**为什么：** 项目当前没有 lint/format。多人协作或 CI 会出问题。

**步骤：**

- [ ] **Step 1：** 安装：
  ```bash
  npm install -D eslint @next/eslint-plugin-next eslint-config-next prettier eslint-config-prettier eslint-plugin-prettier
  ```

- [ ] **Step 2：** 创建 `.eslintrc.json`：
  ```json
  {
    "extends": ["next/core-web-vitals", "prettier"],
    "rules": {
      "no-console": ["warn", { "allow": ["warn", "error"] }],
      "@typescript-eslint/no-unused-vars": "error"
    }
  }
  ```

- [ ] **Step 3：** 创建 `.prettierrc`：
  ```json
  {
    "semi": true,
    "singleQuote": false,
    "trailingComma": "all",
    "printWidth": 100,
    "tabWidth": 2
  }
  ```

- [ ] **Step 4：** 在 `package.json` 加脚本：
  ```json
  "lint": "next lint",
  "lint:fix": "next lint --fix",
  "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
  "format:check": "prettier --check \"src/**/*.{ts,tsx,css}\""
  ```

- [ ] **Step 5：** 跑 `npm run lint:fix && npm run format`，提交所有自动修复

- [ ] **Step 6：** Commit
  ```bash
  git add -A && git commit -m "chore: add ESLint + Prettier configuration"
  ```

---

## 🟡 P1 任务（Phase 2 中完成）

### Task P1.1：Web Speech API → Whisper Fallback

**为什么：** iOS Safari 对 Web Speech API 支持极差。全球市场必须有 fallback。

**步骤：**

- [ ] **Step 1：** 创建 `src/lib/voice/transcribe.ts` 接口：
  ```ts
  export interface Transcriber {
    isSupported(): boolean;
    transcribe(audio: Blob): Promise<{ text: string; confidence: number }>;
  }
  export class WebSpeechTranscriber implements Transcriber { ... }
  export class WhisperTranscriber implements Transcriber { ... }  // 通过 /api/transcribe
  export function getBestTranscriber(): Transcriber;  // 自动选择
  ```

- [ ] **Step 2：** 创建 `src/app/api/transcribe/route.ts`，POST audio → OpenAI Whisper API → text

- [ ] **Step 3：** 写测试（mock fetch 的）

- [ ] **Step 4：** Commit

---

### Task P1.2：pgvector 语义搜索

**为什么：** "Find clients I discussed cloud migration with" 需要语义相似度，不是关键词匹配。

**步骤：**

- [ ] **Step 1：** 在 Supabase migration 中启用 pgvector
  ```sql
  create extension if not exists vector;

  alter table interactions add column embedding vector(1536);
  create index on interactions using ivfflat (embedding vector_cosine_ops);
  ```

- [ ] **Step 2：** 写 `src/lib/ai/embed.ts` 生成 embedding（OpenAI text-embedding-3-small）

- [ ] **Step 3：** 创建 `src/app/api/search/semantic/route.ts`，接受 query → embed → 余弦距离搜索

- [ ] **Step 4：** 测试

- [ ] **Step 5：** Commit

---

### Task P1.3：Rate Limiting + Caching

**为什么：** Web search、OpenAI 调用会被滥用或者突发 cost。

**步骤：**

- [ ] **Step 1：** 安装：`npm install @upstash/ratelimit @upstash/redis`

- [ ] **Step 2：** 创建 `src/lib/rate-limit.ts`，按用户 + 端点维度限流

- [ ] **Step 3：** 在所有 `/api/*` route 加 rate limit middleware

- [ ] **Step 4：** 创建 `src/lib/cache/redis.ts`，缓存 web search 结果（key: search query hash, TTL: 7 天）

- [ ] **Step 5：** Commit

---

### Task P1.4：OAuth 登录（Google + LinkedIn）

**为什么：** B2B 工具单一 email 登录摩擦大。LinkedIn 还能直接拉用户公司信息。

**步骤：**

- [ ] **Step 1：** 在 Supabase Dashboard 配置 Google + LinkedIn OAuth providers

- [ ] **Step 2：** 在 login page 加两个 OAuth 按钮，触发 `supabase.auth.signInWithOAuth({ provider })`

- [ ] **Step 3：** 写 callback handler `src/app/auth/callback/route.ts`

- [ ] **Step 4：** 测试（手动 + Playwright）

- [ ] **Step 5：** Commit

---

### Task P1.5：多设备同步策略

**为什么：** 用户手机录一条 voice memo，桌面看不到，体验破裂。

**步骤：**

- [ ] **Step 1：** 写设计文档 `docs/architecture/sync.md`：
  - 用 Supabase Realtime 订阅 `interactions` 表的 INSERT 事件
  - 客户端 Dexie cache + Supabase Realtime → 单向同步
  - Offline interactions 加到 Dexie outbox，在线时 flush 到 Supabase

- [ ] **Step 2：** 实现 `src/lib/sync/realtime.ts` 订阅 + 本地缓存更新

- [ ] **Step 3：** 实现 `src/lib/sync/outbox.ts` offline 队列

- [ ] **Step 4：** 在 Zustand `contacts` store 接入

- [ ] **Step 5：** Commit

---

### Task P1.6：隐私 + 数据保护合规

**步骤：**

- [ ] **Step 1：** 创建 `docs/compliance/privacy.md`：
  - 数据存储位置（Supabase region）
  - PII 字段列表 + 加密策略（at-rest 默认，敏感字段如 phone 加密）
  - 用户数据删除 → 级联到 interactions/sections
  - GDPR Article 15 (access)、17 (deletion)、20 (portability) 实现

- [ ] **Step 2：** 创建 `src/app/api/privacy/export/route.ts`：用户能下载所有自己数据 JSON

- [ ] **Step 3：** 创建 `src/app/api/privacy/delete/route.ts`：硬删除用户和所有相关数据

- [ ] **Step 4：** 在 Me 页面加 "Export My Data" 和 "Delete Account" 按钮

- [ ] **Step 5：** Commit

---

## 🟢 P2 任务（Phase 3+ 改进）

### Task P2.1：错误监控（Sentry）

- [ ] 安装 `@sentry/nextjs`，配置 DSN
- [ ] 在 `src/app/(main)/error.tsx` 调用 `Sentry.captureException(error)`
- [ ] 在 client config 启用 performance monitoring + session replay
- [ ] Commit

### Task P2.2：i18n 框架

- [ ] 安装 `next-intl`
- [ ] 提取所有硬编码 string 到 `messages/en.json`
- [ ] 准备 `zh-CN.json` 占位（等到真做中文版填）
- [ ] 日期/货币用 locale-aware formatter
- [ ] Commit

### Task P2.3：修复类型安全细节

- [ ] `SectionSlug` 改为 `KnownSectionSlug | (string & {})` 模式保留收窄
- [ ] `mock-data.ts` 所有日期改用 `daysAgo()` 模式
- [ ] 修复 InteractionTimeline 200 字符魔法数 → 常量
- [ ] Commit

### Task P2.4：Inter 字体回到 next/font/google + 离线 fallback

- [ ] 用 `next/font/local` 把 Inter 字体文件 bundle 进项目
- [ ] 移除 CDN link
- [ ] 测试 build 在断网下成功
- [ ] Commit

### Task P2.5：Storybook for 组件库

- [ ] 安装 Storybook 8
- [ ] 给所有 `src/components/ui/*` 写 story
- [ ] 部署 Storybook 到 Vercel preview
- [ ] Commit

### Task P2.6：CI/CD GitHub Actions

- [ ] `.github/workflows/ci.yml`：lint + typecheck + unit test + e2e test
- [ ] 在 PR 触发，main push 触发
- [ ] Vercel preview deploy 自动评论 PR
- [ ] Commit

### Task P2.7：404 / NotFound 自定义页面

- [ ] `src/app/not-found.tsx` 全局 404
- [ ] `src/app/(main)/clients/[id]/not-found.tsx` 联系人不存在的友好页面

---

## 验证标准

### P0 完成标准
- [ ] `npm test` 全绿，至少 3 个 unit test + 1 个 E2E test
- [ ] `.env.example` 提交，README 有环境配置说明
- [ ] `docs/architecture/ai-regeneration.md` 存在，有 3 层策略 + cost estimator 测试通过
- [ ] `Section` 类型有 `user_overrides_md` 字段，UI 显示编辑标识
- [ ] `npm run lint && npm run format:check` 全绿

### P1 完成标准
- [ ] iOS Safari 上能用 Whisper 转录（手动测试）
- [ ] 语义搜索 "cloud migration" 能找到相关 contacts
- [ ] 超过 rate limit 返回 429 而非 OOM
- [ ] OAuth 登录能成功创建 profile
- [ ] 手机加 interaction，桌面 5 秒内能看到

### P2 完成标准
- [ ] Sentry dashboard 能看到生产错误
- [ ] 切换 locale UI 字符串和日期格式正确
- [ ] Storybook 部署成功
- [ ] CI 绿色后才能 merge

---

## 执行顺序建议

```
Week 1 (P0):
  Day 1-2: P0.1 (测试) + P0.6 (lint)
  Day 3:   P0.2 (env vars)
  Day 4-5: P0.3 (AI cost) + P0.4 (anti-hallucination) + P0.5 (override)

Week 2-3 (P1, 与 Phase 2 主任务并行):
  P1.1 (Whisper) — Phase 2 voice 任务的前置
  P1.2 (pgvector) — 在 Supabase migration 中加
  P1.3 (rate limit) — 在 API routes 时一起做
  P1.4 (OAuth) — 在 login page 时一起做
  P1.5 (sync) — Dexie + Realtime
  P1.6 (privacy) — 上线前必须

Week 4+ (P2):
  按需推进，不阻塞主路径
```

---

## 注意事项

1. **不要同时执行多个 task** — 每个 task 单独 commit 便于回滚
2. **不要跳过测试** — P0.1 没完成不要做后面的，否则没法验证
3. **更新主 plan** — 完成 P0.3 和 P0.4 后，回到 `synchronous-greeting-horizon.md` 同步更新 AI Regeneration Pipeline 章节
4. **遇到不确定的设计决策** — 在 commit message 中标注 "RFC: ..." 让人 review
5. **每个 task 末尾运行**：
   ```bash
   npm run lint && npm run format:check && npm test && npm run build
   ```
   全绿才能 commit

---

**总投入估算：** P0 全部 ≈ 2-3 天工作量；P1 ≈ 1 周（与 Phase 2 重叠）；P2 ≈ 持续改进
