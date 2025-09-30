# Configuration Settings Questionnaire

Please review each topic below and mark the option(s) that best match your expectation for the upcoming settings experience. Unless the prompt explicitly says "choose all that apply," assume a single choice.

## 1. Settings Entry Point (pick one)

- [x ] A single gear icon in the sidebar header opens the settings surface
- [ ] Both a sidebar gear icon and a menu action open the settings surface
- [ ] Keep the existing sidebar layout and open settings from a modal button elsewhere

## 2. Settings Surface Style (pick one)

- [ ] Centered modal dialog (blocks the main content)
- [x ] Right-side drawer that keeps chat visible
- [ ] Dedicated full-page view reachable from the gear icon

## 3. Scope of the First Release (choose all that apply)

- [x ] Permission defaults (edit / bash / webfetch)
- [x ] Model defaults (primary and small model)
- [ ] Connection details (server URL, auth tokens)
- [ ] Logging and diagnostics toggles

## 4. Default Permission Behavior (pick one)

- [x ] Always start with `ask` and let users opt into `allow`/`deny`
- [ ] Mirror whatever the backend is currently using without overrides
- [ ] Start with `deny` for bash/webfetch but `ask` for edit

## 5. Model Selection Rules (pick one)

- [ ] Enforce picking both a primary and a small model before saving
- [ ] Allow primary model only; small model is optional
- [x ] Let users opt out of model selection and keep backend defaults

## 6. Apply & Restart Flow (pick one)

- [ ] Show a confirmation step explaining the restart before saving changes
- [ ] Save immediately and show a toast about the restart in progress
- [ ] Queue changes and apply them the next time the server restarts manually

## 7. Error Recovery Preference (pick one)

- [ ] Roll back to last known good values if an update fails
- [x ] Keep the user edits in the form until they retry
- [ ] Prompt to fall back to application defaults on failure

## 8. Additional Safeguards (choose all that apply)

- [ ] Disable the Apply button while the server is restarting
- [x ] Provide a link to view restart logs directly from the modal
- [ ] Require a confirmation checkbox when escalating permissions to `allow`
- [ ] Prompt before clearing or resetting defaults

## 9. Future Enhancements Priority (choose all that apply)

- [x ] Integrate SDK provider search and filtering for models
- [ ] Surface recent permission changes in an activity feed
- [ ] Add per-project overrides within the same modal
- [ ] Support importing/exporting configuration presets

When finished, please return this file with your selections. Feel free to add clarifying notes inline if none of the choices capture your intent.
