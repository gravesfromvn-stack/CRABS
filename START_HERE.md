# Start here

Cua owns CRABS and decides business priorities and acceptance. Travis is the user's name for the assistant working in Codex. Claude Chat is the independent analyst/reviewer; it is not a separate deployed CRM agent.

## Read in this order

1. CURRENT_STATE.md: what exists, evidence and limits.
2. DECISIONS.md: decisions already made by Cua.
3. BACKLOG_V1.md: proposed next work, dependencies and acceptance.
4. REVIEW_PACKET.md: the exact scope and source version for the current review.
5. Relevant app/, lib/, db/ and tests/ files.
6. docs/DEVELOPMENT.md before running commands.

For this initial handoff, the assigned work is READ-ONLY AUDIT AND PLANNING. Do not implement backlog items, run production migrations, approve drafts, send guests messages or publish a deployment unless Cua assigns that action in a subsequent task.

## Evidence vocabulary

- Code exists: read and cite the implementing file.
- Tested: a named command actually ran, with date/environment/result.
- Deployed: a hosting result ties a release to a source commit.
- Operationally accepted: an end-to-end hotel workflow passed user acceptance.

These labels are not interchangeable. A document saying “not verified” does not mean the feature does not exist.

## Version alignment

Original application source: branch main, commit 450d7c96c467f3fb8464639110ae0a5d4fa22ca9.
GitHub's initial snapshot has a different commit because this handoff adds documents and excludes generated compiler state. SOURCE_MANIFEST.json records original-file hashes and mapping.

Claude Chat's GitHub knowledge sync reads selected branch files. It does not independently provide Git history, PR discussions or the running database. Always state which files you can see; treat version/prod claims in this handoff as supplied evidence until independently verified.

## Vocabulary

Inbox = conversation and messages.
Guest/customer = person; a repeat stay is not a new identity by default.
Reservation/stay = hotel room booking.
Service order = tour/transfer/other service sale.
Quote approved = internal approval only.
Guest accepted, supplier confirmed, paid and completed are distinct events.

Never auto-merge guests by name or shared phone. Never move an OTA guest into an anonymized demo profile.
