# Node.js Command Executor Sidecar

A standalone Node.js command executor that can be used as a Tauri sidecar to execute Node.js commands without requiring Node.js to be installed on the end user's machine.

## Overview

This sidecar is designed to be bundled with Tauri applications, allowing them to execute Node.js commands (like `npm`, `npx`, etc.) in a contained environment. It's particularly useful for:

- Setting up Node.js/JavaScript projects (React, Next.js, etc.)
- Running Node.js scripts from within a Tauri application
- Executing package management commands (npm, yarn, pnpm) in a contained environment

## Key Features

- **Self-contained**: Includes Node.js runtime, no external dependencies needed
- **Cross-platform**: Works on Windows, macOS, and Linux
- **Secure**: Restricted command validation in both Tauri capabilities and Rust validation
- **Real-time output**: Support for streaming command output
- **Event-based API**: Clean TypeScript API for command execution
- **Resource management**: Automatic cleanup of processes

## Security

The sidecar implements multiple layers of security:

1. **Capability-based restrictions**:
   - Only allows specified working directories using regex validation
   - Only allows commands that start with npm, npx, yarn, pnpm, or node

2. **Command validation in Rust**:
   - Checks for allowed command prefixes
   - Blocks potentially dangerous patterns (&&, ||, ;, etc.)
   - Prevents command injection attacks

3. **Execution isolation**:
   - Commands run in an isolated environment
   - Non-interactive mode prevents user prompts

## Frontend API

The frontend API is available via `src/lib/api/nodejs.ts`, providing both basic and streaming command execution functions.

### Basic Usage

```typescript
import { npm, npx, yarn } from '@/lib/api/nodejs';

// Execute npm install
const result = await npm('/path/to/project', 'install lodash');
console.log(`Success: ${result.success}`);
console.log(result.stdout);

// Execute an npx command
await npx('/path/to/project', 'create-react-app my-app');
```

### Streaming API

```typescript
import { npmStreaming } from '@/lib/api/nodejs';

// Real-time output
await npmStreaming('/path/to/project', 'install', {
  onStdout: (line) => updateUI(line),
  onStderr: (line) => showError(line),
  onCompleted: (code, success) => {
    if (success) {
      showSuccess();
    } else {
      showFailure(code);
    }
  }
});
```

## Backend Implementation

The sidecar is implemented in three parts:

1. **The Node.js sidecar executable**: A self-contained Node.js application that executes commands
2. **Rust command handling**: Secure validation and execution of commands
3. **TypeScript API**: Clean interface for the frontend

## Tauri Configuration

The sidecar requires configuration in the Tauri app:

1. Register the external binary in `tauri.conf.json`:
```json
{
  "bundle": {
    "externalBin": ["binaries/nodejs-sidecar"]
  }
}
```

2. Configure security in `capabilities/default.json`:
```json
{
  "permissions": [
    {
      "identifier": "shell:allow-execute",
      "allow": [
        {
          "name": "binaries/nodejs-sidecar",
          "sidecar": true,
          "args": [
            {
              "validator": "^([A-Za-z0-9\\-_/.]+)$"
            },
            {
              "validator": "^(npm|npx|yarn|pnpm|node)\\s[A-Za-z0-9\\-_/.\\s\\\"'=@]+$"
            }
          ],
          "executeDirectly": true,
          "scope": ["executable"]
        }
      ]
    }
  ]
}
```

3. Register the Rust commands in `main.rs`:
```rust
.invoke_handler(tauri::generate_handler![
    run_node_command,
    run_node_command_streaming,
    cleanup_command_resources,
])
```

## Building the Sidecar

The `build.js` script packages the sidecar for all supported platforms using `@yao-pkg/pkg`:

```bash
npm run build
```

This creates binaries in `src-tauri/binaries/` for macOS, Windows, and Linux.

## Usage from Command Line

For testing purposes, you can run the sidecar directly:

```bash
nodejs-sidecar /path/to/working/directory "npm install lodash"
```

## Supported Platforms

- Windows (x64)
- macOS (Intel x64 and Apple Silicon arm64)
- Linux (x64)

## License

MIT 