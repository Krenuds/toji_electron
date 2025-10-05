# Review Priorities

**Generated:** 2025-10-05T21:05:16.098Z

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

### 1. `index.ts` (Score: 58)

**Path:** `src/main/toji/index.ts`

**Metrics:**

- Dependencies: 14
- Circular Dependencies: ✅ No
- Log Frequency: 0 entries

**Review Priority:** 🔴 **CRITICAL**

**Review Checklist:**

- [ ] Verify error handling is complete
- [ ] Check resource cleanup
- [ ] Validate type safety (no `any` types)
- [ ] Review dependency necessity

- [ ] Add/update tests
- [ ] Update documentation

---

### 2. `DiscordPlugin.ts` (Score: 49)

**Path:** `src/plugins/discord/DiscordPlugin.ts`

**Metrics:**

- Dependencies: 17
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

### 3. `mcp-manager.ts` (Score: 48)

**Path:** `src/main/toji/mcp/mcp-manager.ts`

**Metrics:**

- Dependencies: 14
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

### 4. `index.ts` (Score: 44)

**Path:** `src/main/toji/mcp/index.ts`

**Metrics:**

- Dependencies: 12
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

### 5. `SlashCommandModule.ts` (Score: 41)

**Path:** `src/plugins/discord/modules/SlashCommandModule.ts`

**Metrics:**

- Dependencies: 13
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

### 6. `deploy-commands.ts` (Score: 29)

**Path:** `src/plugins/discord/deploy-commands.ts`

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

### 7. `DiscordProjectManager.ts` (Score: 29)

**Path:** `src/plugins/discord/modules/DiscordProjectManager.ts`

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

### 8. `VoiceModule.ts` (Score: 29)

**Path:** `src/plugins/discord/voice/VoiceModule.ts`

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

### 9. `server.ts` (Score: 28)

**Path:** `src/main/toji/server.ts`

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

### 10. `project-initializer.ts` (Score: 28)

**Path:** `src/main/toji/project-initializer.ts`

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

### 11. `index.ts` (Score: 28)

**Path:** `src/main/handlers/index.ts`

**Metrics:**

- Dependencies: 9
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

### 12. `index.ts` (Score: 28)

**Path:** `src/renderer/src/components/shared/index.ts`

**Metrics:**

- Dependencies: 14
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

### 13. `client-manager.ts` (Score: 26)

**Path:** `src/main/toji/client-manager.ts`

**Metrics:**

- Dependencies: 3
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

### 14. `config-manager.ts` (Score: 26)

**Path:** `src/main/toji/config-manager.ts`

**Metrics:**

- Dependencies: 3
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

### 15. `discord-service.ts` (Score: 25)

**Path:** `src/main/services/discord-service.ts`

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

### 16. `clear.ts` (Score: 25)

**Path:** `src/plugins/discord/commands/clear.ts`

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

### 17. `interfaces.ts` (Score: 24)

**Path:** `src/main/toji/interfaces.ts`

**Metrics:**

- Dependencies: 2
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

### 18. `sessions.ts` (Score: 24)

**Path:** `src/main/toji/sessions.ts`

**Metrics:**

- Dependencies: 2
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

### 19. `voice.ts` (Score: 23)

**Path:** `src/plugins/discord/commands/voice.ts`

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

### 20. `voice-service-manager.ts` (Score: 23)

**Path:** `src/main/services/voice-service-manager.ts`

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
- [ ] 2. DiscordPlugin.ts
- [ ] 3. mcp-manager.ts
- [ ] 4. index.ts
- [ ] 5. SlashCommandModule.ts
- [ ] 6. deploy-commands.ts
- [ ] 7. DiscordProjectManager.ts
- [ ] 8. VoiceModule.ts
- [ ] 9. server.ts
- [ ] 10. project-initializer.ts
- [ ] 11. index.ts
- [ ] 12. index.ts
- [ ] 13. client-manager.ts
- [ ] 14. config-manager.ts
- [ ] 15. discord-service.ts
- [ ] 16. clear.ts
- [ ] 17. interfaces.ts
- [ ] 18. sessions.ts
- [ ] 19. voice.ts
- [ ] 20. voice-service-manager.ts

---

## Next Steps

1. Review modules in order (top to bottom)
2. Check off items as you complete them
3. Document findings in `reviews/[module-name].md`
4. Re-run this script after major changes to update priorities

**Tip:** Focus on CRITICAL and HIGH priority items first!
