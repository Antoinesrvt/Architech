"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MainLayout from "@/components/layouts/MainLayout";
import TemplateCard from "@/components/project/TemplateCard";
import ModuleCard from "@/components/wizard/ModuleCard";
import ProgressIndicator from "@/components/wizard/ProgressIndicator";
import { useTemplateStore, useProjectStore, useSettingsStore } from "@/lib/store";
import { getApiService } from "@/lib/api";
import { generateUUID } from "@/lib/utils";
import { validateProjectName, validateProjectPath } from "@/lib/utils/validation";
import { Template, Module } from "@/lib/store/template-store";
import { GenerationProgress } from "@/lib/api/types";

type WizardStep = "template" | "config" | "modules" | "generating";

export default function NewProject() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template");
  
  const { templates, modules } = useTemplateStore();
  const { addProject } = useProjectStore();
  const { defaultProjectPath } = useSettingsStore();
  const api = getApiService();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>("template");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  
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

  // Initialize with template if provided in URL
  useEffect(() => {
    if (templateId && templates.length > 0) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setSelectedTemplate(template);
        setCurrentStep("config");
      }
    }
  }, [templateId, templates]);

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

  // Handle template selection
  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setCurrentStep("config");
    
    // Pre-select recommended modules
    if (template.recommendedModules.length > 0) {
      setSelectedModules(template.recommendedModules);
    }
  };

  // Handle module toggle
  const handleModuleToggle = (moduleId: string, selected: boolean) => {
    if (selected) {
      setSelectedModules(prev => [...prev, moduleId]);
    } else {
      setSelectedModules(prev => prev.filter(id => id !== moduleId));
    }
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
      const moduleConfigs = selectedModules.map(moduleId => {
        // For now, just pass empty options
        return { id: moduleId, options: {} };
      });
      
      // Generate project
      const generatedPath = await api.generateProject({
        name: projectName,
        path: projectPath,
        template: selectedTemplate?.id || "",
        modules: moduleConfigs,
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
        template: selectedTemplate?.name || "",
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
      case "template":
        return selectedTemplate !== null;
      case "config":
        return projectName !== "" && projectPath !== "" && !nameError && !pathError;
      case "modules":
        return true; // Modules are optional
      default:
        return false;
    }
  };

  // Render templates selection step
  const renderTemplateStep = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Choose a Template</h2>
      <p className="text-base-content/70">
        Select a template to use as a starting point for your project.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(template => (
          <TemplateCard 
            key={template.id} 
            template={template} 
            onSelect={() => handleTemplateSelect(template)} 
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
                <span className="label-text">Use TypeScript</span>
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
                <span className="label-text">Use App Router</span>
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
                <span className="label-text">Use ESLint</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render modules selection step
  const renderModulesStep = () => {
    // Filter modules based on selected template
    const compatibleModules = modules.filter(module => {
      // Check if this module is compatible with other selected modules
      const isCompatible = !module.incompatibleWith.some(id => selectedModules.includes(id));
      return isCompatible;
    });

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Select Modules</h2>
        <p className="text-base-content/70">
          Choose the modules you want to include in your project.
        </p>
        
        {compatibleModules.length > 0 ? (
          <div className="space-y-4">
            {compatibleModules.map(module => (
              <ModuleCard 
                key={module.id} 
                module={module} 
                selected={selectedModules.includes(module.id)}
                onToggle={handleModuleToggle}
                disabled={false}
              />
            ))}
          </div>
        ) : (
          <div className="alert">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>No compatible modules found for the selected template.</span>
          </div>
        )}
      </div>
    );
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
      case "template":
        return renderTemplateStep();
      case "config":
        return renderConfigStep();
      case "modules":
        return renderModulesStep();
      case "generating":
        return renderGeneratingStep();
      default:
        return null;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Create New Project</h1>
        </div>
        
        {/* Stepper */}
        {currentStep !== "generating" && (
          <ul className="steps steps-horizontal w-full">
            <li className={`step ${currentStep === "template" || currentStep === "config" || currentStep === "modules" ? "step-primary" : ""}`}>
              Choose Template
            </li>
            <li className={`step ${currentStep === "config" || currentStep === "modules" ? "step-primary" : ""}`}>
              Configure Project
            </li>
            <li className={`step ${currentStep === "modules" ? "step-primary" : ""}`}>
              Select Modules
            </li>
          </ul>
        )}
        
        {/* Current step content */}
        {renderCurrentStep()}
        
        {/* Navigation buttons */}
        {currentStep !== "generating" && (
          <div className="flex justify-between">
            <button
              className="btn btn-outline"
              disabled={currentStep === "template"}
              onClick={() => {
                if (currentStep === "config") setCurrentStep("template");
                if (currentStep === "modules") setCurrentStep("config");
              }}
            >
              Previous
            </button>
            <button
              className="btn btn-primary"
              disabled={!canProceed()}
              onClick={() => {
                if (currentStep === "template") setCurrentStep("config");
                else if (currentStep === "config") setCurrentStep("modules");
                else if (currentStep === "modules") handleGenerateProject();
              }}
            >
              {currentStep === "modules" ? "Generate Project" : "Next"}
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
} 