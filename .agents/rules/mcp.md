---
trigger: always_on
---

System Instructions & Project Workflow (Dual-Mode Operation):
To optimize processing and maintain context, you operate in two distinct modes.
GLOBAL RULES (Applies to ALL interactions)

    Zero Code Comments: All code you generate must contain absolutely ZERO code comments. Strip all comments from your outputs entirely.

    Environment Boundary: Do not suggest, configure, or attempt to build for Project IDX. Assume the local development environment is final.

    Framework Strictness: This is a Laravel + React/Inertia.js project. Use Inertia::render() on the backend and Inertia <Link> components on the frontend.

MODE 1: Standard Execution (DEFAULT)

If my prompt does NOT contain the /mcp command, you must act as a fast, lightweight coding assistant.

    Execute the task directly based on the immediate context of our current chat.

    Do not read the .md documentation files.

    Do not evaluate or trigger external MCP tools unless I explicitly ask you to use a specific one.

MODE 2: Deep Context & Tool Execution (TRIGGER: /mcp)

If my prompt contains the exact command /mcp, you must halt standard execution and initialize the full architectural protocol below. There are no character limits for reading, writing, or reasoning in this mode.

Phase 1: Context Retrieval (The Documentation)
You must silently read and adhere to these files. Proactively update them via the filesystem when project changes occur.

    context.md: Explains 'KeyLearn', target audience (Indonesian students), and features. Update when a new feature is conceptualized.

    guide.md: The technical architecture and build instructions. Follow strictly. Update with new technical knowledge.

    style.md: Visual layout, colors, and component structures. Refer to this for frontend views. Update when new UI patterns are established.

    database.md: MySQL tables and Eloquent relationships. Check before writing migrations/models. Update upon database changes.

    ai_engine.md: Logic for the Mixture of Agents, RAG chunking, and Gemini API payloads. Update when routing rules change.

    roadmap.md: Tracks completed [x] and pending [ ] tasks. Check to know the current sprint focus. Update as tasks are finished.

Phase 2: Tool Assessment (The MCPs)
Evaluate if these tools are necessary for the request:

    filesystem: To read, write, create, and modify local project files or .md documentation.

    notebooklm: To query deep-dive research, framework documentation, and MoA architecture notes.

    sequential thinking: To break difficult backend logic (like Multi-LLM routing) into smaller, verifiable steps before writing code.

    tavily: To search the live web. CRITICAL LIMIT RULE: Tavily has a strict limit of 1,000 requests/month. If you receive an error indicating the monthly quota is exhausted or rate limits are hit, immediately halt the search and notify me directly.

Phase 3: The Thinking Step
Before writing any code in /mcp mode, you MUST output a brief, internal thought process. Explicitly state which Documentation Files you are checking and which MCPs are beneficial to use for the current task. If an MCP is proven relevant, you must trigger it.