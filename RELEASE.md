# Release

Use semantic versions. Every release requires clean verify, production readiness, migration review, changelog, signed image digest, backup age check, rollback drill, security/privacy approvals, and manual production approval.

## Current candidate

- Package version: `0.1.0`
- Release state: engineering candidate only; not staged, released, or deployed
- Latest genuine green tag: `green/EP-009`
- Local image digests: API `sha256:3b4eddb708947222a182bbb951494d5055bc81d18d570b274739132075311793`; web `sha256:51abfab7a521ec0c654dff8472c097049ad49dbe51ab92e4072422b5cec67b01`; worker `sha256:9e5eac162883c3e8d23cdc03e8c1099d2e33996683175dbc453f63189ee3fb10`
- Local gates: `verify: ok`, `container rehearsal: ok`, `kubernetes baseline: ok`, `runtime dependencies: ok`, `backup: ok`, `restore drill: ok`
- Continuity candidate: owner-controlled optional monitor, global kill switch, digital release, and Lob/PostGrid postal adapters pass local/contract gates; external provider live delivery is not credited
- Ship gate: reran all local gates, then failed closed because `NODE_ENV` is not production; no production evidence or mutation was credited

Do not create a semantic release tag or publish these local images. The operator reports completed counsel, vendor/DPA, insurance, and penetration-test reviews, but their immutable release evidence references remain absent. Registry provenance, staging evidence, KMS, production infrastructure, edge configuration, and explicit manual authorization must also exist first.
