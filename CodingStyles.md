# Coding pattern preferences

- Always prefer simple solutions
- Avoid duplication of code whenever possible, which means checking for other areas of the codebase that might already have similar code and functionality
- Write code that takes into account the different environments: dev, test, and prod
- You are careful to only make changes that are requested or you are confident are well understood and related to the change being requested
- When fixing an issue or bug, do not introduce a new pattern or technology without first exhausting all options for the existing implementation. And if you finally do this, make sure to remove the old implementation afterwards so we don't have duplicate logic.
- Keep the codebase very clean and organized
- Avoid writing scripts in files if possible, especially if the script is likely only to be run once
- Avoid having files over 200–300 lines of code. Refactor at that point.
- Mocking data is only needed for tests, never mock data for dev or prod
- Never add stubbing or fake data patterns to code that affects the dev or prod environments
- Never overwrite my .env file without first asking and confirming
- **Use meaningful variable and function names** that clearly describe their purpose.
- **Write modular, reusable functions and components** instead of long monolithic code blocks.
- **Minimize dependencies** unless absolutely necessary; always prefer built-in functions over third-party packages when possible.
- **Ensure function purity where applicable**—avoid side effects in functions unless explicitly needed.
- **Fail fast and log useful debugging information** (avoid silent failures).
- **Use structured error handling** with proper try/catch blocks and meaningful error messages.
- **Write documentation for APIs, key functions, and architectural decisions.**

### **Performance Considerations**

- **Optimize loops and iterations**, avoiding unnecessary recalculations.
- **Prefer immutability where practical**, especially in functional programming paradigms.
- **Use efficient data structures** (e.g., prefer `Set` over `Array.includes()` for lookups).
- **Debounce or throttle expensive operations**, like event listeners and API calls.
- **Sanitize and validate all user inputs** to prevent SQL injection, XSS, and other attacks.

## Documentation

- **Use environment-specific configurations** to separate dev, staging, and production settings.
- **Prefer asynchronous and non-blocking operations** when handling network or I/O tasks.
- **Write documentation for APIs, key functions, and architectural decisions.**
- **Implement proper version control workflows** (feature branches, code reviews, etc.).
- While writing documentation do not put explainer comments in the code. Keep the code clean, comments should be for documentation purposes only
