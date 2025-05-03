import { executeNodeCommand, executeNodeCommandStreaming, CommandResult } from '../api/nodejs-executor';

/**
 * Execute a Next.js project setup command
 * 
 * @param projectPath - The parent directory where the project will be created
 * @param projectName - The name of the project to create
 * @param options - Additional options for the Next.js project
 * @returns A promise that resolves with the command result
 */
export async function createNextJsProject(
  projectPath: string,
  projectName: string,
  options: {
    typescript?: boolean;
    eslint?: boolean;
    tailwind?: boolean;
    src?: boolean;
    app?: boolean;
  } = {}
): Promise<CommandResult> {
  // Build the command with correct options
  let command = `npx create-next-app@latest`;
  
  // Ensure the output isn't interactive
  command += ` --use-npm`;
  
  // Add project name
  command += ` ${projectName}`;
  
  // Add options
  if (options.typescript !== false) command += ` --typescript`;
  if (options.eslint !== false) command += ` --eslint`;
  if (options.tailwind !== false) command += ` --tailwind`;
  if (options.src !== false) command += ` --src-dir`;
  if (options.app !== false) command += ` --app`;
  
  // Add flags to ensure non-interactive mode
  command += ` --no-git`;
  
  // Execute the command
  return executeNodeCommand(projectPath, command);
}

/**
 * Execute an npm install command
 * 
 * @param projectPath - The path to the project
 * @param packages - Optional packages to install
 * @param isDev - Whether to install as dev dependencies
 * @returns A promise that resolves with the command result
 */
export async function npmInstall(
  projectPath: string,
  packages?: string[],
  isDev?: boolean
): Promise<CommandResult> {
  let command = 'npm install';
  
  if (packages && packages.length > 0) {
    command += ` ${packages.join(' ')}`;
  }
  
  if (isDev) {
    command += ' --save-dev';
  }
  
  return executeNodeCommand(projectPath, command);
}

/**
 * Run an npm script
 * 
 * @param projectPath - The path to the project
 * @param scriptName - The name of the script to run
 * @returns A promise that resolves with the command result
 */
export async function npmRunScript(
  projectPath: string,
  scriptName: string
): Promise<CommandResult> {
  return executeNodeCommand(projectPath, `npm run ${scriptName}`);
}

/**
 * Execute a Node.js command with real-time feedback
 * 
 * @param projectPath - The path to the project
 * @param command - The command to execute
 * @param onStdout - Callback for stdout events
 * @param onStderr - Callback for stderr events
 * @param onCompleted - Callback for completion event
 * @param onError - Callback for error events
 * @returns A promise that resolves with the command ID
 */
export async function executeCommand(
  projectPath: string,
  command: string,
  onStdout?: (line: string) => void,
  onStderr?: (line: string) => void,
  onCompleted?: (exitCode: number, success: boolean) => void,
  onError?: (error: string) => void
): Promise<string> {
  return executeNodeCommandStreaming(projectPath, command, {
    onStdout,
    onStderr,
    onCompleted,
    onError
  });
} 