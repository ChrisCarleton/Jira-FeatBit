# QA Test Script — FeatBit Jira Integration

**Scope:** Manual end-to-end testing of the Forge Custom UI  
**Prerequisites:** A running FeatBit instance, a Jira Cloud site with the app installed, and at least one project in FeatBit with two or more environments.

---

## Test environment setup

| Item                      | Value                                                    |
| ------------------------- | -------------------------------------------------------- |
| Jira site                 | _(your site URL)_                                        |
| FeatBit API URL           | _(e.g. `http://localhost:5000`)_                         |
| FeatBit Portal URL        | _(e.g. `http://localhost:8081`, optional)_               |
| FeatBit access token      | _(service token with flag + project + env permissions)_  |
| Test Jira issue           | _(e.g. `PROJ-1` — a story or task)_                      |
| Test Jira epic            | _(e.g. `PROJ-10` — used for epic tag inheritance tests)_ |
| Slack bot token + channel | _(optional, for Slack notification tests)_               |

---

## 1. Settings page

Navigate to **Apps → FeatBit Settings** in Jira.

### 1.1 Initial unconfigured state

| #   | Steps                                                       | Expected result                                                         |
| --- | ----------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | Open the Settings page for the first time (no config saved) | Page loads with empty API URL, empty token fields, no environment table |

### 1.2 Input validation — Fetch

| #   | Steps                                                              | Expected result                                                     |
| --- | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| 2   | Leave API URL blank, click **Test connection & load environments** | Error: "Enter both the API URL and access token first."             |
| 3   | Enter API URL only (no token), click **Test connection**           | Same error                                                          |
| 4   | Enter API URL + wrong access token, click **Test connection**      | Error message from FeatBit (e.g. "Unauthorized" or "Invalid token") |

### 1.3 Successful connection

| #   | Steps                                                                      | Expected result                                                                                                   |
| --- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 5   | Enter correct API URL and access token, click **Test connection**          | Button shows "Loading…" while in flight                                                                           |
| 6   | _(after step 5 resolves)_                                                  | Success toast: "Connection successful — N environments loaded." Environments table appears showing matching count |
| 7   | Verify the table columns: **Display Name**, **Key**, **ID**, **Read-only** | All four columns present; env names, keys, and IDs match FeatBit                                                  |

### 1.4 Environment table editing

| #   | Steps                                                                                      | Expected result                                 |
| --- | ------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| 8   | Change the display name of an environment (edit the text input in the Display Name column) | Field accepts input; old name replaced          |
| 9   | Check the **Read-only** checkbox on one environment                                        | Checkbox checked; state is retained when saving |
| 10  | Check one checkbox, save, reload Settings                                                  | Checkbox is still checked on reload             |

### 1.5 Multi-project display

| #   | Steps                                                           | Expected result                                                                              |
| --- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 11  | If FeatBit has environments belonging to two different projects | Environment table shows a bold project-name group row separating each project's environments |

### 1.6 Default environment

| #   | Steps                                                                 | Expected result                                                                                            |
| --- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 12  | After loading environments, open the **Default Environment** dropdown | Dropdown shows "— All environments —", "— None (disable flag creation) —", and all discovered environments |
| 13  | Select a specific environment, save, reload Settings                  | The same environment is selected on reload                                                                 |
| 14  | Select **None**, save                                                 | The **+ Create flag** button is hidden on the Issue Panel (test in section 3)                              |

### 1.7 Portal URL

| #   | Steps                                                      | Expected result                                                |
| --- | ---------------------------------------------------------- | -------------------------------------------------------------- |
| 15  | Enter a Portal URL, save, reload Settings                  | Portal URL preserved on reload                                 |
| 16  | _(with Portal URL saved)_ Open any issue with linked flags | Flag names in the panel are clickable links                    |
| 17  | Click a flag name link                                     | FeatBit portal opens in a new tab at the flag's targeting page |

### 1.8 Input validation — Save

| #   | Steps                                            | Expected result               |
| --- | ------------------------------------------------ | ----------------------------- |
| 18  | Clear the API URL field, click **Save settings** | Error: "API URL is required." |

### 1.9 Successful save

