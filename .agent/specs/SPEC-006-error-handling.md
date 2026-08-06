# SPEC-006 Error Handling

Errors use stable codes and safe messages. Provider timeout, conflicting verification, failed notification, or uncertain release outcome is never mapped to success. Emergency ambiguity becomes `MANUAL_REVIEW_REQUIRED`.

Retries are bounded and idempotent. User interfaces distinguish retryable technical failure, denied authorization, expired challenge, stale record, recipient mismatch, malware rejection, AI-consent absence, prohibited-secret detection, and manual review.

Logs contain opaque identifiers and safe diagnostics, never packet contents, messages, child details, raw documents, raw AI prompts, or prohibited secrets.
