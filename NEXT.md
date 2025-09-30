# NEXT.md

## 2025-09-29 — Configuration & Permissions UI Plan

### Snapshot

- Backend already exposes permission CRUD via `ConfigManager`, but the renderer still lacks a first-class configuration surface.
- Session data is aligned with official OpenCode SDK types; configuration types are available but not yet consumed in the renderer.
- The product goal for this cycle is a minimal, reliable UI that lets users review and adjust OpenCode permissions while honoring safe defaults.

### Decisions Locked In (Questionnaire Results)

1. **Data source**: Always fetch the live project configuration when the settings UI opens.
2. **Default posture**: Present `ask` as the starter value for edit/bash/webfetch permissions.
3. **Advanced shapes**: Ignore granular bash pattern maps for now; focus on the simple string form.
4. **Initial scope**: Limit the UI to the three permission toggles.
5. **Error handling**: On failure, fall back to defaults, prompt the user to retry, and surface context for debugging later.
6. **Caching**: No renderer-side cache; every visit re-queries the backend.

### Goals for the Upcoming Implementation

- Provide a discoverable entry point (settings icon) in the sidebar header that opens a focused configuration surface.
- Support both default permissions (basis for new projects) and project-scoped overrides, while keeping the UX simple for this first pass.
- Ensure the renderer consumes SDK-native permission types end-to-end (no more stub drift).
- Ship with guardrails: clear failure states, server restart messaging, and minimal tech debt so future expansion (models, share flags, events) is easy.

### Work Breakdown

#### 1. Main Process Enhancements

- Extend `ConfigProvider` (`src/main/config/ConfigProvider.ts`) with `getDefaultOpencodePermissions()` and `setDefaultOpencodePermissions()` using Electron Store.
- In `src/main/toji/index.ts`, add helpers to surface defaults and apply project updates using existing `ConfigManager` plumbing.
- Update `toji.handlers.ts` with two new IPC handlers:
  - `toji:getDefaultPermissions`
  - `toji:updateDefaultPermissions`
- Ensure permission updates still restart the server and reconnect the client; instrument logs for both default and project flows.

#### 2. Preload Bridge

- Update `src/preload/api/toji.api.ts` and `src/preload/index.d.ts` to expose:
  - `getPermissions()` and `updatePermissions()` (project scope) returning `PermissionConfig`.
  - `getDefaultPermissions()` and `updateDefaultPermissions()` for template editing.
- Re-export `PermissionConfig`, `PermissionLevel`, and `PermissionType` so the renderer consumes the SDK-aligned shapes.

#### 3. Renderer UI & State

- Add an optional `action` slot to `SidebarHeader` to host contextual controls.
- Introduce a `SettingsTrigger` in `ChatViewSidebar` that renders a cog icon and toggles local state.
- Create `PermissionsSettingsModal` (Chakra Modal for v1):
  - Fetch live permissions on open; display skeleton/loading state.
  - Radio groups for edit/bash/webfetch with `allow | ask | deny`, defaulting to `ask` when fallback defaults are in effect.
  - Banner indicating whether the user is editing defaults (no project) or the active project.
  - “Apply” triggers `window.toji.updatePermissions` (or default updater); “Cancel” closes without mutation.
  - On failure, revert view to defaults, close modal only when retry succeeds, and queue a toast with restart guidance.
- Add toasts/snackbars for success, failure, and in-progress server restarts.

#### 4. Type Alignment & Cleanup

- Remove stub permission/session exports from `src/main/toji/types.ts`—renderer should import straight from preload SDK re-exports.
- Audit renderer usage of permission-related types to ensure everything compiles under strict mode.

#### 5. Validation & Tooling

- `npm run lint`
- `npm run typecheck:node`
- `npm run typecheck:web`
- Manual smoke test: open settings modal with and without a project, update permissions, confirm server restart completes.

### Milestones & Sequencing

1. **M1 – Backend defaults ready**: ConfigProvider + IPC endpoints implemented and typechecked.
2. **M2 – Preload bridge exposed**: Renderer has type-safe access to new IPC calls.
3. **M3 – UI scaffolding**: Sidebar action slot, modal shell, loading/error states.
4. **M4 – Happy-path wired**: Applying project updates and defaults works end-to-end with toasts.
5. **M5 – QA & Docs**: Commands green, user guidance captured in README or inline docs as needed.

### Risks & Mitigations

- **Server restart latency**: Communicate restart status via UI and disable double submissions until completion.
- **No-project scenario**: Banner + defaults editing mode prevents ambiguous state.
- **Future expansion pressure**: Keep modal modular (component per section) so adding model toggles or advanced bash patterns later is low friction.

### Deferred for Later Phases

- Streaming OpenCode events into the renderer.
- Advanced permission pattern editing / read-only warning UI.
- Broader configuration management (models, autoupdate, share toggles).
- Persisting renderer-side cache or offline snapshots.