| #   | Steps                                                                 | Expected result                                                                                      |
| --- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 19  | Enter valid URL, token, environments fetched; click **Save settings** | Button shows "Saving…" while in flight, then success toast: "Settings saved successfully."           |
| 20  | Reload Settings page                                                  | All saved values are pre-filled; token field shows placeholder "(token saved – leave blank to keep)" |
| 21  | Leave token field blank, save again                                   | Old token is retained (placeholder confirms; no loss of connectivity)                                |

### 1.10 Slack configuration (optional)

| #   | Steps                                                   | Expected result                                                                       |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 22  | Enter a Slack bot token and channel ID, save            | Settings saved; bot token field shows "(token saved – leave blank to keep)" on reload |
| 23  | Leave both Slack fields blank, save                     | Slack notifications disabled (no messages sent on flag actions)                       |
| 24  | _(Slack configured)_ Create a flag from the issue panel | Slack message posted to the configured channel within a few seconds                   |
| 25  | _(Slack configured)_ Toggle a flag from the issue panel | Slack message posted to the configured channel                                        |

---

## 2. Issue panel — initial load states

Open a Jira issue (e.g. `PROJ-1`) that has the FeatBit panel.

### 2.1 Not configured

| #   | Steps                                          | Expected result                                                                                                             |
| --- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 26  | Open any issue before Settings have been saved | Panel shows: "FeatBit is not configured. **Open the FeatBit Settings global page** to enter your API URL and access token." |

### 2.2 Loading state

| #   | Steps                                                              | Expected result                                                     |
| --- | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| 27  | Open an issue while on a slow connection (or throttle in DevTools) | Panel briefly shows "Loading flags…" before rendering the flag list |

### 2.3 No flags linked yet

| #   | Steps                                           | Expected result                                                                                                             |
| --- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 28  | Open an issue with no flags tagged with its key | Panel shows "0 flags linked to PROJ-1" and the empty-state message: "No feature flags linked to PROJ-1 yet." with hint text |

### 2.4 API error (misconfigured)

| #   | Steps                                              | Expected result                     |
| --- | -------------------------------------------------- | ----------------------------------- |
| 29  | Save an invalid API URL in Settings, open an issue | Panel shows an error message in red |

---

## 3. Issue panel — flag table

Ensure at least one flag exists in FeatBit tagged with the test issue key before starting this section.

### 3.1 Flag table display

| #   | Steps                                                                             | Expected result                                                                           |
| --- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 30  | Open the issue                                                                    | Flag count label reads "N flag(s) linked to PROJ-1" (singular/plural correct)             |
| 31  | Inspect the table                                                                 | One column per configured environment; flag name and key (`code` style) displayed per row |
| 32  | Flag enabled in one environment, disabled in another                              | Correct "Enabled" (green) / "Disabled" (grey) badges shown per cell                       |
| 33  | Flag not present in a given environment                                           | Cell shows "N/A" (no toggle button)                                                       |
| 34  | _(multiple projects)_ Two environments from different FeatBit projects configured | Project-name group headers appear above the environment columns                           |

### 3.2 Flag name link (requires Portal URL)

| #   | Steps                           | Expected result                                                   |
| --- | ------------------------------- | ----------------------------------------------------------------- |
| 35  | Settings has a Portal URL saved | Flag names render as blue underlined links                        |
| 36  | Click a flag name link          | FeatBit portal opens in a new tab; URL path contains the flag key |

### 3.3 Toggle flag on/off

| #   | Steps                                                          | Expected result                                                                                                |
| --- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 37  | Click an **Enabled** badge                                     | Badge immediately updates to **Disabled** (optimistic), a spinner appears briefly, then the state is confirmed |
| 38  | Click a **Disabled** badge                                     | Reverse of above                                                                                               |
| 39  | Verify in FeatBit                                              | Flag state in FeatBit matches what the panel shows                                                             |
| 40  | Click a badge that is already toggling (rapid double-click)    | Second click is ignored (button disabled while in flight)                                                      |
| 41  | Mark an environment as Read-only in Settings, reload the issue | Cell shows the status as a plain non-clickable badge with tooltip "Read-only environment"; no toggle button    |

### 3.4 Toggle failure

