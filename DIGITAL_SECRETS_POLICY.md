# Digital Secrets and Account Locator Policy

TomorrowReady is not a password manager and does not collect or store raw passwords, PINs, recovery codes, seed phrases, private keys, safe combinations, or full payment-card data.

The product stores account inventory and locator instructions, such as provider, account purpose, last four digits where appropriate, owner, beneficiary-review status, adviser contact, document location, and the name of the external password-manager entry. Prohibited-secret scanning runs on structured fields, free text, uploads selected for AI processing, and generated packets.

When a prohibited secret is detected, the system blocks the save or outbound AI request, explains the safer locator pattern, and records only privacy-safe security telemetry. No secret value is written to logs or analytics. A future zero-knowledge secret vault requires a separate security architecture, threat model, independent audit, and product approval.
