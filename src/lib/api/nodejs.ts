import { invoke } from "@tauri-apps/api/tauri";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { nanoid } from "nanoid";

/**
 * Result of a Node.js command execution
 */
export interface CommandResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  success: boolean;
}

/**
 * Events emitted during command execution
 */
export type CommandEvent =
  | { type: "stdout"; data: string }
  | { type: "stderr"; data: string }
  | { type: "completed"; exitCode: number; success: boolean }
  | { type: "error"; message: string };

/**
 * Callback for streaming command events
 */
export interface CommandStreamCallbacks {
  /** Called for each line of stdout */
  onStdout?: (line: string) => void;
  /** Called for each line of stderr */
  onStderr?: (line: string) => void;
  /** Called when the command completes */
  onCompleted?: (exitCode: number, success: boolean) => void;
  /** Called when an error occurs */
  onError?: (error: string) => void;
}

/**
 * Options for command execution
 */
export interface CommandOptions {
  /** Environment variables to set for the command */
  env?: Record<string, string>;
}

/**
 * Information about an active command
 */
interface ActiveCommand {
  /** Unique ID of the command */
  id: string;
  /** Working directory */
  workingDir: string;
  /** Command being executed */
  command: string;
  /** Unlisten function to remove event listener */
  unlisten: UnlistenFn;
}

/**
 * Type of Node.js tools supported by the sidecar
 */
export type NodeTool = "npm" | "npx" | "yarn" | "pnpm" | "node";

// Track active commands for cleanup
const activeCommands: Map<string, ActiveCommand> = new Map();

// Set up cleanup on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    // Clean up all active commands
    cleanupAllCommands();
  });
}

/**
 * Execute a Node.js command
 *
 * @param workingDir - Directory where the command should be executed
 * @param command - Command to execute
 * @param options - Command options
 * @returns Command execution result
 */
export async function executeNodeCommand(
  workingDir: string,
  command: string,
  options?: CommandOptions
): Promise<CommandResult> {
  try {
    return await invoke<CommandResult>("run_node_command", {
      workingDir,
      command,
    });
  } catch (error) {
    console.error("Error executing Node.js command:", error);
    throw error;
  }
}

/**
 * Execute a Node.js command with streaming output
 *
 * @param workingDir - Directory where the command should be executed
 * @param command - Command to execute
 * @param callbacks - Callbacks for streaming events
 * @param options - Command options
 * @returns Promise that resolves with the command ID when execution begins
 */
export async function executeNodeCommandStreaming(
  workingDir: string,
  command: string,
  callbacks: CommandStreamCallbacks,
  options?: CommandOptions
): Promise<string> {
  const commandId = nanoid();
  const eventName = `node-command-${commandId}`;

  try {
    // Set up event listener before invoking command
    const unlisten = await listen<any>(eventName, (event) => {
      const payload = event.payload;

      if ("Stdout" in payload && callbacks.onStdout) {
        callbacks.onStdout(payload.Stdout);
      } else if ("Stderr" in payload && callbacks.onStderr) {
        callbacks.onStderr(payload.Stderr);
      } else if ("Error" in payload && callbacks.onError) {
        callbacks.onError(payload.Error);
      } else if ("Completed" in payload && callbacks.onCompleted) {
        const completed = payload.Completed;
        callbacks.onCompleted(completed.exit_code, completed.success);

        // Auto-cleanup after completion
        cleanupCommand(commandId);
      }
    });

    // Store command info for cleanup
    activeCommands.set(commandId, {
      id: commandId,
      workingDir,
      command,
      unlisten,
    });

    // Start command execution
    invoke<CommandResult>("run_node_command_streaming", {
      workingDir,
      command,
      commandId,
    }).catch((error) => {
      console.error("Error executing streaming command:", error);
      if (callbacks.onError) {
        callbacks.onError(String(error));
      }
      cleanupCommand(commandId);
    });

    return commandId;
  } catch (error) {
    console.error("Failed to set up command streaming:", error);
    throw error;
  }
}

