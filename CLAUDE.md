# Digests

Digests is an RSS Reader and Podcast Player built with React. It is designed to be simple, fast, and easy to use. It supports both RSS and Atom feeds, and it can also play podcasts.

- Focus is on a clean and intuitive user interface, making it easy for users to manage their feeds and listen to their favorite podcasts. The application is built with modern web technologies, ensuring a smooth and responsive experience across different devices.

- Use shared design tokens for consistent styling and theming across the application. This allows for easy customization and ensures a cohesive look and feel throughout the user interface.
- Design tokens can be evolved, added, or removed as needed to adapt to changing design requirements and user preferences.
- If needed, check with the user so we can add/update/remove design tokens to better suit the application's needs.

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
