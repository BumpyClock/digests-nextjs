# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. Coding guidelines are defined in CodingGuidelines.md, please refer to that file for more details and follow the instructions to ensure code quality and consistency.

Always create a tasklist before starting any code changes. This will help you stay organized and ensure that you cover all necessary steps in the development process.
## Tasklist
 Use [] for incomplete tasks and [x] for completed tasks.
- [x] Understand the context of the project by reading the README.md and CodingGuidelines.md files.
- [ ] Identify the specific task or request.

# Writing code

- YOU MUST NEVER USE --no-verify WHEN COMMITTING CODE
- We prefer simple, clean, maintainable solutions over clever or complex ones, even if the latter are more concise or performant. Readability and maintainability are primary concerns.
- Make the smallest reasonable changes to get to the desired outcome. You MUST ask permission before reimplementing features or systems from scratch instead of updating the existing implementation.
- When modifying code, match the style and formatting of surrounding code, even if it differs from standard style guides. Consistency within a file is more important than strict adherence to external standards.
- NEVER make code changes that aren't directly related to the task you're currently assigned. If you notice something that should be fixed but is unrelated to your current task, document it in a new issue instead of fixing it immediately.
- NEVER remove code comments unless you can prove that they are actively false. Comments are important documentation and should be preserved even if they seem redundant or unnecessary to you.
- All code files should start with a brief 2 line comment explaining what the file does. Each line of the comment should start with the string "ABOUTME: " to make it easy to grep for.
- When writing comments, avoid referring to temporal context about refactors or recent changes. Comments should be evergreen and describe the code as it is, not how it evolved or was recently changed.
- NEVER implement a mock mode for testing or for any purpose. We always use real data and real APIs, never mock implementations.
- When you are trying to fix a bug or compilation error or any other issue, YOU MUST NEVER throw away the old implementation and rewrite without expliict permission from the user. If you are going to do this, YOU MUST STOP and get explicit permission from the user.
- NEVER name things as 'improved' or 'new' or 'enhanced', etc. Code naming should be evergreen. What is new today will be "old" someday.

# Getting help

- ALWAYS ask for clarification rather than making assumptions.
- If you're having trouble with something, it's ok to stop and ask for help. Especially if it's something your human might be better at.


# Specific Technologies

- @~/.claude/docs/typescript.md
- @~/.claude/docs/source-control.md
- @~/.claude/docs/using-pnpm.md
- @~/.claude/docs/CodingGuidelines.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- Build: `pnpm build`
- Dev server: `pnpm dev`
- Lint: `pnpm lint`
- Lint & fix: `pnpm lint:fix`
- Type check: Run `tsc --noEmit` 

## Code Style Guidelines
- **Formatting**: Following Next.js conventions
- **Imports**: Use absolute imports with `@/` prefix for internal modules
- **TypeScript**: Strict mode enabled, prefer explicit types over `any`
- **Components**: React functional components with TypeScript interfaces
- **Naming**: 
  - PascalCase for components and interfaces
  - camelCase for functions, variables, and instances
  - kebab-case for file names
- **File Structure**: Follow Next.js App Router conventions
- **State Management**: Using Zustand for global state
- **Error Handling**: Use try/catch with proper error typing
- **CSS**: Tailwind utility classes with component composition pattern

