---
name: project-persistent-memory
description: Automatically extracts, preserves, and references high-density project context, architecture summaries, and key symbols to minimize token consumption and avoid redundant file reads.
---

# Project Persistent Memory & Token Optimization

## Purpose
Prevents repetitive and costly file reading by maintaining concise, high-density project memory snapshots in persistent storage.

## Protocol
1. **Initial Project Ingestion**:
   - When entering a new project or workspace, check for `.agents/rules/project-context.md` or a root `GEMINI.md`.
   - If missing, build a concise architecture snapshot:
     - Core tech stack & runtime versions.
     - Directory tree & responsibilities of each module.
     - Key entry points, database schemas, API routes, and state stores.
     - Major architectural decisions & design patterns.
2. **Persistent Storage Targets**:
   - Project-level: `.agents/rules/project-context.md` (or root `GEMINI.md`).
   - Central cache: `~/.gemini/antigravity-ide/knowledge/projects/` or user global memory.
3. **Token Conservation**:
   - Always read the persistent snapshot first instead of recursively grepping or viewing large files across turns.
   - Update the snapshot incrementally whenever files are added or modified.
