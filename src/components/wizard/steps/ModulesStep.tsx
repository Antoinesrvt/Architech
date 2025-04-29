import { useState, useEffect } from 'react';
import { useFrameworkStore } from '@/lib/store/framework-store';
import { Module } from '@/lib/store/framework-store';
import ModuleCard from '../ModuleCard';
import { cn } from '@/lib/utils/cn';

type ModuleCategory = 'all' | 'styling' | 'ui' | 'state' | 'i18n' | 'forms' | 'testing' | 'advanced';

export function ModulesStep() {
  const { modules, frameworks } = useFrameworkStore();
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ModuleCategory>('all');
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<string | null>(null);
  
  // Get the selected framework
  const selectedFramework = selectedFrameworkId 
    ? frameworks.find(f => f.id === selectedFrameworkId)
    : null;

  // Filter modules based on search, category, and compatibility with selected framework
  const filteredModules = modules
    .filter(module => {
      // Filter by search query
      if (searchQuery && !module.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !module.description.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Filter by category
      if (selectedCategory !== 'all' && module.category !== selectedCategory) {
        return false;
      }
      
      // Filter by framework compatibility
      if (selectedFramework && !selectedFramework.compatibleModules.includes(module.id)) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      // Sort by selected status first
      const aSelected = selectedModules.includes(a.id);
      const bSelected = selectedModules.includes(b.id);
      
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      
      // Then sort alphabetically
      return a.name.localeCompare(b.name);
    });

  // Check if a module can be toggled based on dependencies and incompatibilities
  const canToggleModule = (module: Module, selected: boolean) => {
    // If we're trying to deselect a module, make sure no selected module depends on it
    if (selected) {
      const selectedDependentModules = modules
        .filter(m => selectedModules.includes(m.id) && m.dependencies.includes(module.id));
      
      if (selectedDependentModules.length > 0) {
        return {
          can: false,
          reason: `Cannot remove ${module.name} because it is required by: ${selectedDependentModules.map(m => m.name).join(', ')}`
        };
      }
    } 
    // If we're trying to select a module, check for incompatibilities
    else {
      // Check if this module is incompatible with any already selected module
      const incompatibleModules = modules
        .filter(m => selectedModules.includes(m.id) && 
          (m.incompatibleWith.includes(module.id) || module.incompatibleWith.includes(m.id)));
      
      if (incompatibleModules.length > 0) {
        return {
          can: false,
          reason: `${module.name} is incompatible with: ${incompatibleModules.map(m => m.name).join(', ')}`
        };
      }
    }
    
    return { can: true };
  };

  // Handle module toggle
  const handleModuleToggle = (module: Module) => {
    const isSelected = selectedModules.includes(module.id);
    const toggle = canToggleModule(module, isSelected);
    
    if (!toggle.can) {
      // Show error message
      console.error(toggle.reason);
      return;
    }
    
    if (isSelected) {
      // Remove module from selection
      setSelectedModules(selectedModules.filter(id => id !== module.id));
    } else {
      // Add module and its dependencies to selection
      const newSelection = [...selectedModules, module.id];
      
      // Also add all dependencies
      const allDependencies = [...module.dependencies];
      
      // Add module and all dependencies
      setSelectedModules([...new Set([...newSelection, ...allDependencies])]);
    }
  };

  // Group modules by category for better organization
  const modulesByCategory: Record<ModuleCategory, Module[]> = {
    all: filteredModules,
    styling: filteredModules.filter(m => m.category === 'styling'),
    ui: filteredModules.filter(m => m.category === 'ui'),
    state: filteredModules.filter(m => m.category === 'state'),
    i18n: filteredModules.filter(m => m.category === 'i18n'),
    forms: filteredModules.filter(m => m.category === 'forms'),
    testing: filteredModules.filter(m => m.category === 'testing'),
    advanced: filteredModules.filter(m => m.category === 'advanced'),
  };

  // Get counts by category
  const countsByCategory = Object.entries(modulesByCategory).reduce(
    (acc, [category, modules]) => {
      acc[category as ModuleCategory] = modules.length;
      return acc;
    },
    {} as Record<ModuleCategory, number>
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <h2 className="text-2xl font-bold">Select Modules</h2>
      <p className="text-base-content/70">
        Choose the modules you want to include in your project. 
        {selectedFramework && (
          <span> Showing modules compatible with <strong>{selectedFramework.name}</strong>.</span>
        )}
      </p>

      {/* Search and filter bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="form-control flex-grow">
          <div className="input-group">
            <input 
              type="text" 
              placeholder="Search modules..." 
              className="input input-bordered w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="btn btn-square">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Category tabs */}
      <div className="tabs tabs-boxed">
        <button 
          className={cn("tab", selectedCategory === 'all' && "tab-active")}
          onClick={() => setSelectedCategory('all')}
        >
          All ({countsByCategory.all || 0})
        </button>
        <button 
          className={cn("tab", selectedCategory === 'styling' && "tab-active")}
          onClick={() => setSelectedCategory('styling')}
        >
          Styling ({countsByCategory.styling || 0})
        </button>
        <button 
          className={cn("tab", selectedCategory === 'ui' && "tab-active")}
          onClick={() => setSelectedCategory('ui')}
        >
          UI ({countsByCategory.ui || 0})
        </button>
        <button 
          className={cn("tab", selectedCategory === 'state' && "tab-active")}
          onClick={() => setSelectedCategory('state')}
        >
          State ({countsByCategory.state || 0})
        </button>
        <button 
          className={cn("tab", selectedCategory === 'i18n' && "tab-active")}
          onClick={() => setSelectedCategory('i18n')}
        >
          i18n ({countsByCategory.i18n || 0})
        </button>
        <button 
          className={cn("tab", selectedCategory === 'forms' && "tab-active")}
          onClick={() => setSelectedCategory('forms')}
        >
          Forms ({countsByCategory.forms || 0})
        </button>
        <button 
          className={cn("tab", selectedCategory === 'testing' && "tab-active")}
          onClick={() => setSelectedCategory('testing')}
        >
          Testing ({countsByCategory.testing || 0})
        </button>
      </div>

      {/* Modules grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(selectedCategory === 'all' ? filteredModules : modulesByCategory[selectedCategory]).map(module => (
          <ModuleCard
            key={module.id}
            module={module}
            selected={selectedModules.includes(module.id)}
            onToggle={() => handleModuleToggle(module)}
          />
        ))}
        
        {filteredModules.length === 0 && (
          <div className="col-span-3 text-center py-8">
            <p className="text-base-content/50">No modules found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Selected modules summary */}
      {selectedModules.length > 0 && (
        <div className="alert alert-success shadow-lg transition-all duration-300">
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              You've selected {selectedModules.length} module{selectedModules.length !== 1 ? 's' : ''}.
            </span>
          </div>
        </div>
      )}
    </div>
  );
} 