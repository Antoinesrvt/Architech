import { useState } from 'react';
import { useFrameworkStore } from '@/lib/store/framework-store';
import { Module, ModuleOption } from '@/lib/store/framework-store';
import { cn } from '@/lib/utils/cn';

export function ConfigurationStep() {
  const { modules, frameworks } = useFrameworkStore();
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<string | null>(null);
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [moduleConfigurations, setModuleConfigurations] = useState<Record<string, Record<string, any>>>({});

  // Get the selected framework
  const selectedFramework = selectedFrameworkId 
    ? frameworks.find(f => f.id === selectedFrameworkId)
    : null;

  // Get the selected modules
  const selectedModules = modules.filter(module => selectedModuleIds.includes(module.id));

  // Handle configuration change for a module option
  const handleConfigChange = (moduleId: string, optionName: string, value: any) => {
    setModuleConfigurations(prev => ({
      ...prev,
      [moduleId]: {
        ...(prev[moduleId] || {}),
        [optionName]: value,
      }
    }));
  };

  // Render different input types based on option type
  const renderOptionInput = (module: Module, option: ModuleOption) => {
    const currentValue = moduleConfigurations[module.id]?.[option.name] ?? option.default;
    
    switch (option.type) {
      case 'boolean':
        return (
          <div className="form-control">
            <label className="label cursor-pointer justify-start">
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={!!currentValue}
                onChange={(e) => handleConfigChange(module.id, option.name, e.target.checked)}
              />
              <span className="label-text ml-2">{option.description}</span>
            </label>
          </div>
        );
        
      case 'select':
        return (
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">{option.description}</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={currentValue as string}
              onChange={(e) => handleConfigChange(module.id, option.name, e.target.value)}
            >
              {option.options?.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        );
        
      case 'string':
      default:
        return (
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">{option.description}</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={currentValue as string}
              onChange={(e) => handleConfigChange(module.id, option.name, e.target.value)}
            />
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <h2 className="text-2xl font-bold">Configure Your Project</h2>
      <p className="text-base-content/70">
        Set up the configuration options for your selected framework and modules.
      </p>

      {/* Framework configuration section */}
      {selectedFramework && (
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body">
            <h3 className="card-title">{selectedFramework.name} Configuration</h3>
            
            <div className="form-control">
              <label className="label cursor-pointer justify-start">
                <input type="checkbox" className="toggle toggle-primary" checked={true} />
                <span className="label-text ml-2">TypeScript</span>
              </label>
            </div>
            
            {selectedFramework.id.includes('next') && (
              <div className="form-control">
                <label className="label cursor-pointer justify-start">
                  <input type="checkbox" className="toggle toggle-primary" checked={true} />
                  <span className="label-text ml-2">Use App Router</span>
                </label>
              </div>
            )}
            
            <div className="form-control">
              <label className="label cursor-pointer justify-start">
                <input type="checkbox" className="toggle toggle-primary" checked={true} />
                <span className="label-text ml-2">ESLint</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Module configuration sections */}
      {selectedModules.length > 0 ? (
        selectedModules.map(module => (
          <div key={module.id} className="card bg-base-200 shadow-sm">
            <div className="card-body">
              <h3 className="card-title">{module.name} Configuration</h3>
              
              {module.configuration.options.length > 0 ? (
                <div className="space-y-4">
                  {module.configuration.options.map(option => (
                    <div key={option.name}>
                      {renderOptionInput(module, option)}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-base-content/70">No configuration options available for this module.</p>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>No modules have been selected. Go back to the modules step to select some modules.</span>
        </div>
      )}
    </div>
  );
} 