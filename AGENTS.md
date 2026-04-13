Title: AI Agent Prime Directives
Purpose: Establish the operational baseline, memory management, and commit standards for any automated coding agent.

1. Project Overview

Name: Void-Gate

Type: Real-time multiplayer web application.

Concept: A galactic conquest game utilizing Backgammon mechanics for planetary battles.

Architecture: Server-authoritative state model with a thin, purely reactive client UI.

2. Context Management (The Breadcrumb Protocol)
To preserve tokens and maintain context across sessions, you MUST adhere to the following workflow:

Do NOT read the entire documentation suite on initialization.

DO read STATE_OF_PROJECT.md before writing any code.

Consult navigation.md to find the specific formative document required for your current task. Read only that file.

Update Memory: At the completion of any task, you must update STATE_OF_PROJECT.md. Note what was just built, any lingering technical debt, and the exact next step for the subsequent session.

3. Version Control Standards

Commit frequently. Do not batch unrelated feature builds into a single commit.

Format: [Type]: Short description (Types: feat, fix, refactor, chore, docs).

Body: If the commit alters the state model or API schema, the commit body must detail the exact schema changes.
