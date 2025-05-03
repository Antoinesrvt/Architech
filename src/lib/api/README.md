# Node.js Command Execution API

This module provides a clean, secure API for executing Node.js commands from your Tauri application without requiring Node.js to be installed on the end user's machine.

## Basic Usage

```typescript
import { npm, npx, yarn, pnpm, node } from '../lib/api/nodejs';

// Execute npm commands
const result = await npm('/path/to/project', 'install lodash');
if (result.success) {
  console.log('Package installed successfully');
  console.log(result.stdout);
} else {
  console.error('Failed to install package:', result.stderr);
}

// Execute npx commands
const npxResult = await npx('/path/to/project', 'create-react-app my-app');
```

## Streaming Output

For long-running commands or when you need real-time feedback:

```typescript
import { npmStreaming, npxStreaming } from '../lib/api/nodejs';

// Execute with callbacks for real-time output
const commandId = await npmStreaming('/path/to/project', 'install --verbose', {
  onStdout: (line) => console.log('Output:', line),
  onStderr: (line) => console.error('Error:', line),
  onCompleted: (exitCode, success) => {
    console.log(`Command completed with exit code ${exitCode}, success: ${success}`);
  },
  onError: (error) => console.error('Command error:', error)
});
```

## Event-Based API

For more complex use cases with unified event handling:

```typescript
import { executeCommandWithEvents, CommandEvent } from '../lib/api/nodejs';

// Execute with a unified event handler
const commandId = await executeCommandWithEvents('/path/to/project', 'npm install', (event) => {
  switch (event.type) {
    case 'stdout':
      updateLogOutput(event.data);
      break;
    case 'stderr':
      updateErrorOutput(event.data);
      break;
    case 'completed':
      updateStatus(`Completed with code ${event.exitCode}`);
      break;
    case 'error':
      showError(event.message);
      break;
  }
});
```

## Cleanup Resources

For manual cleanup (automatic on command completion):

```typescript
import { cleanupCommand, cleanupAllCommands } from '../lib/api/nodejs';

// Clean up a specific command
await cleanupCommand(commandId);

// Clean up all running commands (useful when closing the app)
await cleanupAllCommands();
```

## Low-Level API

The core functions that power the higher-level utilities:

```typescript
import { executeNodeCommand, executeNodeCommandStreaming } from '../lib/api/nodejs';

// Basic execution
const result = await executeNodeCommand('/path/to/project', 'npm install lodash');

// Streaming execution
const commandId = await executeNodeCommandStreaming(
  '/path/to/project',
  'npm install lodash',
  {
    onStdout: (line) => console.log(line),
    // ... other callbacks
  }
);
```

## Creating Custom Tool Commands

You can easily create your own command wrappers for other tools using the provided factory functions:

```typescript
import { createNodeCommand, createStreamingCommand, NodeTool } from '../lib/api/nodejs';

// Add support for a custom tool
export const bun = createNodeCommand("bun");
export const bunStreaming = createStreamingCommand("bun");

// Then use it like any other tool
const result = await bun('/path/to/project', 'install express');
```

## Security Considerations

- Commands are validated both in TypeScript and Rust to ensure only allowed commands are executed
- The API enforces the use of specific Node.js tools (`npm`, `npx`, `yarn`, `pnpm`, `node`)
- Commands are checked for potentially dangerous patterns
- All commands are executed in a sandboxed environment

## API Reference

### Types

- `CommandResult` - Result of a command execution
- `CommandEvent` - Events emitted during command execution
- `CommandStreamCallbacks` - Callbacks for streaming output
- `CommandOptions` - Options for command execution
- `NodeTool` - Type defining supported Node.js tools

### Core Functions

- `executeNodeCommand` - Execute a command and wait for completion
- `executeNodeCommandStreaming` - Execute a command with real-time feedback
- `executeCommandWithEvents` - Execute a command with unified event handling
- `cleanupCommand` - Clean up resources for a specific command
- `cleanupAllCommands` - Clean up all active commands
- `getActiveCommands` - Get information about all active commands

### Factory Functions

- `createNodeCommand` - Create a function that executes a specific Node.js tool
- `createStreamingCommand` - Create a streaming function for a specific Node.js tool

### Convenience Functions

- `npm`, `npmStreaming` - Execute npm commands
- `npx`, `npxStreaming` - Execute npx commands
- `yarn`, `yarnStreaming` - Execute yarn commands
- `pnpm`, `pnpmStreaming` - Execute pnpm commands
- `node`, `nodeStreaming` - Execute Node.js scripts 