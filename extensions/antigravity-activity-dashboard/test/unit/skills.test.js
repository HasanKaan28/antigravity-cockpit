'use strict';
const assert = require('assert');
const path = require('path');
const { parseYamlFrontmatter, CATEGORY_MAP, PROMPT_HINTS, getSkillsData } = require('../../src/collectors/skills');

describe('Skills Collector & Parser Tests', () => {
    describe('parseYamlFrontmatter', () => {
        it('parses simple name and description', () => {
            const raw = `---
name: graphify
description: Knowledge graph builder
---
# Main Content`;
            const fm = parseYamlFrontmatter(raw);
            assert.strictEqual(fm.name, 'graphify');
            assert.strictEqual(fm.description, 'Knowledge graph builder');
        });

        it('handles UTF-8 BOM cleanly', () => {
            const raw = `\uFEFF---
name: taste-skill
description: Anti-slop frontend design
---
Content`;
            const fm = parseYamlFrontmatter(raw);
            assert.strictEqual(fm.name, 'taste-skill');
            assert.strictEqual(fm.description, 'Anti-slop frontend design');
        });

        it('handles multiline YAML strings with pipe symbols', () => {
            const raw = `---
name: clean-code
description: |
  Uncle Bob clean code
  engineering principles.
---
Body`;
            const fm = parseYamlFrontmatter(raw);
            assert.strictEqual(fm.name, 'clean-code');
            assert.ok(fm.description.includes('Uncle Bob clean code'));
            assert.ok(fm.description.includes('engineering principles.'));
        });

        it('strips surrounding quotes in values', () => {
            const raw = `---
name: "quoted-name"
description: 'single-quoted description'
---`;
            const fm = parseYamlFrontmatter(raw);
            assert.strictEqual(fm.name, 'quoted-name');
            assert.strictEqual(fm.description, 'single-quoted description');
        });

        it('returns empty object for missing or invalid frontmatter', () => {
            assert.deepStrictEqual(parseYamlFrontmatter(''), {});
            assert.deepStrictEqual(parseYamlFrontmatter(null), {});
            assert.deepStrictEqual(parseYamlFrontmatter('# Just Markdown without frontmatter'), {});
        });
    });

    describe('Category & Prompt Mappings', () => {
        it('maps all 5 core capability categories', () => {
            assert.strictEqual(CATEGORY_MAP['graphify'], 'architecture');
            assert.strictEqual(CATEGORY_MAP['taste-skill'], 'design');
            assert.strictEqual(CATEGORY_MAP['clean-code'], 'quality');
            assert.strictEqual(CATEGORY_MAP['headroom'], 'optimization');
            assert.strictEqual(CATEGORY_MAP['local-code-engine'], 'local-ai');
        });

        it('provides prompt trigger hints for key agent skills', () => {
            assert.ok(PROMPT_HINTS['graphify'].includes('/graphify'));
            assert.ok(PROMPT_HINTS['clean-code'].includes('@skill:clean-code'));
            assert.ok(PROMPT_HINTS['local-code-engine'].includes('OLLAMA'));
        });
    });

    describe('getSkillsData', () => {
        it('discovers skills and returns structured object with categories', async () => {
            const workspaceRoot = path.resolve(__dirname, '..', '..');
            const data = await getSkillsData(workspaceRoot);

            assert.ok(typeof data.totalCount === 'number');
            assert.ok(data.totalCount >= 0, 'Should return non-negative count of skills');
            assert.ok(Array.isArray(data.skills));
            assert.ok(data.categories && typeof data.categories === 'object');

            if (data.skills.length > 0) {
                const first = data.skills[0];
                assert.ok(first.id);
                assert.ok(first.displayName);
                assert.ok(first.category);
                assert.ok(first.promptHint);
                assert.ok(first.skillPath);
            }
        });
    });
});
