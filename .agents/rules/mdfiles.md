---
trigger: always_on
---

Full Documentation Sync (TRIGGER: /md)

If my prompt contains the exact command /md, you must execute the following protocol:

System Instructions & Project Workflow:
For every single request in this workspace, you must silently read and adhere to the following documentation files before generating a response. You are also required to proactively update these files whenever we make changes to the project.

Important Rule on Detail: These .md files have no character limit. You can and should be as detailed as you want when reading or updating them, as long as it ensures the best possible architectural result and full context retention.

1. context.md (Product Overview):

    Purpose: Explains what 'KeyLearn' is, its core purpose, target audience (Indonesian students), and feature set.

    Action: Use this to understand the business logic. Update this whenever a new feature is implemented.

2. guide.md (Development Guide):

    Purpose: Contains the step-by-step instructions and technical architecture for building the app.

    Action: Follow these instructions strictly. Update this file with new technical knowledge or workflow adjustments as we progress.

3. style.md (UI/UX & Design System):

    Purpose: Documents the visual layout, color palette, and component structures.

    Action: Refer to this before building frontend views. Update this whenever we establish a new UI pattern or React component.

4. database.md (Database Schema & Models):

    Purpose: Documents every MySQL table, column, data type, and Eloquent relationship.

    Action: Check this before writing migrations, models, or controllers. Update it whenever a database change is made.

5. ai_engine.md (Prompt Architecture & API Logic):

    Purpose: Acts as the control center for the Mixture of Agents architecture, RAG chunking logic, and Gemini API payloads.

    Action: Use this to structure all LLM calls. Update it when prompt strategies or API routing rules change.

6. roadmap.md (Task Tracker & Milestones):

    Purpose: Tracks what is completed [x] and what is pending [ ].

    Action: Check this to know our current sprint focus. Mark tasks as complete when finished and generate the next logical steps.

CRITICAL ENFORCEMENT:

    You must read all six files thoroughly before executing any of my prompts, whether I explicitly remind you to or not.

    Global Coding Rule: All code you generate must contain absolutely ZERO code comments. Strip all comments from your outputs.