| #   | Steps                                   | Expected result                                                                               |
| --- | --------------------------------------- | --------------------------------------------------------------------------------------------- |
| 42  | Disconnect FeatBit, then click a toggle | Panel shows a toast error message; flag state reverts to its pre-toggle value (data reloaded) |

### 3.5 Create flag disabled via Default Environment = None

| #   | Steps                                                             | Expected result                                                               |
| --- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 43  | Set Default Environment to "None" in Settings, save, reopen issue | **+ Create flag** button is absent; "Link existing flag" button still present |

---

## 4. Create flag modal

Click **+ Create flag** on any issue panel.

### 4.1 Modal structure

| #   | Steps                            | Expected result                                                                                                                                                                                        |
| --- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 44  | Open modal                       | Title "Create feature flag", body text shows the current issue key in bold, fields: Flag name, Flag key, Description (optional), "Create ticket to retire flag" checkbox, Cancel + Create flag buttons |
| 45  | Check name input is auto-focused | Cursor placed in the Flag name field without clicking                                                                                                                                                  |

### 4.2 Auto-key generation

| #   | Steps                                                             | Expected result                                                                                                |
| --- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 46  | Type "My New Feature" in Flag name                                | Flag key auto-fills as `my-new-feature`                                                                        |
| 47  | Type with spaces and special characters, e.g. "Hello! World (v2)" | Key becomes `hello-world-v2` (lowercased, non-alphanumeric chars collapsed to `-`, no leading/trailing dashes) |

### 4.3 Manual key override

| #   | Steps                                            | Expected result                                         |
| --- | ------------------------------------------------ | ------------------------------------------------------- |
| 48  | Edit the Flag key field directly                 | Key field accepts the custom value                      |
| 49  | After editing key manually, change the Flag name | Flag key does **not** update (manual edit is locked in) |

### 4.4 Validation

| #   | Steps                                               | Expected result                 |
| --- | --------------------------------------------------- | ------------------------------- |
| 50  | Click **Create flag** with empty name               | Error: "Flag name is required." |
| 51  | Clear the key field manually, click **Create flag** | Error: "Flag key is required."  |

### 4.5 Successful creation

| #   | Steps                                                      | Expected result                                                                                                |
| --- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 52  | Fill in name + optional description, click **Create flag** | Button shows "Creating…" while in flight                                                                       |
| 53  | _(after creation resolves)_                                | Modal closes; panel reloads; new flag appears in the table; success toast "Feature flag created successfully." |
| 54  | Open FeatBit                                               | Flag exists in all configured environments, tagged with the issue key                                          |
| 55  | Open the Jira issue                                        | A Jira comment was posted: "Feature flag '...' (...) was created by [actor] via the FeatBit-Jira integration." |

### 4.6 "Create ticket to retire flag" checkbox

| #   | Steps                                                                | Expected result                                                                                                                    |
| --- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 56  | Check "Create ticket to retire flag" before clicking **Create flag** | _(after creation)_ A new Jira task "Retire [flag-key] feature flag" is created in the same project and linked to the current issue |
| 57  | Leave checkbox unchecked                                             | No retire ticket created                                                                                                           |

### 4.7 Partial / full failure

| #   | Steps                                                                   | Expected result                                                  |
| --- | ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 58  | Disconnect one FeatBit environment (or use an env with a duplicate key) | Modal shows per-environment failure details; does not close      |
| 59  | All environments fail                                                   | Modal shows error; does not close; flag does not appear in panel |

### 4.8 Dismiss

| #   | Steps                                    | Expected result                                   |
| --- | ---------------------------------------- | ------------------------------------------------- |
| 60  | Click **Cancel**                         | Modal closes; no flag created                     |
| 61  | Press **Escape**                         | Modal closes                                      |
| 62  | Click the dark overlay outside the modal | Modal closes                                      |
| 63  | Press **Enter** with a valid flag name   | Form submits (equivalent to clicking Create flag) |

---

## 5. Link existing flag modal

Click **Link existing flag** on the issue panel.

### 5.1 Modal structure

| #   | Steps                        | Expected result                                                                                                                                                                                             |
| --- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 64  | Open modal                   | Title "Link existing flag", hint text showing the current issue key, search input, Search button, empty result list area with "Enter a search term above.", Cancel + Link flag buttons (Link flag disabled) |
| 65  | Search input is auto-focused | Cursor placed in search field without clicking                                                                                                                                                              |

