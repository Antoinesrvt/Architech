/**
 * TypeScript wrapper for the Node.js command executor
 * This allows executing Node.js commands from the frontend via the Tauri backend
 */

import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import { v4 as uuidv4 } from 'uuid';

/**
 * Result of a Node.js command execution
 */
export interface NodeCommandResult {
  /** Whether the command succeeded */
  success: boolean;
  /** The exit code of the command */
  exit_code: number;
  /** The standard output of the command */
  stdout: string;
  /** The standard error of the command */
  stderr: string;
}

/**
 * Event emitted during streaming command execution
 */
export type NodeCommandEvent = 
  | { type: 'stdout'; data: string }
  | { type: 'stderr'; data: string }
  | { type: 'completed'; exit_code: number; success: boolean }
  | { type: 'error'; message: string };

/**
 * Listener function type for streaming commands
 */
export type NodeCommandListener = (event: NodeCommandEvent) => void;

/**
 * Execute a Node.js command via the sidecar
 * 
 * @param workingDir - The working directory where the command should be executed
 * @param command - The command to execute (e.g., "npm install", "npx create-next-app", etc.)
 * @returns A promise that resolves to the command output
 */
export async function runNodeCommand(
  workingDir: string,
  command: string
): Promise<NodeCommandResult> {
  return invoke<NodeCommandResult>('run_node_command', {
    workingDir,
    command,
  });
}

/**
 * Execute a Node.js command with real-time output streaming
 * 
 * @param workingDir - The working directory where the command should be executed
 * @param command - The command to execute (e.g., "npm install", "npx create-next-app", etc.)
 * @param listener - Callback function to handle streaming output events
 * @returns A promise that resolves to the command output when the command completes
 */
export async function runNodeCommandStreaming(
  workingDir: string,
  command: string,
  listener: NodeCommandListener
): Promise<NodeCommandResult> {
  // Generate a unique command ID
  const commandId = uuidv4();
  const eventName = `node-command-${commandId}`;
  
  // Set up event listener
  const unlisten = await listen<any>(eventName, (event) => {
    const payload = event.payload;
    
    // Convert backend events to frontend event format
    if ('Stdout' in payload) {
      listener({ type: 'stdout', data: payload.Stdout });
    } else if ('Stderr' in payload) {
      listener({ type: 'stderr', data: payload.Stderr });
    } else if ('Completed' in payload) {
      listener({ 
        type: 'completed', 
        exit_code: payload.Completed.exit_code, 
        success: payload.Completed.success 
      });
    } else if ('Error' in payload) {
      listener({ type: 'error', message: payload.Error });
    }
  });
  
  try {
    // Run the command
    const result = await invoke<NodeCommandResult>('run_node_command_streaming', {
      workingDir,
      command,
      commandId,
    });
    
    return result;
  } finally {
    // Make sure to clean up the event listener
    await unlisten();
  }
}

/**
 * Execute a simple npm command
 * 
 * @param workingDir - The working directory where the command should be executed
 * @param args - The npm arguments (e.g., "install lodash", "run build", etc.)
 * @returns A promise that resolves to the command output
 */
export async function npm(
  workingDir: string,
  args: string
): Promise<NodeCommandResult> {
  return runNodeCommand(workingDir, `npm ${args}`);
}

/**
 * Execute a simple npm command with streaming output
 * 
 * @param workingDir - The working directory where the command should be executed
 * @param args - The npm arguments (e.g., "install lodash", "run build", etc.)
 * @param listener - Callback function to handle streaming output events
 * @returns A promise that resolves to the command output when the command completes
 */
export async function npmStreaming(
  workingDir: string,
  args: string,
  listener: NodeCommandListener
): Promise<NodeCommandResult> {
  return runNodeCommandStreaming(workingDir, `npm ${args}`, listener);
}

/**
 * Execute a simple npx command
 * 
 * @param workingDir - The working directory where the command should be executed
 * @param args - The npx arguments (e.g., "create-next-app my-app", "prettier .", etc.)
 * @returns A promise that resolves to the command output
 */
export async function npx(
  workingDir: string,
  args: string
): Promise<NodeCommandResult> {
  return runNodeCommand(workingDir, `npx ${args}`);
}

/**
 * Execute a simple npx command with streaming output
 * 
 * @param workingDir - The working directory where the command should be executed
 * @param args - The npx arguments (e.g., "create-next-app my-app", "prettier .", etc.)
 * @param listener - Callback function to handle streaming output events
 * @returns A promise that resolves to the command output when the command completes
 */
export async function npxStreaming(
  workingDir: string,
  args: string,
  listener: NodeCommandListener
): Promise<NodeCommandResult> {
  return runNodeCommandStreaming(workingDir, `npx ${args}`, listener);
}

/**
 * Execute a simple yarn command
 * 
 * @param workingDir - The working directory where the command should be executed
 * @param args - The yarn arguments (e.g., "add lodash", "build", etc.)
 * @returns A promise that resolves to the command output
 */
export async function yarn(
  workingDir: string,
  args: string
): Promise<NodeCommandResult> {
  return runNodeCommand(workingDir, `yarn ${args}`);
}

/**
 * Execute a simple yarn command with streaming output
 * 
 * @param workingDir - The working directory where the command should be executed
 * @param args - The yarn arguments (e.g., "add lodash", "build", etc.)
 * @param listener - Callback function to handle streaming output events
 * @returns A promise that resolves to the command output when the command completes
 */
export async function yarnStreaming(
  workingDir: string,
  args: string,
  listener: NodeCommandListener
): Promise<NodeCommandResult> {
  return runNodeCommandStreaming(workingDir, `yarn ${args}`, listener);
}

/**
 * Execute a simple pnpm command
 * 
 * @param workingDir - The working directory where the command should be executed
 * @param args - The pnpm arguments (e.g., "add lodash", "run build", etc.)
 * @returns A promise that resolves to the command output
 */
export async function pnpm(
  workingDir: string,
  args: string
): Promise<NodeCommandResult> {
  return runNodeCommand(workingDir, `pnpm ${args}`);
}

/**
 * Execute a simple pnpm command with streaming output
 * 
 * @param workingDir - The working directory where the command should be executed
 * @param args - The pnpm arguments (e.g., "add lodash", "run build", etc.)
 * @param listener - Callback function to handle streaming output events
 * @returns A promise that resolves to the command output when the command completes
 */
export async function pnpmStreaming(
  workingDir: string,
  args: string,
  listener: NodeCommandListener
): Promise<NodeCommandResult> {
  return runNodeCommandStreaming(workingDir, `pnpm ${args}`, listener);
} 