# Webhook authentication release gate

Candidate only. No production deployment or credential rotation has been performed.

## Configuration before an approved release

- Set `AI_BEARER_TOKEN`, `META_VERIFY_TOKEN`, `META_APP_SECRET`, and `FB_PAGE_ACCESS_TOKEN` in the service secret store. All must be at least 32 characters. There are no source-code fallbacks.
- `META_APP_SECRET` must be the matching Meta application's app secret, not its verification token. Meta signs POST request bytes with that app secret in `X-Hub-Signature-256`.
- Coordinate replacement of any previously published AI bearer/verification credentials with the receiving API and Meta webhook configuration. Repository removal alone cannot revoke copied credentials or remove old Git history.
- Verify actual deployment identity, tracked branch, enabled public features, caller identity, and provider API support before release. The existing Graph API version is unchanged by this patch and needs separate lifecycle verification.
- Use `npm ci` for the committed dependency lockfile, then `npm test`. No live messages are sent by the test suite. Tests use synthetic credentials and empty event lists on loopback.

## Changes and checks

POST signatures are checked over exact raw JSON bytes before parsing/processing. Missing, malformed, wrong-key or tampered signatures fail. Non-JSON POST requests fail. Route case and trailing-slash variants cannot bypass the verification. Payload size remains capped at 100 KB. No message text, sender IDs, response data, errors or credential values are logged by application handlers. Messenger authorization uses a header rather than a URL query parameter.

This does not provide replay deduplication, queue durability, global rate limiting or comprehensive AI prompt-injection protection. Those pre-existing concerns are not declared resolved. Valid signed delivery and replies need controlled provider staging verification after identities are available, without contacting customers.

## Deployment and rollback

Obtain explicit production approval. Before deployment, save the current deployed image/revision and configuration names without copying secret values into tickets. Configure receiver and sender credentials through the approved rotation procedure, then deploy the candidate and verify synthetic authorized/unauthorized requests. Watch status-only error metrics.

Do not roll back to a version containing exposed hardcoded credentials or unsigned POST processing. If delivery breaks, retain signature enforcement and restore the last authenticated candidate/configuration; keep messages queued/retriable where provider support exists. An emergency service pause or credential rollback requires owner approval. Document exact provider retry behavior before rollout.
