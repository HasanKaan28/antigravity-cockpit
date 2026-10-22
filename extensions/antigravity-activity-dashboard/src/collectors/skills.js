'use strict';
/**
 * Collector: Antigravity Agent Skills & Arsenal.
 * Discovers and parses active skills from ~/.gemini/config/skills/ (or repo ./skills fallback).
 * Extracts YAML frontmatter descriptions, categorization, and prompt templates.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const logger = require('../logger');

const CATEGORY_MAP = {
    'graphify': 'architecture',
    'codebase-memory': 'architecture',
    'architecture-review': 'architecture',
    'brainstorming': 'architecture',
    'api-design-principles': 'architecture',

    'taste-skill': 'design',
    'awesome-design': 'design',
    'image-to-code': 'design',

    'clean-code': 'quality',
    'code-review-excellence': 'quality',
    'debugging-toolkit': 'quality',
    'playwright-cli': 'quality',

    'headroom': 'optimization',
    'omniroute': 'optimization',
    'project-persistent-memory': 'optimization',
    'task-observer': 'optimization',
    'adopt-environment': 'optimization',

    'local-code-engine': 'local-ai',
    'managing-python-dependencies': 'local-ai',
    'notebook-guidance': 'local-ai',
    'ml-best-practices': 'local-ai'
};

const PROMPT_HINTS = {
    'graphify': 'Analyze codebase architecture and generate knowledge graph: /graphify',
    'taste-skill': 'Design clean, anti-slop modern UI layout using @skill:taste-skill',
    'awesome-design': 'Apply production design tokens and real-world UI styles: @skill:awesome-design',
    'clean-code': 'Refactor code following Uncle Bob Clean Code principles: @skill:clean-code',
    'local-code-engine': 'Delegate standalone function to local Ollama engine: [⚡ OLLAMA ACTIVE]',
    'headroom': 'Compress context and prune tool outputs using Headroom MCP',
    'omniroute': 'Route prompt through resilient multi-model OmniRoute gateway',
    'image-to-code': 'Convert reference image into production frontend code: @skill:image-to-code',
    'debugging-toolkit': 'Debug and diagnose root cause with systematic analysis: @skill:debugging-toolkit',
    'codebase-memory': 'Query codebase knowledge graph for call chains: @skill:codebase-memory',
    'code-review-excellence': 'Perform comprehensive, constructive code review: @skill:code-review-excellence',
    'project-persistent-memory': 'Maintain persistent project memory snapshot: @skill:project-persistent-memory',
    'task-observer': 'Observe execution patterns and extract reusable methodology: @skill:task-observer',
    'adopt-environment': 'Adopt and sync Antigravity IDE configuration vault: @skill:adopt-environment',
    'api-design-principles': 'Design RESTful and GraphQL API contracts with best practices',
    'architecture-review': 'Perform deep architectural review of module boundaries and dependencies',
    'brainstorming': 'Brainstorm and validate design options collaboratively before coding',
    'playwright-cli': 'Automate browser testing and run web verification with Playwright',
    'managing-python-dependencies': 'Manage virtual environment and dependencies without global pip',
    'notebook-guidance': 'Structure and execute Jupyter notebook cells with best practices',
    'ml-best-practices': 'Apply machine learning workflow and statistical modeling standards'
};

function parseYamlFrontmatter(content) {
    if (!content) return {};
    const clean = content.replace(/^\uFEFF/, '').trimStart();
    const match = clean.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---/);
    if (!match) return {};

    const rawYaml = match[1];
    const result = {};
    const lines = rawYaml.split(/\r?\n/);
    let currentKey = null;
    let multilineVal = [];

    for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        if (!line.trim()) continue;

        if (/^[a-zA-Z0-9_-]+:/.test(line)) {
            if (currentKey && multilineVal.length > 0) {
                result[currentKey] = multilineVal.join(' ').trim();
                multilineVal = [];
            }
            const colon = line.indexOf(':');
            currentKey = line.slice(0, colon).trim();
            let val = line.slice(colon + 1).trim();

            if (val === '|' || val === '|-' || val === '>' || val === '>-') {
                multilineVal = [];
            } else {
                if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                    val = val.slice(1, -1);
                }
                result[currentKey] = val;
                if (!val) {
                    multilineVal = [];
                } else {
                    currentKey = null;
                }
            }
        } else if (currentKey) {
            multilineVal.push(line.trim());
        }
    }

    if (currentKey && multilineVal.length > 0) {
        result[currentKey] = multilineVal.join(' ').trim();
    }

    return result;
}

async function getSkillsData(workspaceRoot = null) {
    const userHome = os.homedir();
    const candidateDirs = [
        path.join(userHome, '.gemini', 'config', 'skills'),
        path.join(userHome, '.gemini', 'antigravity-ide', 'builtin', 'skills'),
        path.join(userHome, '.gemini', 'skills')
    ];

    if (workspaceRoot) {
        candidateDirs.unshift(path.join(workspaceRoot, '.agents', 'skills'));
        candidateDirs.push(path.join(workspaceRoot, 'skills'));
    }

    const skills = [];
    const seenSkills = new Set();
    const catCounts = {
        'architecture': 0,
        'design': 0,
        'quality': 0,
        'optimization': 0,
        'local-ai': 0,
        'general': 0
    };

    for (const sDir of candidateDirs) {
        if (!fs.existsSync(sDir)) continue;

        try {
            const entries = await fs.promises.readdir(sDir, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

                const skillId = entry.name.toLowerCase();
                if (seenSkills.has(skillId)) continue;

                const skillPath = path.join(sDir, entry.name, 'SKILL.md');
                if (!fs.existsSync(skillPath)) continue;

                seenSkills.add(skillId);

                try {
                    const rawContent = await fs.promises.readFile(skillPath, 'utf8');
                    const frontmatter = parseYamlFrontmatter(rawContent);

                    const category = CATEGORY_MAP[skillId] || 'general';
                    catCounts[category] = (catCounts[category] || 0) + 1;

                    // Format display name
                    const displayName = frontmatter.name || entry.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    const description = frontmatter.description || 'Antigravity specialized agent capability.';
                    const promptHint = PROMPT_HINTS[skillId] || `Execute task using @skill:${entry.name}`;

                    skills.push({
                        id: entry.name,
                        name: entry.name,
                        displayName,
                        category,
                        description,
                        promptHint,
                        skillPath: skillPath.replace(/\\/g, '/')
                    });
                } catch (err) {
                    logger.warn(`Could not read skill ${entry.name}:`, err.message);
                }
            }
        } catch (err) {
            logger.warn(`Failed reading skills dir ${sDir}:`, err.message);
        }
    }

    // Sort skills alphabetically
    skills.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return {
        totalCount: skills.length,
        categories: catCounts,
        skills
    };
}

module.exports = {
    getSkillsData,
    parseYamlFrontmatter,
    CATEGORY_MAP,
    PROMPT_HINTS
};
