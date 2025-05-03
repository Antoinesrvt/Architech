#!/usr/bin/env node

/**
 * Generic Node.js command executor sidecar for Tauri applications
 * 
 * This sidecar provides a contained Node.js environment that can execute any
 * Node.js command without requiring Node.js to be installed on the end-user's machine.
 * 
 * Usage:
 *   nodejs-sidecar <working-directory> <command>
 * 
 * Arguments:
 *   working-directory: The directory where the command should be executed
 *   command: The full command string to execute
 */

import { execSync } from 'child_process';
import { chdir } from 'process';
import { existsSync } from 'fs';

// Validate arguments
if (process.argv.length < 4) {
  console.error('Error: Insufficient arguments');
  console.error('Usage: nodejs-sidecar <working-directory> <command>');
  process.exit(1);
}

// Get command details from arguments
const workingDir = process.argv[2];
const command = process.argv.slice(3).join(' ');

// Validate working directory
if (!existsSync(workingDir)) {
  console.error(`Error: Working directory does not exist: ${workingDir}`);
  process.exit(1);
}

// Validate command
if (!command || command.trim() === '') {
  console.error('Error: No command specified');
  process.exit(1);
}

try {
  // Change to working directory
  chdir(workingDir);
  console.log(`Working directory: ${workingDir}`);
  console.log(`Executing: ${command}`);
  
  // Set environment variables for non-interactive use
  const env = {
    ...process.env,
    CI: 'true',
    NEXT_TELEMETRY_DISABLED: '1',
    NODE_ENV: 'development',
    // Prevent npm update checks
    NPM_CONFIG_UPDATE_NOTIFIER: 'false',
    // Prevent yarn from displaying emoji and other UI niceties
    FORCE_COLOR: '0',
    // Prevent color output
    NO_COLOR: 'true'
  };
  
  // Execute the command
  const output = execSync(command, {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    // Set a reasonable timeout (10 minutes)
    timeout: 10 * 60 * 1000
  });
  
  console.log(output);
  process.exit(0);
} catch (error) {
  console.error(`Error executing command: ${error.message}`);
  
  // Provide detailed error information
  if (error.stdout) console.log(`Command stdout: ${error.stdout}`);
  if (error.stderr) console.error(`Command stderr: ${error.stderr}`);
  if (error.status) console.error(`Exit code: ${error.status}`);
  if (error.signal) console.error(`Termination signal: ${error.signal}`);
  
  process.exit(error.status || 1);
} 