#!/usr/bin/env node

/**
 * Build script for the Node.js command executor sidecar
 * This script packages the Node.js application into a standalone binary
 * for use with Tauri applications.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Platform detection - simplified
const isWindows = process.platform === 'win32';
const extension = isWindows ? '.exe' : '';

// Get current platform identifier
function getPlatformIdentifier() {
  switch (process.platform) {
    case 'win32':
      return 'win-x64';
    case 'darwin':
      return process.arch === 'arm64' ? 'macos-arm64' : 'macos-x64';
    default:
      return 'linux-x64';
  }
}

const currentPlatform = getPlatformIdentifier();
console.log(`Current platform: ${currentPlatform}`);

// Create the binaries directory
const binariesDir = path.resolve(__dirname, '..', 'src-tauri', 'binaries');
if (!fs.existsSync(binariesDir)) {
  console.log(`Creating binaries directory at ${binariesDir}`);
  fs.mkdirSync(binariesDir, { recursive: true });
}

// Also copy to debug directory during development
const debugDir = path.resolve(__dirname, '..', 'src-tauri', 'target', 'debug');
if (fs.existsSync(debugDir)) {
  console.log(`Debug directory exists at ${debugDir}`);
} else {
  console.log(`Debug directory doesn't exist yet. It will be created by Tauri during first build.`);
}

// Create a direct shell script wrapper for development use
function createShellWrapper() {
  // Create the script content directly (don't include the shebang twice)
  const shellScript = `#!/usr/bin/env node

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
`;

  // Define bash wrapper outside conditionals so it's available everywhere
  const bashWrapper = `#!/bin/bash
node "$(dirname "$0")/nodejs-sidecar-direct.cjs" "$@"
`;

  // Create in binaries directory first
  const shellScriptPath = path.join(binariesDir, 'nodejs-sidecar-direct.cjs');
  fs.writeFileSync(shellScriptPath, shellScript, 'utf8');
  fs.chmodSync(shellScriptPath, 0o755); // Make executable
  
  console.log(`Created direct shell script at: ${shellScriptPath}`);
  
  // Create platform-specific wrappers for binaries directory
  if (process.platform === 'darwin' || process.platform === 'linux') {
    const bashWrapperPath = path.join(binariesDir, 'nodejs-sidecar');
    fs.writeFileSync(bashWrapperPath, bashWrapper, 'utf8');
    fs.chmodSync(bashWrapperPath, 0o755); // Make executable
    console.log(`Created bash wrapper at: ${bashWrapperPath}`);
  }
  
  // Also copy to debug directory if it exists
  if (fs.existsSync(debugDir)) {
    // Copy the shell script
    const debugScriptPath = path.join(debugDir, 'nodejs-sidecar-direct.cjs');
    fs.writeFileSync(debugScriptPath, shellScript, 'utf8');
    fs.chmodSync(debugScriptPath, 0o755); // Make executable
    console.log(`Copied shell script to debug directory: ${debugScriptPath}`);
    
    // Create bash wrapper in debug directory
    if (process.platform === 'darwin' || process.platform === 'linux') {
      const debugWrapperPath = path.join(debugDir, 'nodejs-sidecar');
      fs.writeFileSync(debugWrapperPath, bashWrapper, 'utf8');
      fs.chmodSync(debugWrapperPath, 0o755); // Make executable
      console.log(`Copied bash wrapper to debug directory: ${debugWrapperPath}`);
    }
  }
}

// Build the sidecar
async function buildSidecar() {
  try {
    // Install dependencies first
    console.log('Installing dependencies...');
    execSync('npm install', { 
      stdio: 'inherit',
      cwd: __dirname
    });

    // Make sure the index.js file exists
    const indexPath = path.join(__dirname, 'index.js');
    if (!fs.existsSync(indexPath)) {
      throw new Error('index.js file not found. Make sure it exists before building.');
    }
    console.log('Verified index.js file exists');
    
    // Create a direct shell script wrapper as fallback
    console.log('Creating shell wrapper...');
    createShellWrapper();
    
    // Try to build with pkg as usual (may still fail but we have the fallback)
    try {
      console.log('Building Node.js sidecar with PKG...');
      execSync('npx @yao-pkg/pkg --target host --output nodejs-sidecar index.js', { 
        stdio: 'inherit',
        cwd: __dirname
      });
    } catch (pkgError) {
      console.warn(`Warning: Failed to build with pkg: ${pkgError.message}`);
      console.log('Continuing with shell wrapper only');
    }
    
    console.log('Node.js sidecar build completed');
  } catch (error) {
    console.error(`Failed to build sidecar: ${error.message}`);
    process.exit(1);
  }
}

buildSidecar(); 