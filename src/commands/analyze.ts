/**
 * Analyze Command
 * 
 * Analyzes existing GitHub repositories and detects their architecture
 */

import { Command } from 'commander';
import { Logger } from '../core/services/infrastructure/logging/logger.js';
import { GenomeDetector } from '../core/services/analysis/genome-detector.js';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, basename } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export function createAnalyzeCommand(): Command {
  const command = new Command('analyze');
  
  command
    .description('Analyze existing GitHub repository and detect its architecture')
    .argument('<repo-url>', 'GitHub repository URL or local path')
    .option('-o, --output <file>', 'Output file for detected genome')
    .option('-f, --format <format>', 'Output format (json|typescript)', 'typescript')
    .option('-t, --temp-dir <dir>', 'Temporary directory for cloning', '/tmp/architech-analyze')
    .option('-v, --verbose', 'Enable verbose logging')
    .option('--no-clone', 'Skip cloning, analyze local directory')
    .action(async (repoUrl: string, options: AnalyzeOptions) => {
      const logger = new Logger();
      
      try {
        Logger.info(`🔍 Analyzing repository: ${repoUrl}`);
        
        let projectPath: string;
        
        // Determine if it's a local path or GitHub URL
        if (options.noClone || !isGitHubUrl(repoUrl)) {
          projectPath = repoUrl;
          Logger.info(`📁 Analyzing local directory: ${projectPath}`);
        } else {
          // Clone repository temporarily
          projectPath = await cloneRepository(repoUrl, options.tempDir, logger);
        }
        
        // Analyze with GenomeDetector
        const detector = new GenomeDetector();
        const detectedGenome = await detector.analyzeProject(projectPath);
        
        // Generate genome file
        const genomeContent = generateGenomeFile(detectedGenome, options.format);
        
        // Save or display result
        if (options.output) {
          await writeFile(options.output, genomeContent);
          Logger.info(`✅ Genome saved to: ${options.output}`);
        } else {
          console.log(genomeContent);
        }
        
        // Display analysis summary
        displayAnalysisSummary(detectedGenome, logger);
        
        // Cleanup if we cloned
        if (!options.noClone && isGitHubUrl(repoUrl)) {
          await cleanupTempDirectory(projectPath, logger);
        }
        
      } catch (error) {
        Logger.error(`❌ Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
      }
    });
  
  return command;
}

interface AnalyzeOptions {
  output?: string;
  format: 'json' | 'typescript';
  tempDir: string;
  verbose: boolean;
  noClone: boolean;
}

/**
 * Check if URL is a GitHub URL
 */
function isGitHubUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname === 'github.com';
  } catch {
    return false;
  }
}

/**
 * Clone repository to temporary directory
 */
async function cloneRepository(repoUrl: string, tempDir: string, logger: Logger): Promise<string> {
  try {
    // Create temp directory
    await mkdir(tempDir, { recursive: true });
    
    // Generate unique directory name
    const repoName = basename(repoUrl, '.git');
    const timestamp = Date.now();
    const cloneDir = join(tempDir, `${repoName}-${timestamp}`);
    
    Logger.info(`📥 Cloning repository to: ${cloneDir}`);
    
    // Clone repository
    const { stdout, stderr } = await execAsync(`git clone ${repoUrl} ${cloneDir}`);
    
    if (stderr && !stderr.includes('Cloning into')) {
      Logger.warn(`Git warning: ${stderr}`);
    }
    
    Logger.info(`✅ Repository cloned successfully`);
    return cloneDir;
    
  } catch (error) {
    throw new Error(`Failed to clone repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate genome file content
 */
function generateGenomeFile(genome: any, format: 'json' | 'typescript'): string {
  if (format === 'json') {
    return JSON.stringify(genome, null, 2);
  }
  
  // Generate TypeScript genome
  const adapters = genome.modules.adapters.map((adapter: any) => `    '${adapter.id}'`).join(',\n');
  const integrators = genome.modules.integrators.map((integrator: any) => `    '${integrator.id}'`).join(',\n');
  const features = genome.modules.features.map((feature: any) => `    '${feature.id}'`).join(',\n');
  
  return `import { Genome } from '@thearchitech.xyz/marketplace-types';

export const detectedGenome: Genome = {
  project: {
    name: '${genome.project.name}',
    description: '${genome.project.description}',
    version: '${genome.project.version}'
  },
  modules: {
    adapters: [
${adapters}
    ],
    integrators: [
${integrators}
    ],
    features: [
${features}
    ]
  }
};

// Analysis confidence: ${genome.confidence}%
// Files analyzed: ${genome.analysis.filesAnalyzed}
// Dependencies found: ${genome.analysis.dependenciesFound}
// Patterns matched: ${genome.analysis.patternsMatched}
${genome.analysis.warnings.length > 0 ? `\n// Warnings:\n${genome.analysis.warnings.map((w: string) => `// - ${w}`).join('\n')}` : ''}
`;
}

/**
 * Display analysis summary
 */
function displayAnalysisSummary(genome: any, logger: Logger): void {
  Logger.info('\n📊 Analysis Summary:');
  Logger.info(`   Project: ${genome.project.name}`);
  Logger.info(`   Framework: ${genome.project.framework}`);
  Logger.info(`   Confidence: ${genome.confidence}%`);
  Logger.info(`   Adapters: ${genome.modules.adapters.length}`);
  Logger.info(`   Integrators: ${genome.modules.integrators.length}`);
  Logger.info(`   Features: ${genome.modules.features.length}`);
  
  if (genome.analysis.warnings.length > 0) {
    Logger.warn('\n⚠️  Warnings:');
    genome.analysis.warnings.forEach((warning: string) => {
      Logger.warn(`   - ${warning}`);
    });
  }
  
  Logger.info('\n🔧 Detected Modules:');
  genome.modules.adapters.forEach((adapter: any) => {
    Logger.info(`   📦 ${adapter.id} (${adapter.confidence}%)`);
  });
  genome.modules.integrators.forEach((integrator: any) => {
    Logger.info(`   🔗 ${integrator.id} (${integrator.confidence}%)`);
  });
  genome.modules.features.forEach((feature: any) => {
    Logger.info(`   ⭐ ${feature.id} (${feature.confidence}%)`);
  });
}

/**
 * Cleanup temporary directory
 */
async function cleanupTempDirectory(tempPath: string, logger: Logger): Promise<void> {
  try {
    await execAsync(`rm -rf ${tempPath}`);
    Logger.info(`🧹 Cleaned up temporary directory: ${tempPath}`);
  } catch (error) {
    Logger.warn(`Failed to cleanup temporary directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
