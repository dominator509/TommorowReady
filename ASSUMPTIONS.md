# Assumptions

| Assumption | Reason | Risk if wrong | Verification | Blocks implementation |
|---|---|---|---|---|
| US-first direct-to-consumer launch | User market and legal scope are otherwise unknown | Policies and workflows may require jurisdiction changes | Counsel reviews legal matrix before production | No |
| Production deployment is manual | No explicit authorization was supplied | Irreversible external release | Read `AUTO_DEPLOY_AUTHORIZED` and DEPLOYMENT.md | No |
| Calendar write integrations are optional at launch | Avoid provider credential dependency | Lower convenience | Product owner decision recorded through ADR | No |
| Consequential actions begin with email, postal mail, and supported sandbox APIs | Broad account automation is unsafe | Reduced initial coverage | Vendor and threat-model review | No |
| Native auth is required | Avoid OAuth dependency and support older users | More auth responsibility | Security tests and external review | No |
| No bank credential storage | High risk and unnecessary for MVP | Some automation unavailable | Search SECURITY.md and schema | No |
| DeepSeek is optional and replaceable | Vendor controversy and availability risk | Reduced AI capability when disabled | Provider-failure live-fire | No |
| Legal text remains draft until counsel approves | No counsel record supplied | Liability and unenforceability | `LEGAL_APPROVAL_RECORD` | Yes for production only |
