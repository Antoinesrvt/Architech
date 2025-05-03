#!/usr/bin/env node

/**
 * Build script for the Node.js command executor sidecar
 * This script packages the Node.js application into a standalone binary
 * for use with Tauri applications.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine platform-specific extension
const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const extension = isWindows ? '.exe' : '';

// Determine the current platform identifier for binaries
let currentPlatform = '';
if (isWindows) {
  currentPlatform = 'win-x64';
} else if (isMac) {
  const isArm64 = process.arch === 'arm64';
  currentPlatform = isArm64 ? 'macos-arm64' : 'macos-x64';
} else {
  // Linux
  currentPlatform = 'linux-x64';
}

console.log(`Current platform: ${currentPlatform}`);

// Determine the Rust target triple from rustc if available
let rustTarget = '';
try {
  const rustcOutput = execSync('rustc -vV', { encoding: 'utf-8' });
  const targetMatch = rustcOutput.match(/host: (.*)/);
  if (targetMatch && targetMatch[1]) {
    rustTarget = targetMatch[1].trim();
    console.log(`Detected Rust target triple: ${rustTarget}`);
  } else {
    console.warn('Could not determine Rust target triple from rustc output');
  }
} catch (error) {
  console.warn(`Could not determine Rust target triple: ${error.message}`);
}

// Create the binaries directory in the src-tauri folder
const binariesDir = path.resolve(__dirname, '..', 'src-tauri', 'binaries');
if (!fs.existsSync(binariesDir)) {
  console.log(`Creating binaries directory at ${binariesDir}`);
  fs.mkdirSync(binariesDir, { recursive: true });
}

// Build the sidecar binary
console.log('Building Node.js sidecar...');
try {
  // Run pkg to create the binary
  execSync('npx @yao-pkg/pkg . --output nodejs-sidecar', { 
    stdio: 'inherit',
    cwd: __dirname
  });

  // Find the generated binary files
  const files = fs.readdirSync(__dirname);
  const binaries = files.filter(file => file.startsWith('nodejs-sidecar'));

  if (binaries.length === 0) {
    throw new Error('No binaries were generated');
  }

  // Copy each binary to the Tauri binaries directory
  binaries.forEach(binary => {
    const sourcePath = path.join(__dirname, binary);
    const targetPath = path.join(binariesDir, binary);
    
    console.log(`Copying ${sourcePath} to ${targetPath}`);
    fs.copyFileSync(sourcePath, targetPath);
    
    // Make executable on non-Windows platforms
    if (!isWindows) {
      fs.chmodSync(targetPath, 0o755); // rwxr-xr-x
      console.log(`Made ${targetPath} executable`);
    }
    
    console.log(`Successfully copied binary to ${targetPath}`);
    
    // If this binary matches the current platform, create a generic nodejs-sidecar link
    if (binary.includes(currentPlatform)) {
      const genericName = 'nodejs-sidecar' + extension;
      const genericPath = path.join(binariesDir, genericName);
      
      console.log(`Creating generic binary for current platform (${currentPlatform}): ${genericPath}`);
      
      // Remove existing file if it exists
      if (fs.existsSync(genericPath)) {
        fs.unlinkSync(genericPath);
        console.log(`Removed existing file: ${genericPath}`);
      }
      
      // Create a copy (symlinks don't work well cross-platform with Tauri)
      fs.copyFileSync(targetPath, genericPath);
      
      // Make executable on non-Windows platforms
      if (!isWindows) {
        fs.chmodSync(genericPath, 0o755); // rwxr-xr-x
      }
      
      console.log(`Created generic binary at: ${genericPath}`);
    }
  });
  
  console.log('Node.js sidecar build completed successfully!');
} catch (error) {
  console.error(`Failed to build sidecar: ${error.message}`);
  process.exit(1);
} 