### 5.2 Search

| #   | Steps                                                       | Expected result                                                |
| --- | ----------------------------------------------------------- | -------------------------------------------------------------- |
| 66  | Type a query with leading/trailing spaces, click **Search** | API called with trimmed value; spaces stripped                 |
| 67  | Type a partial flag name, click **Search**                  | Matching flags listed with name (bold) and key (`code` style)  |
| 68  | Search returns no results                                   | List area shows "No flags found. Try a different search term." |
| 69  | Search returns an error                                     | Error message displayed in red above the list                  |
| 70  | Press **Enter** in the search field                         | Equivalent to clicking Search                                  |

### 5.3 Selection

| #   | Steps                       | Expected result                                      |
| --- | --------------------------- | ---------------------------------------------------- |
| 71  | Click a flag in the results | Row highlights; **Link flag** button becomes enabled |
| 72  | Click a different flag      | Highlight moves to new selection                     |

### 5.4 Linking

| #   | Steps                                         | Expected result                                                                                   |
| --- | --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 73  | Select a flag, click **Link flag**            | Button shows "Linking…" while in flight                                                           |
| 74  | _(after linking resolves)_                    | Modal closes; panel reloads; flag appears in the table; success toast "Flag linked successfully." |
| 75  | Verify in FeatBit                             | Flag has the issue key added to its tags in all configured environments                           |
| 76  | Link a flag already tagged with the issue key | No duplicate tag added; operation still succeeds                                                  |

### 5.5 Link failure

| #   | Steps                                          | Expected result                                     |
| --- | ---------------------------------------------- | --------------------------------------------------- |
| 77  | All environments fail to link                  | Modal shows error; does not close                   |
| 78  | Some environments succeed, some fail (partial) | Modal closes with success (at least one env linked) |

### 5.6 Dismiss

| #   | Steps                                    | Expected result            |
| --- | ---------------------------------------- | -------------------------- |
| 79  | Click **Cancel**                         | Modal closes; no link made |
| 80  | Press **Escape**                         | Modal closes               |
| 81  | Click the dark overlay outside the modal | Modal closes               |

---

## 6. Epic tag inheritance

| #   | Steps                                                                                | Expected result                                         |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| 82  | Create a flag tagged with an epic key (e.g. `PROJ-10`) in FeatBit                    | —                                                       |
| 83  | Open a child story of that epic in Jira (e.g. `PROJ-11`)                             | Flag tagged with `PROJ-10` appears in the story's panel |
| 84  | The epic key tag flag should not show up on a story from a different epic or project | Panel for an unrelated story does not show it           |

---

## 7. Toast notifications

| #   | Steps                                                     | Expected result                                 |
| --- | --------------------------------------------------------- | ----------------------------------------------- |
| 85  | Trigger a success action (e.g. create flag)               | Toast message appears overlaid on the panel     |
| 86  | Wait ~3.3 seconds without interacting                     | Toast fades out and disappears                  |
| 87  | Trigger a second action before the first toast disappears | Toast resets to the new message; timer restarts |

---

## 8. Responsive / layout

| #   | Steps                                           | Expected result                                               |
| --- | ----------------------------------------------- | ------------------------------------------------------------- |
| 88  | Resize the Jira issue panel to a narrow width   | Flag table scrolls horizontally; no content is clipped        |
| 89  | Open the Create or Link modal on a small screen | Modal is constrained to 90vw; scrollable if content overflows |

---

## Sign-off checklist

| Area                              | Pass | Fail | Notes |
| --------------------------------- | ---- | ---- | ----- |
| Settings — connection & save      |      |      |       |
| Settings — environment management |      |      |       |
| Settings — Slack config           |      |      |       |
| Issue panel — load states         |      |      |       |
| Flag table — display              |      |      |       |
| Flag table — toggle on/off        |      |      |       |
| Create flag — validation          |      |      |       |
| Create flag — success flow        |      |      |       |
| Create flag — retire ticket       |      |      |       |
| Link flag — search & select       |      |      |       |
| Link flag — success flow          |      |      |       |
| Epic tag inheritance              |      |      |       |
| Toast behaviour                   |      |      |       |
| Dismiss / keyboard navigation     |      |      |       |
