# CRABS

Hotel Sales and Guest Operations for Luxe Paradise. CRABS was previously named TourFlow; the current Sites URL still uses the old name.

Start with [START_HERE.md](START_HERE.md), then [CURRENT_STATE.md](CURRENT_STATE.md).

This repository packages the application source at upstream Sites commit `450d7c96c467f3fb8464639110ae0a5d4fa22ca9` and the collaboration handoff prepared on 18 October 2026 (Asia/Ho_Chi_Minh). This initial GitHub history starts from a reviewed snapshot. It does not include the old local Git history, runtime database or customer emails.

## Read next

- [Current implementation and evidence](CURRENT_STATE.md)
- [Product decisions and vocabulary](DECISIONS.md)
- [V1 backlog and acceptance criteria](BACKLOG_V1.md)
- [Review packet](REVIEW_PACKET.md)
- [Development and test instructions](docs/DEVELOPMENT.md)
- [Local setup on Windows ARM / VS Code](docs/LOCAL_SETUP.md)
- [Drafts from approved templates](docs/AUTO_DRAFTS.md)
- [Integrated local build (Claude + Travis)](docs/INTEGRATED_LOCAL.md)
- [Working with Claude Chat and Codex](docs/COLLABORATION.md)
- [Product vision and handoff scope](docs/VISION.md)
- [Original chronological README](docs/history/README-sites-450d7c9.md)
- [Historical validation record](VALIDATION.md)

## Current product boundary

Live OTA emails arrive through Make. CRABS suggests drafts for human review; staff copy approved text into the OTA and explicitly record a manual send. Direct OTA sending and Hotel Link integration are not implemented.

The separate Sales, Reception and Quotes workspace still uses demo/anonymized source records. It is not yet a complete live sales-to-fulfillment system. Do not treat demo prices as approved offers or quote approval as guest acceptance, supplier confirmation or payment.

## Deployment

Production currently runs on OpenAI Sites with Cloudflare Workers and D1. Publishing this repository on GitHub does not publish the app, migrate its database or move its hosting. The existing `.openai/hosting.json` is retained as source configuration; preserve the current Site project and its private audience.

No deployment workflow is enabled in this handoff.
