# AI Undo ⏪

> **Ctrl+Z for your AI coding agents.** Instant 1-click workspace snapshots & rollbacks for Claude Code, Cursor, GitHub Copilot, and Antigravity IDE.

Available as a **VS Code / Antigravity IDE extension** and a zero-dependency **CLI tool**.

---

## ⚡ The Problem

When coding with AI agents, they frequently:
1. Break working code across 7 different files simultaneously.
2. Create unexpected new files that standard `git checkout .` leaves behind.
3. Force you to stop and manually sift through git diffs, stashes, and untracked files just to get back to where you started 2 minutes ago.

**AI Undo gives you an atomic checkpoint before any AI prompt.** If the agent hallucinates or breaks your build, one click or shortcut resets everything in milliseconds.

---

## 🛡️ 3 Critical Problems Solved

Unlike naive `git stash` or file backups, AI Undo tackles the 3 real failure modes of agentic coding:

1. **Ghost File Cleanup**  
   *Problem*: Agents love creating auxiliary files (`temp.ts`, `test_scratch.py`, hallucinated modules). Git stashes ignore untracked files by default, leaving dead code scattered across your repository.  
   *Fix*: AI Undo records the exact file manifest at checkpoint time. On rollback, all post-checkpoint ghost files are cleanly deleted.

2. **Dirty Editor Buffer Sync**  
   *Problem*: In VS Code, restoring files from disk while you have unsaved editor buffers causes silent conflict dialogs or auto-save overwriting your rollback with bad AI code.  
   *Fix*: AI Undo automatically flushes all dirty in-memory buffers before creating a checkpoint and reloads visible editor documents after rollback.

3. **Zero Git & Workspace Pollution**  
   *Problem*: Backing up entire workspaces can accidentally pull in `node_modules` (gigabytes of bloat) or leak backup archives into your Git commits.  
   *Fix*: AI Undo automatically excludes dependency trees (`node_modules`, `.next`, `dist`, `.venv`) and auto-injects `.ai-undo/` into your project's `.gitignore`.

---

## 📦 Installation

[![Visual Studio Marketplace](https://img.shields.io/badge/VS%20Code%20Marketplace-v1.0.1-007ACC?logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=MrSkele.vscode-ai-undo)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

### Option 1: Directly inside VS Code / Antigravity IDE (Recommended)
1. Open the Extensions tab in VS Code (`Ctrl+Shift+X` or `Cmd+Shift+X`).
2. Search for **`AI Undo`** (Publisher: **`MrSkele`**).
3. Click **Install**.

Or run directly from your terminal:
```bash
code --install-extension MrSkele.vscode-ai-undo
```

### Option 2: Zero-Install Standalone CLI
Run instantly inside any project terminal without installing anything:
```bash
npx ai-undo save
npx ai-undo rollback
```

---

## 🚀 Quickstart

### In VS Code & Antigravity IDE
- **Save Checkpoint**: Press `Ctrl+Alt+S` (Mac: `Cmd+Alt+S`) or click **$(camera) AI Checkpoint** in the status bar.
- **Rollback**: Press `Ctrl+Alt+Z` (Mac: `Cmd+Alt+Z`) or click **$(history) AI Undo** in the status bar.
- **Inspect Diff**: Run command `AI Undo: View Changes Since Checkpoint`.

### Via Standalone CLI (Zero Install)
You can run it directly in any terminal:

```bash
# Before running an AI agent prompt:
npx ai-undo save

# If the AI breaks your code:
npx ai-undo rollback

# Check active checkpoint details:
npx ai-undo status
```

---

## ⌨️ Commands & Shortcuts

| Action | Shortcut (Win/Linux) | Shortcut (macOS) | Command Palette |
| :--- | :--- | :--- | :--- |
| **Save Checkpoint** | `Ctrl+Alt+S` | `Cmd+Alt+S` | `AI Undo: Save Checkpoint` |
| **Rollback** | `Ctrl+Alt+Z` | `Cmd+Alt+Z` | `AI Undo: Rollback to Checkpoint` |
| **View Diff** | - | - | `AI Undo: View Changes Since Checkpoint` |

---

## 🧪 Testing

```bash
npm test
```

4/4 automated tests verify manifest creation, gitignore auto-patching, content restoration, and ghost file deletion.

---

## 📄 License

MIT © [MrSkele](https://github.com/MrSkelee)

---

*Vibe Coded with 💖 by MrSkele & Antigravity*
