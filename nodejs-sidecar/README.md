# Node.js Command Executor Sidecar

A standalone Node.js command executor that can be used as a Tauri sidecar to execute Node.js commands without requiring Node.js to be installed on the end user's machine.

## Overview

This sidecar is designed to be bundled with Tauri applications, allowing them to execute Node.js commands (like `npm`, `npx`, etc.) in a contained environment. It's particularly useful for:

- Setting up Node.js/JavaScript frameworks during project generation
- Running Node.js scripts from within a Tauri application
- Executing package management commands (npm, yarn, pnpm) in a contained environment

## Usage

### From Rust (Tauri)

#### Basic Execution

```rust
// Create a sidecar command
let result = execute_node_command(
    &app_handle,
    "/path/to/working/directory",
    "npm install lodash"
).await?;

// Check the result
if !result.success {
    let stderr = result.stderr;
    println!("Command failed: {}", stderr);
} else {
    let stdout = result.stdout;
    println!("Command succeeded: {}", stdout);
}
```

#### Streaming Execution

```rust
// Execute with real-time output streaming
let event_name = "my-custom-command-event";
let result = execute_node_command_streaming(
    &app_handle,
    "/path/to/working/directory",
    "npm install lodash",
    event_name
).await?;

// The function will emit events during execution:
// - NodeCommandEvent::Stdout(line) for stdout lines
// - NodeCommandEvent::Stderr(line) for stderr lines
// - NodeCommandEvent::Completed{exit_code, success} when done
// - NodeCommandEvent::Error(message) on error
```

### From TypeScript (Frontend)

#### Basic Execution

```typescript
import { npm, npx, yarn, pnpm } from '@/lib/nodejs';

// Execute an npm command
const installResult = await npm('/path/to/project', 'install lodash');
if (installResult.success) {
    console.log('Installed lodash successfully');
}

// Execute an npx command
const npxResult = await npx('/path/to/project', 'create-next-app my-app');
if (npxResult.success) {
    console.log('Created Next.js app successfully');
}
```

#### Streaming Execution

```typescript
import { npmStreaming, npxStreaming } from '@/lib/nodejs';

// Execute an npm command with real-time output
await npmStreaming('/path/to/project', 'install --verbose', (event) => {
    switch (event.type) {
        case 'stdout':
            console.log(`Output: ${event.data}`);
            break;
        case 'stderr':
            console.error(`Error: ${event.data}`);
            break;
        case 'completed':
            console.log(`Command completed with exit code ${event.exit_code}`);
            break;
        case 'error':
            console.error(`Error: ${event.message}`);
            break;
    }
});

// Create a React app with real-time feedback
await npxStreaming('/path/to/project', 'create-react-app my-app', (event) => {
    if (event.type === 'stdout') {
        // Update UI with progress information
        updateProgressUI(event.data);
    }
});
```

### From Command Line (for testing)

```bash
# Direct execution (for testing)
./nodejs-sidecar /path/to/working/directory "npm install lodash"
```

## Building the Sidecar

The sidecar is built using [@yao-pkg/pkg](https://github.com/vercel/pkg), which packages the Node.js application into a standalone executable.

```bash
# Install dependencies
npm install

# Build the sidecar
npm run build
```

This will generate binaries for multiple platforms in the parent project's `src-tauri/binaries` directory.

## Configuration

### Tauri Configuration (tauri.conf.json)

```json
{
  "bundle": {
    "externalBin": ["binaries/nodejs-sidecar"]
  },
  "plugins": {
    "shell": {
      "open": true,
      "scope": [
        {
          "name": "nodejs-command-executor",
          "sidecar": true,
          "cmd": "nodejs-sidecar",
          "args": [
            {
              "validator": ".*" // Working directory (any path)
            },
            {
              "validator": "^(npm|npx|yarn|pnpm|node)\\s.*" // Only allow npm, npx, yarn, pnpm, node commands
            }
          ]
        }
      ]
    }
  }
}
```

## Security Considerations

The sidecar runs with the same permissions as the Tauri application. To restrict which commands can be executed:

1. Use the `scope` configuration in `tauri.conf.json` to limit allowed commands
2. Validate all user input before passing it to the sidecar
3. Avoid using `eval` or similar functions that could lead to code injection

## Supported Platforms

- Windows (x64)
- macOS (x64, arm64)
- Linux (x64)

## License

MIT 