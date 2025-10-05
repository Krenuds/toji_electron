# Review Priorities

**Generated:** 2025-10-05T20:52:57.501Z

## Scoring System

- **Dependencies:** +2 points per dependency
- **Circular Dependency:** +50 points (CRITICAL)
- **Log Frequency:** +0.1 point per log entry
- **Layer Bonus:**
  - Toji Core: +30 points
  - Main Toji: +20 points
  - Services: +15 points
  - Discord Plugin: +15 points
  - Handlers: +10 points

---

## Top 20 Priority Modules

### 1. `index.ts` (Score: 116)

**Path:** `src/main/toji/index.ts`

**Metrics:**

- Dependencies: 18
- Circular Dependencies: ✅ **FIXED** (2025-10-05)
- Log Frequency: 0 entries

**Review Priority:** � **COMPLETED**

**Review Checklist:**

- [x] Verify error handling is complete
- [x] Check resource cleanup
- [x] Validate type safety (no `any` types)
- [x] Review dependency necessity
- [x] **URGENT:** Fix circular dependency ✅ **DONE** - Created `interfaces.ts` to break circular import
- [ ] Add/update tests
- [ ] Update documentation

**Fixes Applied:**

- Created `src/main/toji/interfaces.ts` with `ITojiCore` interface
- Updated `mcp-manager.ts` to use interface instead of concrete `Toji` type
- Updated `initialize-project.ts` tool to use interface
- Circular dependency chain BROKEN: `index.ts → mcp/index.ts → mcp-manager.ts → index.ts` ❌ NO LONGER EXISTS

---

### 2. `mcp-manager.ts` (Score: 112)

**Path:** `src/main/toji/mcp/mcp-manager.ts`

**Metrics:**

- Dependencies: 21
- Circular Dependencies: ✅ **FIXED** (2025-10-05)
- Log Frequency: 0 entries

**Review Priority:** � **COMPLETED**

**Review Checklist:**

- [x] Verify error handling is complete
- [x] Check resource cleanup
- [x] Validate type safety (no `any` types)
- [x] Review dependency necessity
- [x] **URGENT:** Fix circular dependency ✅ **DONE** - Now uses `ITojiCore` interface
- [ ] Add/update tests
- [ ] Update documentation

**Fixes Applied:**

- Replaced `import type { Toji } from '../index'` with `import type { ITojiCore } from '../interfaces'`
- All methods now accept `() => ITojiCore | null` instead of `() => Toji | null`
- TypeScript compilation passes ✅

---

### 3. `DiscordPlugin.ts` (Score: 101)

**Path:** `src/plugins/discord/DiscordPlugin.ts`

**Metrics:**

- Dependencies: 18
- Circular Dependencies: ⚠️ YES
- Log Frequency: 0 entries

**Review Priority:** 🔴 **CRITICAL**

**Review Checklist:**

- [ ] Verify error handling is complete
- [ ] Check resource cleanup
- [ ] Validate type safety (no `any` types)
- [ ] Review dependency necessity
- [ ] **URGENT:** Fix circular dependency
- [ ] Add/update tests
- [ ] Update documentation

---

### 4. `index.ts` (Score: 94)

**Path:** `src/main/toji/mcp/index.ts`

**Metrics:**

- Dependencies: 12
- Circular Dependencies: ⚠️ YES
- Log Frequency: 0 entries

**Review Priority:** 🔴 **CRITICAL**

**Review Checklist:**

- [ ] Verify error handling is complete
- [ ] Check resource cleanup
- [ ] Validate type safety (no `any` types)
- [ ] Review dependency necessity
- [ ] **URGENT:** Fix circular dependency
- [ ] Add/update tests
- [ ] Update documentation

---

### 5. `SlashCommandModule.ts` (Score: 93)

**Path:** `src/plugins/discord/modules/SlashCommandModule.ts`

**Metrics:**

- Dependencies: 14
- Circular Dependencies: ⚠️ YES
- Log Frequency: 0 entries

**Review Priority:** 🔴 **CRITICAL**

**Review Checklist:**

- [ ] Verify error handling is complete
- [ ] Check resource cleanup
- [ ] Validate type safety (no `any` types)
- [ ] Review dependency necessity
- [ ] **URGENT:** Fix circular dependency
- [ ] Add/update tests
- [ ] Update documentation

---

### 6. `VoiceModule.ts` (Score: 87)

**Path:** `src/plugins/discord/voice/VoiceModule.ts`

**Metrics:**

- Dependencies: 11
- Circular Dependencies: ⚠️ YES
- Log Frequency: 0 entries

**Review Priority:** 🔴 **CRITICAL**

