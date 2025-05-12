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

// Generic Node.js command executor sidecar
const { execSync } = require('child_process');

// Get command details from arguments
const workingDir = process.argv[2] || process.cwd();
const command = process.argv.slice(3).join(' ');

if (!command) {
  console.error('Error: No command specified');
  process.exit(1);
}

try {
  // Change to working directory
  process.chdir(workingDir);
  console.log(`Working directory: ${workingDir}`);
  console.log(`Executing: ${command}`);
  
  // Set environment variables for non-interactive use
  const env = {
    ...process.env,
    CI: 'true',
    NEXT_TELEMETRY_DISABLED: '1',
    NODE_ENV: 'development'
  };
  
  // Execute the command
  execSync(command, {
    env,
    stdio: 'inherit'
  });
  
  process.exit(0);
} catch (error) {
  console.error(`Error executing command: ${error.message}`);
  process.exit(1);
} 