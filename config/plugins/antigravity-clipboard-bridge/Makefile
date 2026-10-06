UPSTREAM_DIR ?= ../agent-bridge-clipboard

.PHONY: import-upstream test

import-upstream:
	# Assume upstream has run 'make build'
	@if [ ! -d "$(UPSTREAM_DIR)/dist/antigravity-clipboard-bridge" ]; then \
		echo "Error: $(UPSTREAM_DIR)/dist/antigravity-clipboard-bridge not found."; \
		echo "Please run 'make build' in the upstream directory first."; \
		exit 1; \
	fi
	
	# Clear existing skills and plugin.json to ensure a clean state
	rm -rf skills plugin.json
	
	# Copy the entire plugin structure directly from the upstream distribution
	cp -r $(UPSTREAM_DIR)/dist/antigravity-clipboard-bridge/skills ./
	cp $(UPSTREAM_DIR)/dist/antigravity-clipboard-bridge/plugin.json ./
	mv skills/copy/copy.sh skills/copy/copy_to_clipboard.sh
	chmod +x skills/copy/copy_to_clipboard.sh

test:
	@echo "Running integration checks..."
	@./tests/integration.sh
	@echo "Running unit test suite..."
	@bash ./tests/unit_tests.sh


.PHONY: release
release:
	@if [ -z "$(VERSION)" ]; then \
		echo "Error: VERSION is required. Usage: make release VERSION=1.0.3"; \
		exit 1; \
	fi
	@echo "Verifying tests pass..."
	@./tests/integration.sh
	@echo "Bumping version to $(VERSION) in gemini-extension.json..."
	@sed -i 's/"version": "[^"]*"/"version": "$(VERSION)"/' gemini-extension.json
	@echo "Committing version bump..."
	@git add gemini-extension.json
	@git commit -m "bump: version $(VERSION)"
	@echo "Pushing changes to remote..."
	@git push origin main
	@echo "Tagging release v$(VERSION)..."
	@git tag -a v$(VERSION) -m "Release v$(VERSION)"
	@echo "Pushing tag v$(VERSION) to origin..."
	@git push origin v$(VERSION)
	@echo "Creating GitHub release v$(VERSION)..."
	@printf "Consolidated the clipboard helper script to \`copy_to_clipboard.sh\` to prevent shell/command collisions, modernized the skill instructions, and removed redundant help/setup files.\n\n## Installation & Update Instructions\n\n### 📥 Install Command\n\`\`\`bash\nagy plugins install https://github.com/aaronbronow/antigravity-clipboard-bridge\n\`\`\`\n\n### 🔄 Update Command\n\`\`\`bash\nagy plugins update clipboard\n\`\`\`\n" > .release-notes.tmp
	@gh release create v$(VERSION) -F .release-notes.tmp -t "v$(VERSION)"
	@rm -f .release-notes.tmp
	@echo "Release v$(VERSION) successfully created!"

