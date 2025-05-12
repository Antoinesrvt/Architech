#!/usr/bin/env node

// Generated wrapper script
const { spawnSync } = require('child_process');
const path = require('path');

// Log environment for debugging
console.log('Node.js version:', process.version);
console.log('Arguments:', process.argv);

// Get command parts from arguments
const workingDir = process.argv[2] || process.cwd();
const cmdParts = process.argv.slice(3);

if (cmdParts.length === 0) {
  console.error('Error: No command specified');
  process.exit(1);
}

// The command to run is the first argument after the working directory
const command = cmdParts.join(' ');

console.log('Working directory:', workingDir);
console.log('Command:', command);

try {
  // Change to working directory
  process.chdir(workingDir);
  
  // Execute the command using the shell
  const result = spawnSync(command, [], {
    shell: true,
    stdio: 'inherit',
    env: {
      ...process.env,
      CI: 'true'
    }
  });
  
  process.exit(result.status || 0);
} catch (error) {
  console.error('Error executing command:', error.message);
  process.exit(1);
}