/**
 * Execute a Node.js command with an event handler for streaming output
 *
 * @param workingDir - Directory where the command should be executed
 * @param command - Command to execute
 * @param onEvent - Unified event handler
 * @param options - Command options
 * @returns Promise that resolves with the command ID when execution begins
 */
export async function executeCommandWithEvents(
  workingDir: string,
  command: string,
  onEvent: (event: CommandEvent) => void,
  options?: CommandOptions
): Promise<string> {
  const callbacks: CommandStreamCallbacks = {
    onStdout: (line) => onEvent({ type: "stdout", data: line }),
    onStderr: (line) => onEvent({ type: "stderr", data: line }),
    onCompleted: (exitCode, success) =>
      onEvent({ type: "completed", exitCode, success }),
    onError: (message) => onEvent({ type: "error", message }),
  };

  return executeNodeCommandStreaming(workingDir, command, callbacks, options);
}

/**
 * Clean up resources for a specific command
 *
 * @param commandId - ID of the command to clean up
 */
export async function cleanupCommand(commandId: string): Promise<void> {
  const command = activeCommands.get(commandId);
  if (command) {
    try {
      // Remove event listener
      await command.unlisten();
      // Remove from active commands
      activeCommands.delete(commandId);
      // Tell backend to clean up resources
      await invoke("cleanup_command_resources", { commandId });
    } catch (error) {
      console.error("Error cleaning up command:", error);
    }
  }
}

/**
 * Clean up all active commands
 */
export async function cleanupAllCommands(): Promise<void> {
  try {
    // Remove all event listeners
    const cleanupPromises = Array.from(activeCommands.values()).map(
      async (command) => {
        try {
          await command.unlisten();
        } catch (error) {
          console.error(`Failed to unlisten command ${command.id}:`, error);
        }
      }
    );

    // Wait for all listeners to be removed
    await Promise.all(cleanupPromises);

    // Clear active commands map
    activeCommands.clear();

    // Tell backend to clean up all resources
    await invoke("cleanup_command_resources", {});
  } catch (error) {
    console.error("Error cleaning up all commands:", error);
  }
}

/**
 * Get information about all active commands
 *
 * @returns Array of active command information
 */
export function getActiveCommands(): Array<{
  id: string;
  workingDir: string;
  command: string;
}> {
  return Array.from(activeCommands.values()).map(
    ({ id, workingDir, command }) => ({
      id,
      workingDir,
      command,
    })
  );
}

// Factory function for creating Node.js tool commands
/**
 * Create a function to execute a specific Node.js tool command
 *
 * @param tool - The Node.js tool to execute (npm, npx, etc.)
 * @returns A function that executes the tool with the given arguments
 */
function createNodeCommand(tool: NodeTool) {
  return (workingDir: string, args: string, options?: CommandOptions): Promise<CommandResult> => 
    executeNodeCommand(workingDir, `${tool} ${args}`, options);
}

/**
 * Create a function to execute a specific Node.js tool command with streaming output
 *
 * @param tool - The Node.js tool to execute (npm, npx, etc.)
 * @returns A function that executes the tool with the given arguments and streams the output
 */
function createStreamingCommand(tool: NodeTool) {
  return (
    workingDir: string, 
    args: string, 
    callbacks: CommandStreamCallbacks, 
    options?: CommandOptions
  ): Promise<string> => 
    executeNodeCommandStreaming(workingDir, `${tool} ${args}`, callbacks, options);
}

// Export convenience functions for Node.js tools
export const npm = createNodeCommand("npm");
export const npx = createNodeCommand("npx");
export const yarn = createNodeCommand("yarn");
export const pnpm = createNodeCommand("pnpm");
export const node = createNodeCommand("node");

// Export streaming convenience functions for Node.js tools
export const npmStreaming = createStreamingCommand("npm");
export const npxStreaming = createStreamingCommand("npx");
export const yarnStreaming = createStreamingCommand("yarn");
export const pnpmStreaming = createStreamingCommand("pnpm");
export const nodeStreaming = createStreamingCommand("node"); 