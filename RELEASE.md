# Release

Use semantic versions. Every release requires clean verify, production readiness, migration review, changelog, signed image digest, backup age check, rollback drill, security/privacy approvals, and manual production approval.

## Current candidate

- Package version: `0.1.0`
- Release state: engineering candidate only; not staged, released, or deployed
- Latest genuine green tag: `green/EP-009`
- Local image digests: API `sha256:a02406d473db46b90d89f6d45d887ea071b036451eae0d96f7f77116fa7dcfdc`; web `sha256:40379c2e3ab55fe0184d5087b7b51acc7f7aea2a55b2c13fe0488d9577467295`; worker `sha256:9f9385ee3e48afeea7b0185c9087eb10550bde306161624155bc615e6ba24866`
- Local gates: `verify: ok`, `container rehearsal: ok`, `backup: ok`, `restore drill: ok`
- Ship gate: failed closed on missing qualified-counsel evidence

Do not create a semantic release tag or publish these local images. Registry provenance, staging evidence, security/privacy approvals, KMS, production infrastructure, and manual authorization must exist first.
