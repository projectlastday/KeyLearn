# AI Engine & Prompt Architecture

## 1. RAG (Retrieval-Augmented Generation) Pipeline

### Ingestion & Chunking
*   **Parser:** PDF text must be extracted cleanly, preserving paragraphs and structural logic where possible.
*   **Chunk Size:** Approximately 500-1000 tokens per chunk.
*   **Overlap:** 10-15% overlap between chunks to ensure context isn't lost at the boundaries.
*   **Embedding Model:** (To be decided, e.g., text-embedding-ada-002 or an open-source alternative).

### Retrieval Logic
*   When a user asks a question in a workspace, the system embeds the query and retrieves the Top-K (e.g., top 5) most relevant document chunks from that specific `workspace_id`.
*   These chunks are injected into the System Prompt.

## 2. Mixture of Agents (MoA) / Consensus Mode

When "Consensus Mode" is toggled ON, the architecture shifts from a single LLM call to a robust, multi-step pipeline.

### Step 1: The Proposers
The retrieved RAG chunks and the user's query are sent asynchronously to 3-4 different LLM models (e.g., Gemini 2.5 Flash, Claude Haiku, GPT-4o-mini).
*   **Objective:** Generate diverse perspectives and analyses based purely on the provided context.

### Step 2: The Aggregator (Master Node)
The responses from all Proposers are gathered and sent to a highly capable reasoning model (e.g., Gemini 2.5 Flash or GPT-4o).
*   **Aggregator Prompt Logic:**
    1.  Read the User Query.
    2.  Read the Original Document Context.
    3.  Review Proposer Answer 1, Proposer Answer 2, Proposer Answer 3.
    4.  Identify factual contradictions among the proposers.
    5.  Synthesize the most accurate information.
    6.  Output a final, incredibly accurate, hallucination-free response.
    7.  **CRITICAL:** The final output MUST be in fluent Bahasa Indonesia.

## 3. Conversational Memory (Multi-Turn Context)

The `MessageController` implements a sliding-window conversation history strategy:
*   **Window Size:** Last 20 messages from the active `ChatSession` (ordered by `created_at ASC`).
### Messaging Payload & Model Support
The system actively supports multiple AI providers for standard chat:
*   **Google Gemini (`gemini-2.5-flash`)**: The default engine. Uses Google's specific payload format (`contents`, `parts`, `role: model/user`).
*   **OpenRouter / Groq**: External models. The controller dynamically formats the exact same database history into standard OpenAI-compatible `messages` arrays (`role: assistant/user`).
*   **Conversational Memory Payload:** Previous messages are prepended to the payload before the current user message, forming a proper multi-turn conversation that the chosen AI processes with full context.
*   **File Attachments:** If the current message includes an uploaded PDF (`inline_data`), it is appended to the current turn's payload (currently supported primarily via Gemini). Previous messages do not re-send attachments.
*   **Fallback:** If no text message is provided but a file is uploaded, a default Indonesian prompt is injected: "Ringkas isi dokumen PDF ini dalam Bahasa Indonesia dan jelaskan poin terpentingnya."

## 4. Persona Prompts
System prompts injected before the RAG context based on user toggles:
*   **Jelaskan dengan sederhana (ELI5):** "Gunakan analogi yang mudah dipahami. Hindari jargon akademis yang terlalu rumit. Jelaskan seolah-olah Anda berbicara dengan murid SMA."
*   **Tutor Socrates:** "Jangan berikan jawaban langsung. Berikan petunjuk terarah dan ajukan pertanyaan balik agar pengguna dapat menemukan jawabannya sendiri berdasarkan dokumen yang dilampirkan."
*   **Penilai Kritis:** "Bertindaklah sebagai dosen penguji yang kritis. Periksa argumen pengguna, cari celah logika, dan berikan kritik yang membangun tanpa basa-basi."
