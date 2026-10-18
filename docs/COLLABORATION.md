# GitHub collaboration with Claude Chat and Codex

## Current operating model

Cua decides business policy, priority and acceptance. Travis/Codex implements an explicitly assigned issue on its own branch and records tests. Claude Chat reviews selected source files and evidence, then returns findings in chat. Cua relays findings or authorizes their transfer into shared documents. No automatic cross-chat messaging is configured.

GitHub is the shared source/document record, not a copy of both assistants' conversation memory. Production data remains in the CRM database. The current Sites hosting is retained.

## Connect Claude Chat

In the Claude Project knowledge area, choose + -> GitHub, select the private CRABS repository and the relevant branch/files. Grant access only to the repository needed. Select these handoff Markdown files plus the relevant app/, lib/, db/, drizzle/ and tests/ files, package.json and package-lock.json. Binary branding assets are not needed for a code review.

Use Sync before each review and after significant changes. The integration reads file names/content from a branch, not PR history or commit metadata. Provide REVIEW_PACKET.md and a diff as files when reviewing changes. Do not say Claude has inspected a PR merely because it can read files.

Official guidance:
https://support.claude.com/en/articles/10167454-use-the-github-integration

## Work on a change

1. Define one small issue, its acceptance criteria and implementer.
2. Start from the agreed main revision; use a separate branch.
3. Implement and test in an isolated environment.
4. Open a pull request with evidence and update the review packet.
5. Sync that branch's relevant files into Claude Chat. Ask for a read-only review.
6. Address validated findings and rerun affected checks.
7. Cua accepts the business behavior. An authorized maintainer merges and separately deploys.
8. Record the merged/deployed source revision and remaining gaps.

A normal GitHub review workflow is described at:
https://docs.github.com/en/get-started/using-github/github-flow

## Claude Project instruction to copy

You are the independent reviewer for CRABS. Cua is product owner; Travis is the assistant in Codex who has implemented the existing app. Read START_HERE.md, CURRENT_STATE.md, DECISIONS.md and REVIEW_PACKET.md before reviewing relevant source. Do not rebuild existing modules because the older DOCX marked them unverified. Distinguish code evidence, executed tests, deployment evidence and business acceptance. Cite paths and lines. Do not claim access to runtime data, Git history or PR discussions unless actually available. Initial task: read-only audit and V1 plan, no code changes or live operations.

## Publication and access

Keep the repository private. Review app access grants in the account's normal authorization UI. Do not publish raw guest data or credentials. Do not enable unattended AI review, GitHub Actions secrets or deployments as a side effect of connecting the repository.
