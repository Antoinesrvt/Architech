"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MainLayout from "@/components/layouts/MainLayout";
import FrameworkCard from "@/components/project/FrameworkCard";
import ModuleCard from "@/components/wizard/ModuleCard";
import ProgressIndicator from "@/components/wizard/ProgressIndicator";
import { useFrameworkStore, useProjectStore, useSettingsStore } from "@/lib/store";
import { frameworkService } from "@/lib/api";
import { generateUUID } from "@/lib/utils";
import { validateProjectName, validateProjectPath } from "@/lib/utils/validation";
import { Framework, Module, ModuleOption } from "@/lib/store/framework-store";
import { GenerationProgress } from "@/lib/api/types";

type WizardStep = "framework" | "config" | "modules" | "module-config" | "generating";

export default function NewProject() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const frameworkId = searchParams.get("framework");
  
  const { frameworks, modules } = useFrameworkStore();
  const { addProject } = useProjectStore();
  const { defaultProjectPath } = useSettingsStore();
  const api = frameworkService;

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>("framework");
  const [selectedFramework, setSelectedFramework] = useState<Framework | null>(null);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  
  // Module configuration state
  const [moduleConfigs, setModuleConfigs] = useState<Record<string, Record<string, any>>>({});
  
  // Project configuration
  const [projectName, setProjectName] = useState("");
  const [projectPath, setProjectPath] = useState(defaultProjectPath);
  const [useTypeScript, setUseTypeScript] = useState(true);
  const [useAppRouter, setUseAppRouter] = useState(true);
  const [useEslint, setUseEslint] = useState(true);
  
  // Generation state
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedProjectPath, setGeneratedProjectPath] = useState<string | null>(null);

  // Validation errors
  const [nameError, setNameError] = useState("");
  const [pathError, setPathError] = useState("");

  // Initialize with framework if provided in URL
  useEffect(() => {
    if (frameworkId && frameworks.length > 0) {
      const framework = frameworks.find(f => f.id === frameworkId);
      if (framework) {
        setSelectedFramework(framework);
        setCurrentStep("config");
      }
    }
  }, [frameworkId, frameworks]);

  // Set up progress listener
  useEffect(() => {
    if (currentStep === "generating") {
      const unsubscribe = api.listenToProgress((progress) => {
        setGenerationProgress(progress);
        if (progress.step === "complete") {
          setIsComplete(true);
          setIsGenerating(false);
        }
      });
      
      return () => {
        unsubscribe();
      };
    }
  }, [currentStep, api]);

  // Initialize module configs when modules are selected
  useEffect(() => {
    // Initialize config for newly selected modules with default values
    const selectedModuleObjects = modules.filter(m => selectedModules.includes(m.id));
    
    const newConfigs = { ...moduleConfigs };
    
    selectedModuleObjects.forEach(module => {
      if (!newConfigs[module.id]) {
        // Initialize with default values
        const config: Record<string, any> = {};
        module.configuration.options.forEach(option => {
          config[option.name] = option.default;
        });
        newConfigs[module.id] = config;
      }
    });
    
    setModuleConfigs(newConfigs);
  }, [selectedModules, modules]);

  // Handle framework selection
  const handleFrameworkSelect = (framework: Framework) => {
    setSelectedFramework(framework);
    setCurrentStep("config");
    
    // Pre-select compatible modules
    if (framework.compatibleModules.length > 0) {
      setSelectedModules(framework.compatibleModules);
    }
  };

  // Handle module toggle
  const handleModuleToggle = (moduleId: string, selected: boolean) => {
    if (selected) {
      // Check dependencies
      const module = modules.find(m => m.id === moduleId);
      if (module) {
        // Add dependencies
        const allToAdd = [...module.dependencies.filter(depId => !selectedModules.includes(depId)), moduleId];
        setSelectedModules(prev => [...prev, ...allToAdd]);
      } else {
        setSelectedModules(prev => [...prev, moduleId]);
      }
    } else {
      // Check if other modules depend on this one
      const dependentModules = modules.filter(m => 
        selectedModules.includes(m.id) && m.dependencies.includes(moduleId)
      );
      
      if (dependentModules.length > 0) {
        // Show warning or handle dependent modules
        const dependentNames = dependentModules.map(m => m.name).join(", ");
        alert(`Cannot remove ${moduleId} because it's required by: ${dependentNames}`);
        return;
      }
      
      setSelectedModules(prev => prev.filter(id => id !== moduleId));
    }
  };

  // Handle module config change
  const handleModuleConfigChange = (moduleId: string, optionName: string, value: any) => {
    setModuleConfigs(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        [optionName]: value
      }
    }));
  };

  // Handle project path browse
  const handleBrowseProjectPath = async () => {
    const path = await api.browseForDirectory();
    if (path) {
      setProjectPath(path);
      validatePath(path);
    }
  };

  // Validate project name
  const validateName = (name: string) => {
    const error = validateProjectName(name);
    setNameError(error);
    return !error;
  };

  // Validate project path
  const validatePath = (path: string) => {
    const error = validateProjectPath(path);
    setPathError(error);
    return !error;
  };

  // Handle project generation
  const handleGenerateProject = async () => {
    // Validate inputs
    const isNameValid = validateName(projectName);
    const isPathValid = validatePath(projectPath);
    
    if (!isNameValid || !isPathValid) {
      return;
    }
    
    try {
      setIsGenerating(true);
      setCurrentStep("generating");
      
      // Create module configs
      const moduleConfigsArray = selectedModules.map(moduleId => {
        return { 
          id: moduleId, 
          options: moduleConfigs[moduleId] || {} 
        };
      });
      
      // Generate project
      const generatedPath = await api.generateProject({
        name: projectName,
        path: projectPath,
        framework: selectedFramework?.id || "",
        modules: moduleConfigsArray,
        options: {
          typescript: useTypeScript,
          appRouter: useAppRouter,
          eslint: useEslint,
        }
      });
      
      setGeneratedProjectPath(generatedPath);
      
      // Add to recent projects
      addProject({
        id: generateUUID(),
        name: projectName,
        path: generatedPath,
        framework: selectedFramework?.id || "",
        createdAt: new Date().toISOString(),
        lastOpenedAt: new Date().toISOString(),
      });
      
    } catch (error) {
      console.error("Project generation failed:", error);
      setGenerationError(error instanceof Error ? error.message : String(error));
      setIsGenerating(false);
    }
  };

  // Handle open project
  const handleOpenProject = async () => {
    if (generatedProjectPath) {
      await api.openInEditor(generatedProjectPath);
      router.push("/");
    }
  };

  // Check if current step can proceed
  const canProceed = () => {
    switch (currentStep) {
      case "framework":
        return selectedFramework !== null;
      case "config":
        return projectName !== "" && projectPath !== "" && !nameError && !pathError;
      case "modules":
        return selectedModules.length > 0; // At least one module should be selected
      case "module-config":
        return true; // Module config is optional
      case "generating":
        return isComplete;
      default:
        return false;
    }
  };

  // Render frameworks selection step
  const renderFrameworkStep = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Choose a Framework</h2>
      <p className="text-base-content/70">
        Select a framework to use as a base for your project.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {frameworks.map(framework => (
          <FrameworkCard 
            key={framework.id} 
            framework={framework} 
            onSelect={() => handleFrameworkSelect(framework)} 
          />
        ))}
      </div>
    </div>
  );

  // Render project configuration step
  const renderConfigStep = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Configure Your Project</h2>
      <p className="text-base-content/70">
        Set up the basic configuration for your project.
      </p>
      
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <div className="form-control w-full mb-4">
            <label className="label">
              <span className="label-text">Project Name</span>
              <span className="label-text-alt">Required</span>
            </label>
            <input 
              type="text" 
              placeholder="my-awesome-project" 
              className={`input input-bordered w-full ${nameError ? 'input-error' : ''}`} 
              value={projectName}
              onChange={e => {
                setProjectName(e.target.value);
                validateName(e.target.value);
              }}
            />
            {nameError && <span className="text-error text-sm mt-1">{nameError}</span>}
          </div>
          
          <div className="form-control w-full mb-4">
            <label className="label">
              <span className="label-text">Project Location</span>
              <span className="label-text-alt">Required</span>
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="/path/to/projects" 
                className={`input input-bordered w-full ${pathError ? 'input-error' : ''}`} 
                value={projectPath}
                onChange={e => {
                  setProjectPath(e.target.value);
                  validatePath(e.target.value);
                }}
              />
              <button 
                className="btn btn-outline" 
                onClick={handleBrowseProjectPath}
              >
                Browse
              </button>
            </div>
            {pathError && <span className="text-error text-sm mt-1">{pathError}</span>}
          </div>
          
          <div className="divider"></div>
          
          <h3 className="font-bold mb-4">Project Options</h3>
          
          <div className="flex flex-col gap-3">
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input 
                  type="checkbox" 
                  className="checkbox checkbox-primary" 
                  checked={useTypeScript}
                  onChange={e => setUseTypeScript(e.target.checked)}
                />
                <div>
                  <span className="label-text">Use TypeScript</span>
                  <p className="text-xs text-base-content/60">
                    TypeScript adds type safety to your JavaScript code
                  </p>
                </div>
              </label>
            </div>
            
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input 
                  type="checkbox" 
                  className="checkbox checkbox-primary" 
                  checked={useAppRouter}
                  onChange={e => setUseAppRouter(e.target.checked)}
                />
                <div>
                  <span className="label-text">Use App Router</span>
                  <p className="text-xs text-base-content/60">
                    Next.js App Router for file-based routing with React Server Components
                  </p>
                </div>
              </label>
            </div>
            
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input 
                  type="checkbox" 
                  className="checkbox checkbox-primary" 
                  checked={useEslint}
                  onChange={e => setUseEslint(e.target.checked)}
                />
                <div>
                  <span className="label-text">Use ESLint</span>
                  <p className="text-xs text-base-content/60">
                    ESLint helps identify and fix problems in your code
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render modules selection step
  const renderModulesStep = () => {
    // Get compatible modules based on selected framework
    const compatibleModules = modules.filter(module => {
      // Check if module is compatible with selected framework
      const isFrameworkCompatible = !selectedFramework || 
        selectedFramework.compatibleModules.includes(module.id);
      
      // Check if this module is compatible with other selected modules
      const isCompatible = !module.incompatibleWith.some(id => selectedModules.includes(id));
      
      return isFrameworkCompatible && isCompatible;
    });

    // Group modules by category for better organization
    const groupedModules: Record<string, Module[]> = {};
    compatibleModules.forEach(module => {
      if (!groupedModules[module.category]) {
        groupedModules[module.category] = [];
      }
      groupedModules[module.category].push(module);
    });

    // Get a list of modules that are required by selected modules (dependencies)
    const requiredModules = modules
      .filter(m => selectedModules.includes(m.id))
      .flatMap(m => m.dependencies);

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Select Modules</h2>
        <p className="text-base-content/70">
          Choose the modules you want to include in your project.
        </p>
        
        {compatibleModules.length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedModules).map(([category, categoryModules]) => (
              <div key={category} className="space-y-4">
                <h3 className="font-semibold text-lg capitalize">{category}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categoryModules.map(module => (
                    <ModuleCard 
                      key={module.id} 
                      module={module} 
                      selected={selectedModules.includes(module.id)}
                      onToggle={handleModuleToggle}
                      disabled={requiredModules.includes(module.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="alert">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>No compatible modules found for the selected framework.</span>
          </div>
        )}
      </div>
    );
  };

  // Render module configuration step
  const renderModuleConfigStep = () => {
    // Get selected module objects
    const selectedModuleObjects = modules.filter(m => selectedModules.includes(m.id));
    
    // Filter to only modules that have configuration options
    const configurableModules = selectedModuleObjects.filter(
      m => m.configuration.options.length > 0
    );
    
    if (configurableModules.length === 0) {
      // Skip this step if no modules need configuration
      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Module Configuration</h2>
          <div className="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>No configuration needed for selected modules.</span>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Module Configuration</h2>
        <p className="text-base-content/70">
          Configure the selected modules for your project.
        </p>
        
        <div className="space-y-6">
          {configurableModules.map(module => (
            <div key={module.id} className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h3 className="card-title">{module.name}</h3>
                <p className="text-sm text-base-content/70">{module.description}</p>
                
                <div className="divider"></div>
                
                <div className="space-y-4">
                  {module.configuration.options.map(option => (
                    <div key={option.name} className="form-control w-full">
                      <label className="label">
                        <span className="label-text">{option.name}</span>
                        <span className="label-text-alt">{option.description}</span>
                      </label>
                      
                      {renderConfigOption(module.id, option)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Helper function to render different option types
  const renderConfigOption = (moduleId: string, option: ModuleOption) => {
    const currentValue = moduleConfigs[moduleId]?.[option.name] ?? option.default;
    
    switch (option.type) {
      case 'boolean':
        return (
          <input 
            type="checkbox" 
            className="toggle toggle-primary" 
            checked={Boolean(currentValue)}
            onChange={e => handleModuleConfigChange(moduleId, option.name, e.target.checked)}
          />
        );
      case 'string':
        return (
          <input 
            type="text" 
            className="input input-bordered w-full" 
            value={String(currentValue || '')}
            onChange={e => handleModuleConfigChange(moduleId, option.name, e.target.value)}
          />
        );
      case 'select':
        return (
          <select 
            className="select select-bordered w-full"
            value={String(currentValue)}
            onChange={e => handleModuleConfigChange(moduleId, option.name, e.target.value)}
          >
            {option.options?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      default:
        return (
          <input 
            type="text" 
            className="input input-bordered w-full" 
            value={String(currentValue || '')}
            onChange={e => handleModuleConfigChange(moduleId, option.name, e.target.value)}
          />
        );
    }
  };

  // Render generation step
  const renderGeneratingStep = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Generating Your Project</h2>
      <p className="text-base-content/70">
        Please wait while we generate your project.
      </p>
      
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <ProgressIndicator
            progress={generationProgress}
            isComplete={isComplete}
            error={generationError}
          />
          
          {isComplete && (
            <div className="flex justify-end mt-6 gap-4">
              <button
                className="btn btn-outline"
                onClick={() => router.push("/")}
              >
                Go to Dashboard
              </button>
              <button
                className="btn btn-primary"
                onClick={handleOpenProject}
              >
                Open Project
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case "framework":
        return renderFrameworkStep();
      case "config":
        return renderConfigStep();
      case "modules":
        return renderModulesStep();
      case "module-config":
        return renderModuleConfigStep();
      case "generating":
        return renderGeneratingStep();
      default:
        return renderFrameworkStep();
    }
  };

  // Helper function to get the current step index
  const getCurrentStepIndex = () => {
    const steps: WizardStep[] = ["framework", "config", "modules", "module-config", "generating"];
    return steps.indexOf(currentStep);
  };

  // Go to next step
  const goToNextStep = () => {
    const steps: WizardStep[] = ["framework", "config", "modules", "module-config", "generating"];
    const currentIndex = getCurrentStepIndex();
    
    if (currentIndex < steps.length - 1) {
      // Check if we can skip module configuration step
      if (currentStep === "modules") {
        // Get modules that need configuration
        const configurableModules = modules
          .filter(m => selectedModules.includes(m.id))
          .filter(m => m.configuration.options.length > 0);
        
        // Skip the module-config step if no modules need configuration
        if (configurableModules.length === 0) {
          handleGenerateProject();
          return;
        }
      }
      
      // Move to the next step
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  // Go to previous step
  const goToPreviousStep = () => {
    const steps: WizardStep[] = ["framework", "config", "modules", "module-config", "generating"];
    const currentIndex = getCurrentStepIndex();
    
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <ul className="steps w-full">
            <li className={`step ${currentStep === "framework" || getCurrentStepIndex() > 0 ? "step-primary" : ""}`}>
              Choose Framework
            </li>
            <li className={`step ${currentStep === "config" || getCurrentStepIndex() > 1 ? "step-primary" : ""}`}>
              Basic Config
            </li>
            <li className={`step ${currentStep === "modules" || getCurrentStepIndex() > 2 ? "step-primary" : ""}`}>
              Select Modules
            </li>
            <li className={`step ${currentStep === "module-config" || getCurrentStepIndex() > 3 ? "step-primary" : ""}`}>
              Configure Modules
            </li>
            <li className={`step ${currentStep === "generating" ? "step-primary" : ""}`}>
              Generate
            </li>
          </ul>
        </div>
        
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            {renderCurrentStep()}
            
            {currentStep !== "generating" && (
              <div className="card-actions justify-end mt-6">
                {getCurrentStepIndex() > 0 && (
                  <button
                    className="btn btn-outline"
                    onClick={goToPreviousStep}
                    disabled={isGenerating}
                  >
                    Back
                  </button>
                )}
                
                {getCurrentStepIndex() < 4 ? (
                  <button
                    className="btn btn-primary"
                    onClick={goToNextStep}
                    disabled={!canProceed() || isGenerating}
                  >
                    {getCurrentStepIndex() === 3 ? "Generate Project" : "Next"}
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={handleGenerateProject}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <span className="loading loading-spinner"></span>
                        Generating...
                      </>
                    ) : (
                      "Generate Project"
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 