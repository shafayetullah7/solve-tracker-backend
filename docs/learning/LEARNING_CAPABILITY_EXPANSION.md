# Learning capability expansion

Status: proposed scope amendment; user requested comprehensive robust learner workflows. Existing six approved decisions remain binding. This document does not silently supersede LEARNING_REQUIREMENTS.md; reconcile requirements and roadmap after scope review.

## Product direction
Support plan, learn, apply, assess, retain, reflect and improve across subjects. Keep coding practice independently usable, private guides first, no mandatory AI or paid external service. Not an institutional LMS.

## Capability tiers
- Foundation: existing LG-01 through LG-10 and NFRs, recursive guides, rich blocks, assessments, portable import/export, notes, coding integration, dark mode.
- Complete personal learning release: reusable flashcards and question banks; spaced repetition with versioned scheduling policy and review history; study goals and schedules with timezone handling; searchable contextual notes/bookmarks; cross-guide references with ownership and broken-link handling; practical assignments with text/file/link evidence and rubric/self-review; separate completion, mastery and retention analytics. These are proposed additions, not yet implemented or approved release gates.
- Later extensions: isolated executable code, declarative simulations, optional AI assistance, public publishing/forking. No arbitrary scripts or unsafe embeds; execution requires separate threat model and resource isolation. Collaboration and institutional LMS remain out of scope.

## Architectural requirements for Phase 2
Stable identities for guides, steps, blocks, activities and reusable items; separate authored content, learner state, evidence and immutable attempt/review history. Version grading, scheduling and block schemas. Define reuse versus copy semantics and revision compatibility; preserve history on edits and deletion according to retention policy. Avoid generic EAV or speculative microservices. Use typed validated blocks for presentation and relational records for queryable activities. Plan extension points without implementing all future services. Explicit ownership on all references and private assets; bounded workloads, idempotent writes, atomic imports, concurrency checks, recoverable drafts, accessibility, portable export and migration tests.

## Acceptance scenarios
- Language learner studies text/audio, creates cards, reviews due cards and takes a test.
- Engineering learner reads equations/code/diagrams, records a hardware experiment and attaches evidence.
- Exam learner builds reusable question banks, practices weak topics and reviews attempts.
- Programmer links existing coding problems without duplicating library entries.
- Learner moves or edits a subtree without losing unrelated notes, attempts or evidence; changed requirements visibly affect completion.
- Interrupted editing, concurrent tabs, invalid imports, missing resources, cross-account IDs and deleted references recover safely or fail explicitly.
- No fabricated mastery score: distinguish self-report, assessed evidence and retention estimates.

## Open decisions
Release sequencing, scheduling algorithm, question bank revision semantics, file quotas/private delivery, goal/calendar semantics, evidence rubric, operational budgets and recovery retention. Reconcile with existing deferred scope before architecture lock. Runtime baseline and tests remain pending.
