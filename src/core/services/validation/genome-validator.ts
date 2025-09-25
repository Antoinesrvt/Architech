/**
 * Genome Validator Service
 * 
 * Validates the entire genome before execution to ensure:
 * - All modules exist in the marketplace
 * - All dependencies are satisfied
 * - All parameters are valid according to schemas
 * - No conflicts between modules
 */

import { Module } from '@thearchitech.xyz/types';
import { Genome } from '@thearchitech.xyz/marketplace';
import { ModuleValidator } from './module-validator';
import { DependencyResolver } from './dependency-resolver';
import { ParameterValidator } from './parameter-validator';
import { AdapterLoader } from '../module-management/adapter/adapter-loader';

export interface GenomeValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  validatedModules: Module[];
  executionOrder: Module[];
}

export class GenomeValidator {
  private moduleValidator: ModuleValidator;
  private dependencyResolver: DependencyResolver;
  private parameterValidator: ParameterValidator;

  constructor(private adapterLoader: AdapterLoader) {
    this.moduleValidator = new ModuleValidator(adapterLoader);
    this.dependencyResolver = new DependencyResolver(adapterLoader);
    this.parameterValidator = new ParameterValidator(adapterLoader);
  }

  /**
   * Validate entire genome before execution
   */
  async validateGenome(genome: Genome): Promise<GenomeValidationResult> {
    console.log(`🔍 Validating genome: ${genome.project.name}`);
    
    const errors: string[] = [];
    const warnings: string[] = [];
    const validatedModules: Module[] = [];

    try {
      // Step 1: Validate project structure
      const projectValidation = this.validateProject(genome.project);
      if (!projectValidation.valid) {
        errors.push(...projectValidation.errors);
        return { valid: false, errors, warnings, validatedModules, executionOrder: [] };
      }

      // Step 2: Validate each module
      for (const module of genome.modules) {
        console.log(`  🔍 Validating module: ${module.id}`);
        
        const moduleValidation = await this.moduleValidator.validateModule(module);
        if (!moduleValidation.valid) {
          errors.push(`Module ${module.id}: ${moduleValidation.errors.join(', ')}`);
          continue;
        }

        // Step 3: Validate module parameters
        const parameterValidation = await this.parameterValidator.validateParameters(module);
        if (!parameterValidation.valid) {
          errors.push(`Module ${module.id} parameters: ${parameterValidation.errors.join(', ')}`);
          continue;
        }

        validatedModules.push(module);
        console.log(`  ✅ Module ${module.id} validated successfully`);
      }

      // Step 4: Resolve dependencies and check for conflicts
      let dependencyResult: any = null;
      if (validatedModules.length > 0) {
        dependencyResult = await this.dependencyResolver.resolveDependencies(validatedModules);
        if (!dependencyResult.valid) {
          errors.push(...dependencyResult.errors);
          return { valid: false, errors, warnings, validatedModules, executionOrder: [] };
        }

        warnings.push(...dependencyResult.warnings);
        console.log(`  ✅ Dependencies resolved successfully`);
      }

      const success = errors.length === 0;
      
      if (success) {
        console.log(`✅ Genome validation completed successfully`);
        console.log(`  📋 Validated modules: ${validatedModules.length}`);
        console.log(`  ⚠️  Warnings: ${warnings.length}`);
      } else {
        console.log(`❌ Genome validation failed with ${errors.length} errors`);
      }

      return {
        valid: success,
        errors,
        warnings,
        validatedModules,
        executionOrder: dependencyResult?.executionOrder || validatedModules
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      console.error(`❌ Genome validation failed: ${errorMessage}`);
      
      return {
        valid: false,
        errors: [`Genome validation failed: ${errorMessage}`],
        warnings,
        validatedModules,
        executionOrder: []
      };
    }
  }

  /**
   * Validate project structure
   */
  private validateProject(project: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!project.name) {
      errors.push('Project name is required');
    } else if (!/^[a-z0-9-]+$/.test(project.name)) {
      errors.push('Project name must be kebab-case (lowercase, numbers, hyphens only)');
    }

    if (!project.framework) {
      errors.push('Project framework is required');
    } else if (!['nextjs', 'react', 'vue', 'svelte'].includes(project.framework)) {
      errors.push(`Unsupported framework: ${project.framework}. Supported: nextjs, react, vue, svelte`);
    }

    if (!project.path) {
      errors.push('Project path is required');
    }

    if (!project.version) {
      errors.push('Project version is required');
    } else if (!/^\d+\.\d+\.\d+$/.test(project.version)) {
      errors.push('Project version must follow semantic versioning (e.g., 1.0.0)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
