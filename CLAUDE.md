# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. Coding guidelines are defined in CodingGuidelines.md, please refer to that file for more details and follow the instructions to ensure code quality and consistency.

Always create a tasklist before starting any code changes. This will help you stay organized and ensure that you cover all necessary steps in the development process.
## Tasklist
 Use [] for incomplete tasks and [x] for completed tasks.
- [ ] Understand the context of the project by reading the README.md and CodingGuidelines.md files.
- [ ] Identify the specific task or request.
- [ ] Plan the implementation by outlining the steps needed to implement the changes.
- [ ] Implement the changes according to the plan.
- [ ] Test the changes to ensure they work as expected.
- [ ] Document the changes made in the code and any relevant documentation files.
- [ ] Write clear and descriptive commit messages.
- [ ] Push the changes to the appropriate branch in the repository.
- [ ] Create a pull request with a clear description of the changes made.
- [ ] Review the code and be open to feedback from other team members.
- [ ] Make any necessary adjustments based on code reviews.
- [ ] Ensure that all tests pass and the code adheres to the project's coding standards.
- [ ] Ensure that the code is properly formatted and follows the project's style guidelines.
- [ ] Ensure that the code is properly documented and follows the project's documentation standards.
- [ ] Ensure that the code is properly tested and follows the project's testing standards.
- [ ] Ensure that the code is properly versioned and follows the project's versioning standards.
# Process
1. **Understand the Context**: Read the README.md and CodingGuidelines.md files to understand the project structure, purpose, and coding standards.
2. **Identify the Task**: Determine what specific code changes or additions are needed based on the request. Before starting, clarify any uncertainties with the requester. 
    - If the task is to add a new feature, understand the requirements and how it fits into the existing codebase.
    - If the task is to fix a bug, reproduce the issue and understand its cause before attempting a fix.
    - If the task is to refactor code, identify the areas that need improvement and understand the current implementation.
    - If the task is to write tests, understand the existing test structure and what needs to be tested.
3. **Plan the Implementation**: Outline the steps needed to implement the changes. This may include:
   - Identifying the files and components that will be affected.Think of at least 2 ideas for the implementation and discuss with the requester before proceeding. This is important to ensure that the approach aligns with the project goals and coding standards.
   - Determining the best approach to implement the changes while adhering to the coding guidelines.
   - Considering how the changes will affect existing functionality and ensuring backward compatibility.
4. **Implement the Changes**: Write the code according to the plan, ensuring it adheres to the project's structure and standards.
5. **Test the Changes**: Run the application locally to ensure the changes work as expected and do not introduce any errors. This may include:
   - Running existing tests to ensure they pass.
   - Writing new tests for any new functionality or changes made.
   - Manually testing the application to verify that the changes work as intended.
6. **Document the Changes**: Update any relevant documentation or comments in the code to reflect the changes made. This may include:
   - Updating README.md or other documentation files to reflect new features or changes.
   - Adding comments in the code to explain complex logic or important decisions made during implementation.
7. **Code Implementation**: Write the code according to the guidelines, ensuring it adheres to the project's structure and standards.
8. **Commit Changes**: Use clear and descriptive commit messages that follow the project's commit message conventions.
9. **Push Changes**: Push the changes to the appropriate branch in the repository.
10. **Pull Request**: Create a pull request with a clear description of the changes made, linking to any relevant issues or discussions.
11. **Review**: Be open to feedback and make any necessary adjustments based on code reviews from other team members.

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