**Review Checklist:**

- [ ] Verify error handling is complete
- [ ] Check resource cleanup
- [ ] Validate type safety (no `any` types)
- [ ] Review dependency necessity
- [ ] **URGENT:** Fix circular dependency
- [ ] Add/update tests
- [ ] Update documentation

---

### 7. `deploy-commands.ts` (Score: 83)

**Path:** `src/plugins/discord/deploy-commands.ts`

**Metrics:**

- Dependencies: 9
- Circular Dependencies: ⚠️ YES
- Log Frequency: 0 entries

**Review Priority:** 🔴 **CRITICAL**

**Review Checklist:**

- [ ] Verify error handling is complete
- [ ] Check resource cleanup
- [ ] Validate type safety (no `any` types)
- [ ] Review dependency necessity
- [ ] **URGENT:** Fix circular dependency
- [ ] Add/update tests
- [ ] Update documentation

---

### 8. `DiscordProjectManager.ts` (Score: 81)

**Path:** `src/plugins/discord/modules/DiscordProjectManager.ts`

**Metrics:**

- Dependencies: 8
- Circular Dependencies: ⚠️ YES
- Log Frequency: 0 entries

**Review Priority:** 🔴 **CRITICAL**

**Review Checklist:**

- [ ] Verify error handling is complete
- [ ] Check resource cleanup
- [ ] Validate type safety (no `any` types)
- [ ] Review dependency necessity
- [ ] **URGENT:** Fix circular dependency
- [ ] Add/update tests
- [ ] Update documentation

---

### 9. `initialize-project.ts` (Score: 80)

**Path:** `src/main/toji/mcp/tools/initialize-project.ts`

**Metrics:**

- Dependencies: 5
- Circular Dependencies: ⚠️ YES
- Log Frequency: 0 entries

**Review Priority:** 🔴 **CRITICAL**

**Review Checklist:**

- [ ] Verify error handling is complete
- [ ] Check resource cleanup
- [ ] Validate type safety (no `any` types)
- [ ] Review dependency necessity
- [ ] **URGENT:** Fix circular dependency
- [ ] Add/update tests
- [ ] Update documentation

---

### 10. `clear.ts` (Score: 77)

**Path:** `src/plugins/discord/commands/clear.ts`

**Metrics:**

- Dependencies: 6
- Circular Dependencies: ⚠️ YES
- Log Frequency: 0 entries

**Review Priority:** 🔴 **CRITICAL**

**Review Checklist:**

- [ ] Verify error handling is complete
- [ ] Check resource cleanup
- [ ] Validate type safety (no `any` types)
- [ ] Review dependency necessity
- [ ] **URGENT:** Fix circular dependency
- [ ] Add/update tests
- [ ] Update documentation

---

### 11. `voice.ts` (Score: 75)

**Path:** `src/plugins/discord/commands/voice.ts`

**Metrics:**

- Dependencies: 5
- Circular Dependencies: ⚠️ YES
- Log Frequency: 0 entries

**Review Priority:** 🔴 **CRITICAL**

**Review Checklist:**

- [ ] Verify error handling is complete
- [ ] Check resource cleanup
- [ ] Validate type safety (no `any` types)
- [ ] Review dependency necessity
- [ ] **URGENT:** Fix circular dependency
- [ ] Add/update tests
- [ ] Update documentation

---

### 12. `init.ts` (Score: 73)

**Path:** `src/plugins/discord/commands/init.ts`

**Metrics:**

- Dependencies: 4
- Circular Dependencies: ⚠️ YES
- Log Frequency: 0 entries

**Review Priority:** 🔴 **CRITICAL**

**Review Checklist:**

- [ ] Verify error handling is complete
- [ ] Check resource cleanup
- [ ] Validate type safety (no `any` types)
- [ ] Review dependency necessity
- [ ] **URGENT:** Fix circular dependency
- [ ] Add/update tests
- [ ] Update documentation

---

### 13. `project.ts` (Score: 73)

**Path:** `src/plugins/discord/commands/project.ts`

**Metrics:**

- Dependencies: 4
- Circular Dependencies: ⚠️ YES
- Log Frequency: 0 entries

**Review Priority:** 🔴 **CRITICAL**

**Review Checklist:**

- [ ] Verify error handling is complete
- [ ] Check resource cleanup
- [ ] Validate type safety (no `any` types)
- [ ] Review dependency necessity
- [ ] **URGENT:** Fix circular dependency
- [ ] Add/update tests
- [ ] Update documentation

---

### 14. `project-initializer.ts` (Score: 38)

**Path:** `src/main/toji/project-initializer.ts`

**Metrics:**

