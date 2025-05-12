#!/usr/bin/env node

/**
 * Build script to automate the process of building the Node.js sidecar 
 * and moving the binaries to the correct location for Tauri to use.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

console.log('🚀 Starting Node.js sidecar build process');

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine OS and architecture
const os = process.platform;
let extension = '';
if (os === 'win32') {
  extension = '.exe';
}

// Create directories if they don't exist
const sidecarDir = path.join(__dirname, 'nodejs-sidecar');
const binariesDir = path.join(__dirname, 'src-tauri', 'binaries');

if (!fs.existsSync(sidecarDir)) {
  console.error('❌ Error: nodejs-sidecar directory does not exist.');
  process.exit(1);
}

if (!fs.existsSync(binariesDir)) {
  console.log('📁 Creating binaries directory');
  fs.mkdirSync(binariesDir, { recursive: true });
}

try {
  // Change to the sidecar directory
  process.chdir(sidecarDir);
  console.log(`📂 Changed directory to: ${sidecarDir}`);
  
  // Install dependencies
  console.log('📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  // Build the sidecar
  console.log('🔧 Building Node.js sidecar...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // Just output success message - the sidecar build script handles copying
  console.log('✨ Node.js sidecar build process completed successfully!');
} catch (error) {
  console.error(`❌ Error during build process: ${error.message}`);
  process.exit(1);
} 