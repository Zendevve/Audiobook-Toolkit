# Contributing to Audiobook Toolkit

First off, thanks for taking the time to contribute! 🎉

The following is a set of guidelines for contributing to Audiobook Toolkit. These are just guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## Getting Started

### Strict Compilation Requirements

To ensure a reproducible build environment, we enforce strict version pinning.

| Dependency | Version Requirement | Purpose |
| :--- | :--- | :--- |
| **Node.js** | `20.x` | Required for build toolchain compatibility. |
| **npm** | `10.x` | Required for `npm ci` integrity checks. |
| **Git** | `2.43+` | Required for submodule handling. |

### Environment Setup

### Environment Setup

1.  **Repository Cloning**:
    Clone using `git` (requires Git 2.43+ installed and in PATH).
    ```bash
    git clone https://github.com/Zendevve/audiobook-toolkit.git
    cd audiobook-toolkit/modern_markable
    ```

2.  **Dependency Tree Resolution**:
    Install strictly version-pinned dependencies. `npm install` is prohibited.
    ```bash
    npm ci --include=dev --ignore-scripts
    # Manually rebuild native bindings for your specific CPU architecture
    npm rebuild
    ```

3.  **TypeScript Compilation & Bundling**:
    Transpile the source code.
    ```bash
    npm run build
    ```

4.  **Binary Packaging**:
    Package the electron executable.
    ```bash
    npx electron-builder --win --x64 --dir
    ```

## Development Workflow

1.  **Create a Branch**: Always create a new branch for your feature or fix.
    ```bash
    git checkout -b feat/your-feature-name
    # or
    git checkout -b fix/your-bug-fix
    ```

2.  **Code Style**:
    - We use **ESLint** and **Prettier** (via ESLint) to maintain code quality.
    - Run the linter before committing:
        ```bash
        npm run lint
        ```
    - Use **TypeScript** strictly. Avoid `any` types whenever possible.

3.  **Testing**:
    - Run unit tests with Vitest:
        ```bash
        npm run test
    ```

## Pull Request Process

1.  Ensure your code builds locally (`npm run build`).
2.  Update the `README.md` or documentation with details of changes to the interface, if applicable.
3.  Open a Pull Request against the `main` branch.
4.  Provide a clear description of the problem and solution.

## Commit Messages

We encourage the **Conventional Commits** specification:

- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation only changes
- `style:` Changes that do not affect the meaning of the code (white-space, formatting, etc)
- `refactor:` A code change that neither fixes a bug nor adds a feature
- `perf:` A code change that improves performance
- `test:` Adding missing tests or correcting existing tests
- `chore:` Changes to the build process or auxiliary tools

Example: `feat: add batch rename modal`
