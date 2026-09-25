# Files and Storage

> Trace: SPEC §13, §38 ("not a Drive clone"), FR-FILE-*, NFR-SEC-10, ADR-0010.

## 1. Upload pipeline

```text
multipart request (streamed, no full buffering)
 → size guard (Content-Length, then counting stream; purpose- and role-specific limit)  → 413 FILE_TOO_LARGE
 → write to temp file in ${ENGLMS_STORAGE_DIR}/tmp while computing SHA-256
 → Apache Tika detect(content + name hint) → media type
 → allow-list check by purpose (table §2)                                            → 415 FILE_TYPE_NOT_ALLOWED
 → atomic move to ${ENGLMS_STORAGE_DIR}/<k0k1>/<k2k3>/<uuid>   (key = random UUIDv4, never user input)
 → insert stored_file(attached_at = NULL) → return {fileId, name, contentType, size}
 → the owning module "attaches" the file when it is referenced (material, question, attachment, response) → attached_at = now
```

Orphans (`attached_at IS NULL` and older than 24 h) are removed hourly (DB row and blob). A blob without a row, found by a weekly reconcile, is logged and removed.

## 2. Allow-list and limits (defaults; configurable in Settings within hard caps)

| Kind | Detected media types | Tutor limit | Student limit |
|---|---|---|---|
| DOCUMENT | application/pdf, DOCX, PPTX, XLSX (OOXML), text/plain | 50 MB | 25 MB |
| IMAGE | image/png, image/jpeg, image/webp, image/gif | 20 MB | 10 MB |
| AUDIO | audio/mpeg, audio/mp4 (m4a/aac), audio/ogg, audio/webm, audio/wav | 100 MB | 50 MB |
| VIDEO | video/mp4, video/webm | 200 MB | 50 MB |
| **Rejected** | text/html, image/svg+xml, application/javascript, executables, archives (zip, rar, 7z), anything else | — | — |

Hard caps (not changeable in the UI): 500 MB per file for the tutor, 100 MB for students. Storage warning at 80% of a configurable quota (A-011).
Legacy DOC and PPT (OLE) are **not** in the MVP allow-list because they are a macro risk. The tutor can convert them to PDF or OOXML (OQ-09 may revisit this).

## 3. Download and streaming

- Endpoints: `/tutor/files/{id}/content` (any file) and `/student/files/{id}/content` (the resolver chain must grant access, otherwise 404).
- `Content-Type` = the stored detected type. `Content-Disposition: inline` for IMAGE, PDF, AUDIO and VIDEO, otherwise `attachment`, with
  `filename*=UTF-8''…` (RFC 6266).
- Headers: `X-Content-Type-Options: nosniff`, `Content-Security-Policy: sandbox`, `Cache-Control: private, max-age=3600` (the files are immutable).
- HTTP Range (`206 Partial Content`) for AUDIO and VIDEO. `ETag` = sha256.

## 4. Access resolution (`FileAccessResolver` SPI)

```java
interface FileAccessResolver { boolean canStudentRead(StudentId me, FileId file); }
```

| Resolver (module) | Grants when |
|---|---|
| `library` | The file belongs to a Material shared with `me` (a `material_share` row exists) |
| `lessons` | The file belongs to a Material attached to one of `me`'s lessons |
| `activities` | The file is an attachment inside a snapshot of `me`'s student activity, **or** `me` uploaded it as a response file, **or** it is a question attachment inside `me`'s snapshot |
| `questions` | (none; question attachments are reachable only through snapshots, which the activities resolver handles) |

Default: deny. New features that reference files **must** add or extend a resolver and an isolation test. The Security checklist item 5 enforces this.

## 5. Not a Drive clone (guardrails)

Not built: arbitrary folders of raw files outside the library, file sharing links, public links, previews of Office documents (the browser downloads them),
file version history (P2 "better file management"), sync clients or desktop integration.

## 6. Backup coverage

The storage directory is a named volume (`englms-files`), archived nightly together with the DB dump (runbooks.md). Blobs are immutable. Restore = volume
restore + DB restore from the same backup set, followed by the reconcile job.
