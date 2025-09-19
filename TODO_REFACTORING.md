# Toji3 Refactoring TODO List

## 🔴 CRITICAL - Type Safety & API Violations

### 1. Fix SessionManager Type Safety Issues
**Location:** `src/main/api/session/manager.ts:54-95`
**Problem:** Multiple `unknown` type assertions destroying type safety
**Solution:** Create proper TypeScript interfaces for OpenCode SDK responses
```typescript
interface OpenCodeResponse {
  data?: {
    parts?: Array<{ type: 'text' | 'reasoning'; text: string }>
    text?: string
  }
}
```

### 2. Implement getOrCreateSession in Toji API
**Location:** `src/main/api/Toji.ts`
**Problem:** Discord and IPC layers implementing their own session management
**Solution:** Add unified method to Toji API
```typescript
async getOrCreateSession(identifier: string, title?: string): Promise<Session> {
  // Implementation here
}
```

### 3. Remove Business Logic from IPC Handlers
**Location:** `src/main/index.ts:130-142`
**Problem:** IPC handler contains session creation logic
**Solution:** Move to `toji.promptWithAutoSession()` method

## 🟡 HIGH PRIORITY - Pattern Violations

### 4. Create Missing Hooks for window.api Abstraction
**New Files Needed:**
- `src/renderer/src/hooks/useWindowControls.ts` - Window titlebar controls
- `src/renderer/src/hooks/useServerDirectory.ts` - Server directory management

**Files to Fix:**
- `src/renderer/src/App.tsx:14,18,22` - Replace direct window.api calls
- `src/renderer/src/components/views/chat/ChatViewSidebar.tsx:25-28` - Use hook instead

### 5. Add Explicit Return Types
**Locations:** All public API methods in:
- `src/main/api/Toji.ts`
- `src/main/api/session/manager.ts`
- `src/main/api/workspace/manager.ts`
- `src/main/api/project/manager.ts`

### 6. Abstract OpenCode Configuration
**Location:** `src/main/api/session/manager.ts:43-47`
**Problem:** Hardcoded `providerID: 'opencode', modelID: 'grok-code'`
**Solution:** Move to configuration layer

## 🟢 MEDIUM PRIORITY - API Completeness

### 7. Add Session Lifecycle Methods
**Location:** `src/main/api/session/manager.ts`
**New Methods Needed:**
```typescript
getOrCreateSession(identifier: string, title?: string): Promise<Session>
getSessionByIdentifier(identifier: string): Promise<Session | null>
cleanupInactiveSessions(maxAge: number): Promise<void>
getSessionContext(sessionId: string): Promise<string[]>
```

### 8. Create Error Recovery API
**Location:** `src/main/api/Toji.ts`
**New Methods Needed:**
```typescript
recoverFromError(error: Error): Promise<boolean>
healthCheck(): Promise<HealthStatus>
autoReconnect(): Promise<void>
```

### 9. Implement Proper Error Types
**Location:** `src/main/api/types.ts`
**Solution:** Create TojiError class with error codes and context

## 🔵 LOW PRIORITY - Architectural Improvements

### 10. Discord Session Management Enhancement
**Location:** `src/plugins/discord/modules/ChatModule.ts:106-134`
**Problem:** Discord maintains own session mapping
**Solution:** Consider adding channel-based session methods to Toji API

### 11. Workspace Validation API
**Location:** `src/main/api/workspace/manager.ts`
**New Methods Needed:**
```typescript
getWorkspaceMetrics(directory: string): Promise<WorkspaceMetrics>
validateWorkspace(directory: string): Promise<ValidationResult>
getWorkspaceHistory(): Promise<WorkspaceHistory[]>
```

### 12. Abstract File System Operations
**Location:** `src/main/api/workspace/manager.ts:83-103`
**Problem:** Direct `process.chdir()` and git commands
**Solution:** Create abstraction layer for workspace operations

## 📊 Impact Assessment

### Current State:
- **Type Safety:** ~60% (unknown types in critical paths)
- **Code Duplication:** Session logic in 3+ places
- **Pattern Adherence:** ~75% (most hooks good, some violations)
- **API Completeness:** ~70% (missing key lifecycle methods)

### After Refactoring:
- **Type Safety:** 95%+ with proper interfaces
- **Code Duplication:** Eliminated with unified API
- **Pattern Adherence:** 100% with proper abstractions
- **API Completeness:** 90%+ with new methods

## 🚀 Implementation Order

### Phase 1: Critical Fixes (This Week)
1. Fix SessionManager type safety (#1)
2. Implement getOrCreateSession (#2)
3. Remove IPC business logic (#3)
4. Create missing hooks (#4)

### Phase 2: API Enhancement (Next Week)
5. Add return types (#5)
6. Abstract configuration (#6)
7. Add session lifecycle methods (#7)
8. Create error recovery API (#8)

### Phase 3: Polish (Future)
9. Implement error types (#9)
10. Enhance Discord integration (#10)
11. Add workspace validation (#11)
12. Abstract file system ops (#12)

## 🔍 Files Most Needing Attention

1. **src/main/api/session/manager.ts** - Type safety critical
2. **src/main/api/Toji.ts** - Missing core methods
3. **src/main/index.ts** - IPC logic violations
4. **src/renderer/src/App.tsx** - Direct API usage
5. **src/plugins/discord/modules/ChatModule.ts** - Duplicate logic

## ✅ Success Criteria

- [ ] No `unknown` types in API layer
- [ ] All window.api calls go through hooks
- [ ] IPC handlers are thin passthroughs only
- [ ] Session management unified in Toji API
- [ ] All public methods have explicit return types
- [ ] Configuration properly abstracted
- [ ] Error handling standardized with TojiError
- [ ] Discord uses only Toji API methods
- [ ] Frontend components use only hooks
- [ ] Type safety score > 95%

## 📝 Notes

- Priority on fixing type safety and API violations first
- Discord refactoring can wait until API is solid
- Frontend hook creation is straightforward but important
- Consider creating a separate tech debt tracking system
- Document architectural decisions in CLAUDE.md files

---
*Generated: 2024-01-19*
*Review Status: Comprehensive review completed*
*Next Review: After Phase 1 completion*