- Dependencies: 9
- Circular Dependencies: ✅ No
- Log Frequency: 0 entries

**Review Priority:** 🟠 **HIGH**

**Review Checklist:**

- [ ] Verify error handling is complete
- [ ] Check resource cleanup
- [ ] Validate type safety (no `any` types)
- [ ] Review dependency necessity

- [ ] Add/update tests
- [ ] Update documentation

---

### 15. `server.ts` (Score: 36)

**Path:** `src/main/toji/server.ts`

**Metrics:**

- Dependencies: 8
- Circular Dependencies: ✅ No
- Log Frequency: 0 entries

**Review Priority:** 🟠 **HIGH**

**Review Checklist:**

- [ ] Verify error handling is complete
- [ ] Check resource cleanup
- [ ] Validate type safety (no `any` types)
- [ ] Review dependency necessity

- [ ] Add/update tests
- [ ] Update documentation

---

### 16. `config-manager.ts` (Score: 34)

**Path:** `src/main/toji/config-manager.ts`

**Metrics:**

- Dependencies: 7
- Circular Dependencies: ✅ No
- Log Frequency: 0 entries

**Review Priority:** 🟠 **HIGH**

**Review Checklist:**

- [ ] Verify error handling is complete
- [ ] Check resource cleanup
- [ ] Validate type safety (no `any` types)
- [ ] Review dependency necessity

- [ ] Add/update tests
- [ ] Update documentation

---

### 17. `client-manager.ts` (Score: 30)

**Path:** `src/main/toji/client-manager.ts`

**Metrics:**

- Dependencies: 5
- Circular Dependencies: ✅ No
- Log Frequency: 0 entries

**Review Priority:** 🟡 **MEDIUM**

**Review Checklist:**

- [ ] Verify error handling is complete
- [ ] Check resource cleanup
- [ ] Validate type safety (no `any` types)
- [ ] Review dependency necessity

- [ ] Add/update tests
- [ ] Update documentation

---

### 18. `opencode-service.ts` (Score: 29)

**Path:** `src/main/services/opencode-service.ts`

**Metrics:**

- Dependencies: 7
- Circular Dependencies: ✅ No
- Log Frequency: 0 entries

**Review Priority:** 🟡 **MEDIUM**

**Review Checklist:**

- [ ] Verify error handling is complete
- [ ] Check resource cleanup
- [ ] Validate type safety (no `any` types)
- [ ] Review dependency necessity

- [ ] Add/update tests
- [ ] Update documentation

---

### 19. `discord-service.ts` (Score: 29)

**Path:** `src/main/services/discord-service.ts`

**Metrics:**

- Dependencies: 7
- Circular Dependencies: ✅ No
- Log Frequency: 0 entries

**Review Priority:** 🟡 **MEDIUM**

**Review Checklist:**

- [ ] Verify error handling is complete
- [ ] Check resource cleanup
- [ ] Validate type safety (no `any` types)
- [ ] Review dependency necessity

- [ ] Add/update tests
- [ ] Update documentation

---

### 20. `clear-session.ts` (Score: 28)

**Path:** `src/main/toji/mcp/tools/clear-session.ts`

**Metrics:**

- Dependencies: 4
- Circular Dependencies: ✅ No
- Log Frequency: 0 entries

**Review Priority:** 🟡 **MEDIUM**

**Review Checklist:**

- [ ] Verify error handling is complete
- [ ] Check resource cleanup
- [ ] Validate type safety (no `any` types)
- [ ] Review dependency necessity

- [ ] Add/update tests
- [ ] Update documentation

---

## Review Progress Tracker

Track your progress here:

- [ ] 1. index.ts
- [ ] 2. mcp-manager.ts
- [ ] 3. DiscordPlugin.ts
- [ ] 4. index.ts
- [ ] 5. SlashCommandModule.ts
- [ ] 6. VoiceModule.ts
- [ ] 7. deploy-commands.ts
- [ ] 8. DiscordProjectManager.ts
- [ ] 9. initialize-project.ts
- [ ] 10. clear.ts
- [ ] 11. voice.ts
- [ ] 12. init.ts
- [ ] 13. project.ts
- [ ] 14. project-initializer.ts
- [ ] 15. server.ts
- [ ] 16. config-manager.ts
- [ ] 17. client-manager.ts
- [ ] 18. opencode-service.ts
- [ ] 19. discord-service.ts
- [ ] 20. clear-session.ts

---

## Next Steps

1. Review modules in order (top to bottom)
2. Check off items as you complete them
3. Document findings in `reviews/[module-name].md`
4. Re-run this script after major changes to update priorities

**Tip:** Focus on CRITICAL and HIGH priority items first!
