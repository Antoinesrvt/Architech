import { invoke } from '@tauri-apps/api/tauri';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { nanoid } from 'nanoid';

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
 * Information about an active streaming command
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

// Track active commands for cleanup
const activeCommands: Map<string, ActiveCommand> = new Map();

// Set up cleanup on page unload
window.addEventListener('beforeunload', () => {
  // Clean up all active commands
  cleanupAllCommands();
});

/**
 * Execute a Node.js command
 * 
 * @param workingDir - Directory where the command should be executed
 * @param command - Command to execute
 * @returns Command execution result
 */
export async function executeNodeCommand(
  workingDir: string,
  command: string,
): Promise<CommandResult> {
  try {
    return await invoke<CommandResult>('run_node_command', {
      workingDir,
      command,
    });
  } catch (error) {
    console.error('Error executing Node.js command:', error);
    throw error;
  }
}

/**
 * Execute a Node.js command with streaming output
 * 
 * @param workingDir - Directory where the command should be executed
 * @param command - Command to execute
 * @param callbacks - Callbacks for streaming events
 * @returns Promise that resolves with the command ID when execution begins
 */
export async function executeNodeCommandStreaming(
  workingDir: string,
  command: string,
  callbacks: CommandStreamCallbacks
): Promise<string> {
  const commandId = nanoid();
  const eventName = `node-command-${commandId}`;
  
  try {
    // Set up event listener before invoking command
    const unlisten = await listen<any>(eventName, (event) => {
      const payload = event.payload;
      
      if ('Stdout' in payload && callbacks.onStdout) {
        callbacks.onStdout(payload.Stdout);
      } else if ('Stderr' in payload && callbacks.onStderr) {
        callbacks.onStderr(payload.Stderr);
      } else if ('Error' in payload && callbacks.onError) {
        callbacks.onError(payload.Error);
      } else if ('Completed' in payload && callbacks.onCompleted) {
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
    invoke<CommandResult>('run_node_command_streaming', {
      workingDir,
      command,
      commandId,
    }).catch((error) => {
      console.error('Error executing streaming command:', error);
      if (callbacks.onError) {
        callbacks.onError(String(error));
      }
      cleanupCommand(commandId);
    });
    
    return commandId;
  } catch (error) {
    console.error('Failed to set up command streaming:', error);
    throw error;
  }
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
      await invoke('cleanup_command_resources', { commandId });
    } catch (error) {
      console.error('Error cleaning up command:', error);
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
    await invoke('cleanup_command_resources', {});
  } catch (error) {
    console.error('Error cleaning up all commands:', error);
  }
}

/**
 * Get information about all active commands
 * 
 * @returns Array of active command information
 */
export function getActiveCommands(): Array<{ id: string, workingDir: string, command: string }> {
  return Array.from(activeCommands.values()).map(({ id, workingDir, command }) => ({
    id,
    workingDir,
    command,
  }));
} 