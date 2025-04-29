import { useState, useEffect } from 'react';
import { useFrameworkStore } from '@/lib/store/framework-store';
import { useProjectStore } from '@/lib/store/project-store';
import { frameworkService } from '@/lib/api';
import ProgressIndicator from '../ProgressIndicator';
import { GenerationProgress } from '@/lib/api/types';

export function SummaryStep() {
  const { frameworks, modules } = useFrameworkStore();
  const { 
    projectName,
    projectPath,
    projectDescription,
    selectedFrameworkId,
    selectedModuleIds,
    moduleConfigurations,
    generateProject,
    isLoading,
    error: projectError
  } = useProjectStore();

  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Get the selected framework
  const selectedFramework = selectedFrameworkId 
    ? frameworks.find(f => f.id === selectedFrameworkId)
    : null;

  // Get the selected modules
  const selectedModules = modules.filter(module => selectedModuleIds.includes(module.id));

  // Set up progress listener
  useEffect(() => {
    const unsubscribe = frameworkService.listenToProgress((progress) => {
      setCurrentStep(progress.step);
      setGenerationProgress(progress);
    });
    
    return () => unsubscribe();
  }, []);

  // Handle project generation
  const handleGenerateProject = async () => {
    setError(null);
    setSuccess(false);
    
    try {
      // Generate project using the store method
      await generateProject();
      setSuccess(true);
    } catch (err) {
      console.error('Project generation failed:', err);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  // Handle opening the project in an editor
  const handleOpenInEditor = async () => {
    if (!projectPath || !projectName) return;
    
    try {
      await frameworkService.openInEditor(`${projectPath}/${projectName}`);
    } catch (error) {
      console.error('Failed to open in editor:', error);
      setError('Failed to open project in editor');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <h2 className="text-2xl font-bold">Project Summary</h2>
      <p className="text-base-content/70">
        Review your project configuration before generating.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Project Details Section */}
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body">
            <h3 className="card-title">Project Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Name:</span>
                <span>{projectName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Location:</span>
                <span className="text-right">{projectPath}</span>
              </div>
              {projectDescription && (
                <div>
                  <span className="font-medium">Description:</span>
                  <p className="text-sm mt-1">{projectDescription}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Framework Section */}
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body">
            <h3 className="card-title">Selected Framework</h3>
            {selectedFramework ? (
              <div className="space-y-2">
                <p className="font-medium">{selectedFramework.name}</p>
                <p className="text-sm">{selectedFramework.description}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedFramework.tags && Array.isArray(selectedFramework.tags) && 
                    selectedFramework.tags.map(tag => (
                      <span key={tag} className="badge badge-primary badge-sm">{tag}</span>
                    ))
                  }
                </div>
              </div>
            ) : (
              <p className="text-error">No framework selected</p>
            )}
          </div>
        </div>
      </div>

      {/* Selected Modules Section */}
      <div className="card bg-base-200 shadow-sm">
        <div className="card-body">
          <h3 className="card-title">Selected Modules</h3>
          {selectedModules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedModules.map(module => (
                <div key={module.id} className="bg-base-100 p-3 rounded-lg">
                  <p className="font-medium">{module.name}</p>
                  <p className="text-xs text-base-content/70">{module.description}</p>
                  <span className="badge badge-sm mt-1">{module.category}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-warning">No modules selected</p>
          )}
        </div>
      </div>

      {/* Project Structure Preview */}
      <div className="card bg-base-200 shadow-sm">
        <div className="card-body">
          <h3 className="card-title">Project Structure Preview</h3>
          <div className="bg-base-100 p-4 rounded-lg font-mono text-sm">
            <p>📁 {projectName || 'my-project'}/</p>
            {selectedFramework?.structure?.directories && Array.isArray(selectedFramework.structure.directories) && 
              selectedFramework.structure.directories.map(dir => (
                <p key={dir} className="ml-4">📁 {dir}/</p>
              ))
            }
            <p className="ml-4">📄 package.json</p>
            <p className="ml-4">📄 README.md</p>
            {selectedModules.some(m => m.id === 'tailwind') && (
              <p className="ml-4">📄 tailwind.config.js</p>
            )}
          </div>
        </div>
      </div>

      {/* Generation Progress */}
      {isLoading && (
        <div className="card bg-base-300 shadow-sm">
          <div className="card-body">
            <h3 className="card-title">Generating Project</h3>
            <ProgressIndicator 
              progress={generationProgress} 
              isComplete={success}
              error={error || projectError}
            />
            {generationProgress && (
              <p className="text-center mt-2">{generationProgress.message}</p>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {(error || projectError) && !isLoading && (
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{error || projectError}</span>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="alert alert-success">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>Project generated successfully!</span>
          <button 
            className="btn btn-sm btn-primary"
            onClick={handleOpenInEditor}
          >
            Open in Editor
          </button>
        </div>
      )}

      {/* Generate Button */}
      {!isLoading && !success && (
        <div className="flex justify-center mt-6">
          <button 
            className="btn btn-primary btn-lg"
            onClick={handleGenerateProject}
            disabled={!selectedFrameworkId || isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading loading-spinner"></span>
                Generating...
              </>
            ) : (
              'Generate Project'
            )}
          </button>
        </div>
      )}
    </div>
  );
} 