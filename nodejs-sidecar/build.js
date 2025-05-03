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

// Build the sidecar
async function buildSidecar() {
  try {
    // Install dependencies first
    console.log('Installing dependencies...');
    execSync('npm install', { 
      stdio: 'inherit',
      cwd: __dirname
    });

    // Run pkg to create the binaries
    console.log('Building Node.js sidecar...');
    execSync('npx @yao-pkg/pkg . --output nodejs-sidecar', { 
      stdio: 'inherit',
      cwd: __dirname
    });

    // Find generated binaries and copy them to the Tauri binaries directory
    const files = fs.readdirSync(__dirname)
      .filter(file => file.startsWith('nodejs-sidecar'));

    if (files.length === 0) {
      throw new Error('No binaries were generated');
    }

    // Copy each binary to the Tauri binaries directory
    for (const binary of files) {
      const sourcePath = path.join(__dirname, binary);
      const targetPath = path.join(binariesDir, binary);
      
      console.log(`Copying ${sourcePath} to ${targetPath}`);
      fs.copyFileSync(sourcePath, targetPath);
      
      // Make executable on non-Windows platforms
      if (!isWindows) {
        fs.chmodSync(targetPath, 0o755); // rwxr-xr-x
        console.log(`Made ${targetPath} executable`);
      }
    }

    // Create or update the generic nodejs-sidecar symlink for the current platform
    const genericName = 'nodejs-sidecar' + extension;
    const genericPath = path.join(binariesDir, genericName);
    const currentBinary = files.find(file => file.includes(currentPlatform));
    
    if (currentBinary) {
      const currentBinaryPath = path.join(binariesDir, currentBinary);
      
      // Remove existing file if it exists
      if (fs.existsSync(genericPath)) {
        fs.unlinkSync(genericPath);
        console.log(`Removed existing file: ${genericPath}`);
      }
      
      // Create a copy (symlinks don't work well cross-platform with Tauri)
      fs.copyFileSync(currentBinaryPath, genericPath);
      
      // Make executable on non-Windows platforms
      if (!isWindows) {
        fs.chmodSync(genericPath, 0o755);
      }
      
      console.log(`Created generic binary at: ${genericPath}`);
    }
    
    console.log('Node.js sidecar build completed successfully!');
  } catch (error) {
    console.error(`Failed to build sidecar: ${error.message}`);
    process.exit(1);
  }
}

buildSidecar(); 