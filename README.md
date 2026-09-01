# zxdo

A lightweight, convention-based task runner and script orchestrator built around [Google's zx](https://github.com/google/zx).

## What is this

`zxdo` is a command-line tool and library designed to streamline writing, organizing, and executing project tasks and scripts using TypeScript and JavaScript.

Instead of writing complex, multi-line shell scripts embedded in `package.json`, `zxdo` discovers executable script files stored in dedicated folders (such as `scripts/` or `.scripts/`) across your project or monorepo workspace. It automatically inspects JSDoc comments to generate CLI help documentation, intelligently detects and configures the host shell (Bash, Zsh, PowerShell, pwsh, or CMD), and seamlessly forwards arguments to Google `zx`.

## Why would I use this

- **No More Bloated `package.json`**: Move long, brittle script strings out of `package.json` and into modular, maintainable TypeScript or JavaScript files.
- **Simple Scripting in Your Favorite Language**: Use TypeScript and JavaScript for all your scripting needs, without having to consider shell specifics and different operating systems.
- **Hierarchical Monorepo Discovery**: Searches up the directory tree to find project and workspace root boundaries (`package.json`). Scripts placed in root `.scripts/` folders are immediately accessible from any subpackage or subdirectory.
- **Root-Anchored Execution (`cwd`)**: Automatically resolves and runs scripts from the closest project root containing `package.json`, ensuring `./` paths remain consistent regardless of which subfolder you run `zxdo` from.
- **Automatic Local Bin Resolution**: Automatically prepends all parent `node_modules/.bin` directories to the environment `PATH`, allowing you to run local binaries (e.g. `tsc`, `vite`, `eslint`) directly inside scripts without needing `npx`.
- **Smart Shell Detection & High Performance**: Detects whether you are running inside PowerShell (`pwsh` / `powershell`), Bash, Zsh, or Command Prompt, caches detection results across child processes, and runs PowerShell commands with `-NoProfile` for up to 6x faster execution on Windows.
- **Self-Documenting Tasks**: Write JSDoc comments with `@summary`, `@description`, and `@param` in your scripts. `zxdo` reads them to dynamically produce command listings (`zxdo --help`) and detailed command manuals (`zxdo <command> --help`).
- **Direct Passthrough to Google `zx`**: Any standard `zx` options (such as `--quiet`, `--verbose`, `--install`, or `--eval`) passed before the command name are forwarded directly to `zx`.
- **Built-in Concurrent Execution**: Bundled with a typed `concurrently` helper that runs tasks in parallel with color-coded labels and unified process output.

## How to use

### Installation

Install `zxdo` globally or locally within your project:

```bash
# Globally
npm install -g zxdo

# Or locally as a dev dependency
npm install --save-dev zxdo
```

You can also run it on demand with `npx`:

```bash
npx zxdo [options] <command> [command-options]
```

### Organizing Scripts

By default, `zxdo` looks for script files inside `.scripts` and `scripts` folders located in any parent project root (where a `package.json` exists):

```text
my-project/
├── package.json
├── .scripts/
│   ├── build.ts
│   ├── test.mts
│   └── deploy.mjs
└── packages/
    └── web/
        └── .scripts/
            └── preview.ts
```

Supported file extensions include: `.mts`, `.cts`, `.ts`, `.mjs`, `.cjs`, `.js`, as well as extensionless executable files.

### Writing Self-Documenting Scripts

Scripts can leverage JSDoc annotations to automatically document their usage:

```typescript
/**
 * @summary Build the project assets
 *
 * Compiles TypeScript source files, bundles client assets, and prepares
 * the production distribution folder.
 *
 * @param -w, --watch, Run in watch mode for development
 * @param -p, --production, Enable production optimizations (minification, tree-shaking)
 */

import { $, fs } from 'zxdo';

const isProduction = process.argv.includes('--production');

await $`echo "Building assets (production: ${isProduction})..."`;
```

### Running Commands

To run a script, pass its name followed by any arguments intended for that script:

```bash
# Run the build script
zxdo build --production

# Run with custom arguments
zxdo deploy --stage=staging --dry-run
```

### Built-in Help and Discovery

List all available commands discovered across your project's scope:

```bash
zxdo --help
# or
zxdo
```

View the detailed documentation and options for a specific script:

```bash
zxdo --help build
```

Display version information:

```bash
zxdo --version
# or
zxdo -v
```

### Tool Options

Configure `zxdo` itself using the following CLI flags before the command name:

| Option | Description | Default |
| --- | --- | --- |
| `--shell=<name>` | Sets the shell used by `zx` (`auto`, `bash`, `pwsh`, `powershell`, `zsh`, or any other shell with full path) | `auto` |
| `--cwd=<dir>` | Sets the working directory from which commands should run | Closest `package.json` root |
| `--folders=<list>` | Colon-separated folder names to search for scripts | `scripts:.scripts` |
| `--extensions=<list>` | Colon-separated allowed script file extensions | `:.mts:.cts:.ts:.mjs:.cjs:.js` |
| `-v`, `--version` | Display current `zxdo` version | `false` |
| `-h`, `--help` | Display help or command documentation | `false` |

### Passthrough to Google `zx`

Flags unrecognized by `zxdo` passed before the command name are forwarded directly to `zx`:

```bash
# Run with zx quiet output
zxdo --quiet build

# Execute code directly using zx --eval
zxdo --eval 'await $`ls -la`'
```

### Usage as a Library

`zxdo` can also be imported programmatically inside your scripts and tools. It provides pre-configured shell settings, Google's `zx` utilities, `fs-extra`, and a typed `concurrently` wrapper:

```typescript
import { $, fs, concurrently } from 'zxdo';

// 1. Execute commands via zx:
//    - Automatically uses detected host shell with PowerShell profile bypass
//    - Working directory anchored to closest project root
//    - Local node_modules/.bin tools (tsc, vite, etc.) available directly
//    - Output streamed in real-time (stdio: 'inherit')
await $`tsc --noEmit`;

// 2. Inspect active execution properties on $
console.log($.shell); // e.g., 'pwsh'
console.log($.cwd);   // e.g., 'C:\projects\my-repo'

// 3. Use enhanced file system operations from fs-extra
await fs.ensureDir('./dist/temp');

// 4. Run multiple commands in parallel with colored labels
await concurrently({
  client: 'vite dev',
  server: {
    script: 'nodemon server.ts',
    color: 'blue.bold'
  }
});
```

The active configuration resolved by `zxdo` is also exposed via environment variables (`process.env.ZXDO_SHELL`, `process.env.ZXDO_CWD`, `process.env.ZXDO_ROOTS`).

## Contributing

Contributions to `zxdo` are welcome! To set up the repository for development:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/gobstones/zxdo.git
   cd zxdo
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run tests**:
   ```bash
   npm test
   ```

4. **Lint and format code**:
   The project uses [Biome](https://biomejs.dev/) for code formatting and linting:
   ```bash
   # Check linting and formatting
   npm run check

   # Automatically format files
   npm run format
   ```

5. **Build the project**:
   ```bash
   npm run build
   ```

Please make sure all unit tests pass and code adheres to the project's formatting rules before opening a pull request.

## License

[MIT](LICENSE) © 2026 Alan Rodas Bonjour
