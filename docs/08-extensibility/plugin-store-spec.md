# Plugin Store Specification (Internal Extension Registry)

> Status: Baseline v1.0 · Interpretation per A-016 (**pending PO confirmation, OQ-08**) · Trace: PO goal ("plugin-store specification"), SPEC §17
> ("can be extended later"), §33 (generic engine), §40.5 (progressive complexity), §5.3/§45 (no marketplace) · ADR-0009.

## 1. What it is, and what it is not

**It is** a *build-time* registry and catalogue of **extensions**: self-contained implementations of well-defined **extension points** that ship inside
the application. Examples are question types, material kinds and embed providers, and metric value types. The "store" is the **catalogue in Settings**, where the tutor sees
the installed extensions and enables or disables them. Disabling one hides its clutter without deleting data (SPEC §40.5).

**It is not:** a marketplace (SPEC §5.3, §45), a way to download or run third-party code at runtime, a paid add-on system, a public API for
outside developers, or a path to sneak excluded scope in (AI, payments, chat, …). An extension that would implement excluded scope is rejected
by the scope guardrail (scope.md §6), whatever its packaging.

## 2. Concepts

| Term | Definition |
|---|---|
| Extension point | A Java interface (backend) plus a TypeScript contract (frontend) owned by one module, e.g. `QuestionTypeHandler` in `questions` |
| Extension | An implementation of one extension point, with a manifest. Backend: a Spring bean. Frontend: a registry entry |
| Manifest | `{id, version, extensionPoint, displayNameKey, descriptionKey, capabilities[], contentSchemaVersion, requires[], defaultEnabled, core}` |
| Extension ID | `<namespace>.<name>`, lowercase kebab: `core.single-choice`, `core.embed-youtube`. Namespace `core` = shipped by this project |
| Catalogue | The list of all registered extensions with their state (`extension_state` table) |

## 3. Registry mechanics (`shared.extension`)

```java
public interface Extension { ExtensionManifest manifest(); }
public interface ExtensionPoint<T extends Extension> { String id(); Class<T> type(); }
@Component class ExtensionRegistry {  // built at startup from all Extension beans
  <T extends Extension> List<T> all(ExtensionPoint<T> p);
  <T extends Extension> Optional<T> enabled(ExtensionPoint<T> p, String id);   // respects extension_state
  <T extends Extension> T require(ExtensionPoint<T> p, String id);             // for existing data: ignores the enabled flag
}
```

Startup validation (fails fast): IDs are unique; the ID format is valid; each manifest version is SemVer; `requires` dependencies are present; `contentSchemaVersion`
and the `upgrade()` chain are consistent; every extension point has ≥ 1 enabled extension where the point demands it (e.g. at least one question type).

## 4. Extension points (MVP)

### 4.1 `questions.QuestionTypeHandler`
Contract: engines.md §1. Capabilities: `AUTO_GRADABLE`, `MANUAL_GRADING`, `FILE_RESPONSE`, `AUDIO_RESPONSE`, `PARTIAL_CREDIT`.
MVP extensions: `core.single-choice`, `core.multiple-choice`, `core.true-false`, `core.fill-blank`, `core.short-answer`, `core.long-answer`,
`core.file-upload`, `core.audio-response`. P2: `core.matching`, `core.ordering`.

### 4.2 `library.MaterialKind` and `library.EmbedProvider`
`MaterialKind`: FILE, RICH_TEXT, LINK, EMBED. These are fixed core kinds modelled as extensions so that their renderers are registered uniformly.
`EmbedProvider { boolean matches(URI); URI canonicalEmbedUrl(URI); String cspFrameOrigin(); }`. MVP: `core.embed-youtube`, `core.embed-vimeo`,
`core.embed-gdrive`, `core.embed-soundcloud`. The CSP `frame-src` is **computed from the enabled providers**.

### 4.3 `goals.MetricValueType`
`NUMBER` and `SCALE` (validation, formatting and progress normalisation). P2 candidates: `BAND` (ordinal labels, e.g. A1–C2), which needs a DEC.

### 4.4 Candidate future points (each requires a DEC and PO approval)
`activities.ResultTransform` (for `recordResultAs`), `notifications.Channel` (P2), `io.QuestionImporter` (CSV/QTI import: REQUIRES PRODUCT DECISION).
**Explicitly out:** any AI-backed extension (SPEC §5.4) until a Future-phase decision.

## 5. Lifecycle of an extension

```text
Proposal (task packet with trace + guardrail answers) → [new extension point? → ADR] → implement backend + frontend parts
→ contract tests (schema, redaction, grading matrix, parity) → registry entry (manifest) → catalogue shows it → release notes
Deprecation: manifest.deprecated=true → hidden for new content; existing content still renders (require() ignores enabled flag)
Removal: only when no data references the ID (migration check), across two releases.
```

## 6. Frontend side and parity

`web/src/extensions/registry.ts` maps IDs to lazy modules `{ Editor, StudentRenderer, Reviewer, Summary }`. A build-time check and the unit test
`extensions-parity` compare this map with the backend manifest list (from the committed `api/extensions.json` fixture, generated like the OpenAPI file).
A backend extension without a frontend counterpart, or the reverse, fails CI (FR-EXT-03).

## 7. Catalogue UI (Settings → Question types and content)

A list grouped by extension point: name, short description, "Used by N items", and an Enabled toggle. Disabling asks for confirmation when N > 0 ("Existing questions
of this type keep working; you just can't create new ones"). Core extensions required by the system (e.g. `core.single-choice`, needed so that at least one
type stays enabled) cannot be disabled. Changes are audited (`SETTINGS_CHANGED`).

## 8. Acceptance criteria (FR-EXT-01..03)

- FR-EXT-01: startup fails with a clear message for a duplicate ID, an invalid manifest or a missing dependency (unit tests with fake extensions). `GET /tutor/extensions` lists every extension with its manifest and state.
- FR-EXT-02: toggling an extension persists it, hides the type from "new question" pickers within one request, keeps existing content rendering and gradable, and writes an audit event.
- FR-EXT-03: the parity check fails the web build when the IDs differ (tested by a deliberately broken fixture in the test suite).

## 9. Relation to agent tooling ("plugins" for the development harness)

Claude Code plugins, skills and MCP servers used by the **development agents** are not product extensions. They are governed in
`docs/09-harness/skills-catalog.md`: only the project skills in `.claude/skills/` are used by default. Installing any third-party agent plugin or MCP server
requires LC + PO approval and a DEC entry (supply-chain risk, R-19).
