# Product Overview & Business Logic: KeyLearn

## 1. Product Vision & Identity
**KeyLearn** (formerly conceptualized as "Aplikasi Pembantu Belajar Terintegrasi AI") is an intelligent, web-based study assistant designed specifically to elevate the learning and research experience. 

Unlike standard, generalized AI chatbots, KeyLearn acts as a personalized, context-aware digital tutor. It empowers users to organize their study materials securely, analyze complex academic documents, and obtain highly accurate, verified answers by cross-referencing multiple industry-leading AI models simultaneously. The ultimate goal of KeyLearn is to eliminate AI hallucinations and information overload, providing students with a reliable, grounded source of truth for their studies.

## 2. Target Audience & Localization Rules
* **Target Users:** Indonesian students (from high school to university level), academic researchers, and self-taught learners who require deep analysis of complex information.
* **Language Requirement (CRITICAL RULE):** The entire application ecosystem must be localized for Indonesia. All user interface elements, menus, buttons, error messages, toast notifications, and default AI chat responses MUST be written in natural, fluent Indonesian (Bahasa Indonesia). 
* **Primary Problem Solved:** Standard LLMs often hallucinate facts or lose track of long-form study materials. KeyLearn solves this by grounding the AI entirely in the user's uploaded documents (RAG) and verifying the output through a multi-AI consensus pipeline.

## 3. The User Journey (How it Works)
1. **Workspace Organization:** Upon logging in, the user creates a specific "Workspace" or folder dedicated to a single subject (e.g., "Matematika Diskrit", "Sejarah Indonesia", "Fisika Kuantum").
2. **Knowledge Ingestion (Upload):** Inside the dedicated workspace, the user uploads their specific study materials. This includes textbook chapters, syllabus PDFs, research papers, or lecture notes.
3. **Contextual Interaction (Chat):** The user opens the chat interface within that specific workspace. The AI is now bounded by the context of that folder. The user can ask it to summarize the uploaded PDFs, find logical flaws in an essay, or explain a concept using *only* the provided materials. The AI retains memory of the last 20 messages in each chat session, enabling coherent multi-turn dialogues with follow-up questions and clarifications.
4. **Deep Research Verification:** For highly complex or critical questions, the user toggles on "Consensus Mode." Behind the scenes, KeyLearn consults multiple different AI models, compares their answers, resolves contradictions, and delivers one highly accurate, unified response in Indonesian.

## 4. Core Feature Set

### A. Context-Aware Smart Chat
* A clean, highly responsive, and intuitive chat interface.
* **Error Resilience:** When a message fails to send (network errors, server timeouts, API failures), the user's own message bubble is visually marked with a red error indicator icon and a subtle red border. Hovering the icon reveals the specific error message via a tooltip. A retry button (circular arrow) appears below the icon, allowing the user to resend the exact same message (including any attached PDF) with a single click — no need to retype anything.
* **Persona Toggles:** Users can dynamically change the AI's teaching style. Options include:
  * *Jelaskan dengan sederhana* (Explain it simply / ELI5).
  * *Tutor Socrates* (The AI asks guiding questions to help the user arrive at the answer themselves, rather than just spoon-feeding information).
  * *Penilai Kritis* (Acts as a strict grader to review user-written essays or code).

### B. Document Integration & Analysis (RAG Pipeline)
* Users can upload PDF files directly into the workspace.
* The backend securely parses, extracts, and chunks the text from these documents, feeding them into a vector embedding system.
* The user can interact with the document as if it were a living entity, asking for citations, summaries, or specific data extraction.

### C. Workspace & Folder Isolation
* Chat histories and uploaded documents are strictly isolated into dedicated subject folders. 
* This prevents cross-contamination of context (e.g., the AI won't accidentally pull historical facts when the user is asking a biology question in their Biology workspace).

### D. "Consensus Mode" (Mixture of Agents / Multi-LLM Aggregation)
* The flagship feature of KeyLearn. 
* When activated, a single user prompt is dispatched asynchronously to multiple different LLM APIs (Proposer Agents).
* A highly capable master model (the Aggregator Agent, utilizing Gemini Flash) reads all diverse answers, filters out hallucinations, synthesizes the correct data, and outputs a final, deeply researched consensus.

### E. Dual Authentication (Login, Register, Google OAuth)
* Standard email/password registration and login via Laravel Breeze.
* One-click Google sign-in via Laravel Socialite ("Lanjutkan dengan Google").
* Account linking: if a Google user's email matches an existing account, the accounts are merged automatically.
* Sidebar dynamically reflects auth state: shows user avatar and logout when logged in, or a "Masuk" link when browsing as a guest.

### F. Future Expansions (Auto-Study Tools)
* Automated flashcard generation based on PDF uploads.
* Auto-generated multiple-choice quizzes to test reading comprehension of the provided materials.
