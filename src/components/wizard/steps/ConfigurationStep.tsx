import { useFrameworkStore } from '@/lib/store/framework-store';
import type { Module, ModuleOption } from '@/lib/store/framework-store';
import { useProjectStore } from '@/lib/store/project-store';
import { cn } from '@/lib/utils/cn';
import { useEffect, useState } from 'react';
import WizardCard from '../WizardCard';
import type { WizardStepProps } from '../types';

export function ConfigurationStep({ onNext, onPrevious, canGoNext, canGoPrevious, onBackToDashboard }: WizardStepProps) {
  const { modules, frameworks } = useFrameworkStore();
  const { 
    selectedFrameworkId,
    selectedModuleIds,
    moduleConfigurations,
    setModuleConfiguration,
    projectName,
    saveDraft,
    lastSaved
  } = useProjectStore();

  // State for framework options (though they're fixed for now)
  const [frameworkOptions, setFrameworkOptions] = useState({
    typescript: true,
    app_router: true,
    eslint: true
  });

  // Get the selected framework
  const selectedFramework = frameworks.find(f => f.id === selectedFrameworkId);

  // Get the selected modules
  const selectedModules = modules.filter(module => selectedModuleIds.includes(module.id));

  // Handle configuration change for a module option
  const handleModuleOptionChange = (moduleId: string, optionId: string, value: unknown) => {
    const updatedOptions = {
      ...(moduleConfigurations[moduleId] || {}),
      [optionId]: value
    };
    setModuleConfiguration(moduleId, updatedOptions);
  };

  // Handle framework option change
  const handleFrameworkOptionChange = (option: string, value: boolean) => {
    setFrameworkOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };

  // Render different input types based on option type
  const renderOptionInput = (module: Module, option: ModuleOption) => {
    const currentValue = moduleConfigurations[module.id] && moduleConfigurations[module.id][option.id] !== undefined 
      ? moduleConfigurations[module.id][option.id] 
      : option.default;
    
    switch (option.type) {
      case 'boolean':
        return (
          <div className="form-control">
            <label className="label cursor-pointer justify-start">
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={!!currentValue}
                onChange={(e) => { handleModuleOptionChange(module.id, option.id, e.target.checked); }}
              />
              <span className="label-text ml-2">{option.label || option.description}</span>
            </label>
          </div>
        );
        
      case 'select':
        return (
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">{option.label || option.description}</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={currentValue as string}
              onChange={(e) => { handleModuleOptionChange(module.id, option.id, e.target.value); }}
            >
              {option.choices?.map(choice => (
                <option key={choice.value} value={choice.value}>{choice.label}</option>
              ))}
            </select>
          </div>
        );
      default:
        return (
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">{option.label || option.description}</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={currentValue as string}
              onChange={(e) => { handleModuleOptionChange(module.id, option.id, e.target.value); }}
            />
          </div>
        );
    }
  };

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  
  // Initial form setup
  const [form, setForm] = useState({
    useTypescript: true,
    usePrettier: true,
    useEslint: true,
    useDocker: false,
    includeTests: false,
    packageManager: 'npm',
    deployTarget: 'vercel',
    cssProcessor: 'tailwind',
  });
  
  // When configuration changes in store, update form
  useEffect(() => {
    // Initialize form with defaults
    setForm({
      useTypescript: true,
      usePrettier: true,
      useEslint: true,
      useDocker: false,
      includeTests: false,
      packageManager: 'npm',
      deployTarget: 'vercel',
      cssProcessor: 'tailwind',
    });
  }, []);

  // Handle field change
  const handleChange = (field: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    
    // Clear any error for this field
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        // Use a proper way to remove a property instead of dynamic delete
        const { [field]: _, ...rest } = newErrors;
        return rest;
      });
    }
  };
  
  // Handle form submission
  const handleSave = () => {
    // Validate form
    const newErrors: Record<string, string> = {};
    
    // Check if any modules require TypeScript but TypeScript is disabled
    const requiresTs = selectedModuleIds.some(id => id === 'typescript' || id === 'zod' || id === 'tRPC');
    if (requiresTs && !form.useTypescript) {
      newErrors.useTypescript = 'Some selected modules require TypeScript';
    }
    
    // Update errors state
    setFormErrors(newErrors);
    
    // If no errors, update store
    if (Object.keys(newErrors).length === 0) {
      // Save module specific configurations via moduleConfigurations
      try {
        await saveDraft();
        setHasChanges(false);
      } catch (error) {
        console.error('Failed to save draft:', error);
      }
    }
    
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle next button click
  const handleNext = () => {
    const isValid = handleSave();
    if (isValid) {
      onNext();
    }
  };
  
  // Form validation
  const isFormValid = Object.keys(formErrors).length === 0;
  
  return (
    <WizardCard
      title="Project Configuration"
      description="Customize your project configuration settings"
      canGoPrevious={canGoPrevious}
      canGoNext={canGoNext && isFormValid}
      onPrevious={onPrevious}
      onNext={handleNext}
      onBackToDashboard={onBackToDashboard}
      isFormValid={isFormValid}
      lastSavedTime={lastSaved}
      hasChanges={hasChanges}
      onSave={handleSave}
      stepNumber={4}
      totalSteps={5}
    >
      <div className="space-y-6">
        {/* Form warning */}
        {Object.keys(formErrors).length > 0 && (
          <div className="alert alert-warning">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <h3 className="font-bold">Configuration Errors</h3>
              <ul className="list-disc pl-5">
                {Object.entries(formErrors).map(([key, error]) => (
                  <li key={key}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Language Settings */}
        <div className="form-control">
          <h3 className="text-lg font-medium mb-2">Language Settings</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="label cursor-pointer justify-start gap-4">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={form.useTypescript}
                  onChange={(e) => { handleChange('useTypescript', e.target.checked); }}
                />
                <div>
                  <span className="label-text font-medium">Use TypeScript</span>
                  <p className="text-xs text-base-content/70">
                    Add type safety to your project
                  </p>
                </div>
              </label>
              {formErrors.useTypescript && (
                <div className="text-error text-sm mt-1">
                  {formErrors.useTypescript}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Development Tools */}
        <div className="form-control">
          <h3 className="text-lg font-medium mb-2">Development Tools</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="label cursor-pointer justify-start gap-4">
              <input
                type="checkbox"
                className="checkbox"
                checked={form.usePrettier}
                onChange={(e) => { handleChange('usePrettier', e.target.checked); }}
              />
              <div>
                <span className="label-text font-medium">Use Prettier</span>
                <p className="text-xs text-base-content/70">
                  Add code formatting
                </p>
              </div>
            </label>

            <label className="label cursor-pointer justify-start gap-4">
              <input
                type="checkbox"
                className="checkbox"
                checked={form.useEslint}
                onChange={(e) => { handleChange('useEslint', e.target.checked); }}
              />
              <div>
                <span className="label-text font-medium">Use ESLint</span>
                <p className="text-xs text-base-content/70">
                  Add code linting
                </p>
              </div>
            </label>

            <label className="label cursor-pointer justify-start gap-4">
              <input
                type="checkbox"
                className="checkbox"
                checked={form.includeTests}
                onChange={(e) => { handleChange('includeTests', e.target.checked); }}
              />
              <div>
                <span className="label-text font-medium">Include Tests</span>
                <p className="text-xs text-base-content/70">
                  Set up testing infrastructure
                </p>
              </div>
            </label>

            <label className="label cursor-pointer justify-start gap-4">
              <input
                type="checkbox"
                className="checkbox"
                checked={form.useDocker}
                onChange={(e) => { handleChange('useDocker', e.target.checked); }}
              />
              <div>
                <span className="label-text font-medium">Use Docker</span>
                <p className="text-xs text-base-content/70">
                  Add Docker configuration
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Package Manager */}
        <div className="form-control">
          <h3 className="text-lg font-medium mb-2">Package Manager</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="label cursor-pointer justify-start gap-4">
              <input
                type="radio"
                name="packageManager"
                className="radio"
                checked={form.packageManager === 'npm'}
                onChange={() => { handleChange('packageManager', 'npm'); }}
              />
              <span className="label-text font-medium">npm</span>
            </label>

            <label className="label cursor-pointer justify-start gap-4">
              <input
                type="radio"
                name="packageManager"
                className="radio"
                checked={form.packageManager === 'yarn'}
                onChange={() => { handleChange('packageManager', 'yarn'); }}
              />
              <span className="label-text font-medium">Yarn</span>
            </label>

            <label className="label cursor-pointer justify-start gap-4">
              <input
                type="radio"
                name="packageManager"
                className="radio"
                checked={form.packageManager === 'pnpm'}
                onChange={() => { handleChange('packageManager', 'pnpm'); }}
              />
              <span className="label-text font-medium">pnpm</span>
            </label>
          </div>
        </div>

        {/* CSS Processor */}
        <div className="form-control">
          <h3 className="text-lg font-medium mb-2">CSS Processor</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="label cursor-pointer justify-start gap-4">
              <input
                type="radio"
                name="cssProcessor"
                className="radio"
                checked={form.cssProcessor === 'tailwind'}
                onChange={() => { handleChange('cssProcessor', 'tailwind'); }}
              />
              <span className="label-text font-medium">Tailwind CSS</span>
            </label>

            <label className="label cursor-pointer justify-start gap-4">
              <input
                type="radio"
                name="cssProcessor"
                className="radio"
                checked={form.cssProcessor === 'scss'}
                onChange={() => { handleChange('cssProcessor', 'scss'); }}
              />
              <span className="label-text font-medium">SCSS</span>
            </label>

            <label className="label cursor-pointer justify-start gap-4">
              <input
                type="radio"
                name="cssProcessor"
                className="radio"
                checked={form.cssProcessor === 'css'}
                onChange={() => { handleChange('cssProcessor', 'css'); }}
              />
              <span className="label-text font-medium">Plain CSS</span>
            </label>
          </div>
        </div>

        {/* Deployment Target */}
        <div className="form-control">
          <h3 className="text-lg font-medium mb-2">Deployment Target</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="label cursor-pointer justify-start gap-4">
              <input
                type="radio"
                name="deployTarget"
                className="radio"
                checked={form.deployTarget === 'vercel'}
                onChange={() => { handleChange('deployTarget', 'vercel'); }}
              />
              <span className="label-text font-medium">Vercel</span>
            </label>

            <label className="label cursor-pointer justify-start gap-4">
              <input
                type="radio"
                name="deployTarget"
                className="radio"
                checked={form.deployTarget === 'netlify'}
                onChange={() => { handleChange('deployTarget', 'netlify'); }}
              />
              <span className="label-text font-medium">Netlify</span>
            </label>

            <label className="label cursor-pointer justify-start gap-4">
              <input
                type="radio"
                name="deployTarget"
                className="radio"
                checked={form.deployTarget === 'none'}
                onChange={() => { handleChange('deployTarget', 'none'); }}
              />
              <span className="label-text font-medium">None</span>
            </label>
          </div>
        </div>
      </div>
    </WizardCard>
  );
}