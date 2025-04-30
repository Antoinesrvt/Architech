import { useState, useEffect, useRef } from 'react';
import { useFrameworkStore } from '@/lib/store/framework-store';
import { useProjectStore } from '@/lib/store/project-store';
import { frameworkService } from '@/lib/api';
import { GenerationProgress } from '@/lib/api/types';
import { Terminal, FolderOpen, RefreshCw, ArrowLeft, HomeIcon, CheckCircle, AlertTriangle } from 'lucide-react';

interface GenerationPageProps {
  onBackToDashboard?: () => void;
}

export function GenerationPage({ onBackToDashboard }: GenerationPageProps) {
  const { frameworks, modules } = useFrameworkStore();
  const { 
    projectName,
    projectPath,
    selectedFrameworkId,
    selectedModuleIds,
    generateProject,
    isLoading,
    setIsLoading,
    error: projectError,
    setError: setProjectError
  } = useProjectStore();

  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [commandLogs, setCommandLogs] = useState<string[]>([]);
  const [showConsole, setShowConsole] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Get the selected framework
  const selectedFramework = selectedFrameworkId 
    ? frameworks.find(f => f.id === selectedFrameworkId)
    : null;

  // Get the selected modules
  const selectedModules = modules.filter(module => selectedModuleIds.includes(module.id));

  // Scroll to bottom of logs when new entries come in
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [commandLogs]);

  // Set up progress listener
  useEffect(() => {
    // Clear existing logs when component mounts
    setCommandLogs([]);
    
    // Listen for progress updates
    const unsubscribe = frameworkService.listenToProgress((progress) => {
      setCurrentStep(progress.step);
      setGenerationProgress(progress);
      
      // Add message to command logs if it's not empty
      if (progress.message && progress.message.trim() !== '') {
        setCommandLogs(prev => [...prev, progress.message]);
      }
    });
    
    // Start project generation automatically
    handleGenerateProject();
    
    return () => unsubscribe();
  }, []);

  // Handle project generation
  const handleGenerateProject = async () => {
    setError(null);
    setSuccess(false);
    setGenerationProgress(null);
    setCommandLogs([]);
    if (setProjectError) setProjectError(null);
    if (setIsLoading) setIsLoading(true);
    
    try {
      // Generate project using the store method
      await generateProject();
      setSuccess(true);
    } catch (err) {
      console.error('Project generation failed:', err);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  // Handle retrying project generation
  const handleRetry = () => {
    handleGenerateProject();
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

  // Handle opening the project in file explorer
  const handleOpenInFolder = async () => {
    if (!projectPath || !projectName) return;
    
    try {
      await frameworkService.openInFolder(`${projectPath}/${projectName}`);
    } catch (error) {
      console.error('Failed to open in file explorer:', error);
      setError('Failed to open project location');
    }
  };

  const getProgressPercentage = () => {
    if (!generationProgress) return 0;
    return Math.round(generationProgress.progress * 100);
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'init':
        return 'Initializing Project...';
      case 'create':
        return 'Creating Project...';
      case 'structure':
        return 'Setting Up Directory Structure...';
      case 'dependencies':
        return 'Resolving Dependencies...';
      case 'modules':
        return 'Installing Modules...';
      case 'complete':
        return 'Project Generated Successfully!';
      default:
        return 'Generating Project...';
    }
  };

  const getErrorDetails = () => {
    return error || projectError || 'An unknown error occurred during project generation';
  };

  const handleBackToDashboard = () => {
    if (onBackToDashboard) onBackToDashboard();
  };

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-base-200">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Project Generator</h1>
          <div className="flex gap-2">
            <button 
              onClick={handleBackToDashboard} 
              className="btn btn-sm btn-ghost gap-2"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </button>
            <button 
              onClick={handleBackToDashboard}
              className="btn btn-sm btn-ghost"
            >
              <HomeIcon size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 md:p-6 max-w-5xl">
        <div className="space-y-6">
          {/* Project Info Card */}
          <div 
            className="card bg-base-200 shadow-sm opacity-0 animate-fadeIn"
            style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
          >
            <div className="card-body">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                  <h2 className="text-xl font-bold">{projectName || 'Unnamed Project'}</h2>
                  <p className="text-sm opacity-75">{projectPath}</p>
                </div>
                <div className="flex items-center gap-2 mt-2 md:mt-0">
                  <div className="badge badge-primary">{selectedFramework?.name || 'No Framework'}</div>
                  <div className="badge badge-secondary">{selectedModules.length} modules</div>
                </div>
              </div>
            </div>
          </div>

          {/* Generation Progress Card */}
          <div 
            className="card bg-base-200 shadow-sm overflow-hidden opacity-0 animate-fadeIn"
            style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
          >
            <div className="card-body">
              <h3 className="card-title flex justify-between">
                <span>{getStepTitle()}</span>
                {generationProgress && (
                  <span className="text-sm font-normal badge badge-primary">{getProgressPercentage()}%</span>
                )}
              </h3>

              {/* Progress Bar */}
              <div className="w-full bg-base-300 rounded-full h-4 my-4 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${success ? 'bg-success' : error ? 'bg-error' : 'bg-primary'}`}
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>

              {/* Current Action */}
              {generationProgress && !success && !error && (
                <p className="text-center text-sm py-2">{generationProgress.message}</p>
              )}

              {/* Success Message */}
              {success && (
                <div 
                  className="bg-success/10 border border-success/30 rounded-lg p-4 text-center my-4 animate-fadeIn"
                >
                  <CheckCircle className="mx-auto mb-2 text-success" size={48} />
                  <h3 className="font-bold text-lg text-success">Project Generated Successfully!</h3>
                  <p className="text-sm opacity-75 mb-4">
                    Your project has been created at {projectPath}/{projectName}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button 
                      onClick={handleOpenInEditor}
                      className="btn btn-sm btn-outline"
                    >
                      <Terminal size={16} />
                      Open in Editor
                    </button>
                    <button 
                      onClick={handleOpenInFolder}
                      className="btn btn-sm btn-outline"
                    >
                      <FolderOpen size={16} />
                      Open Folder
                    </button>
                    <button 
                      onClick={handleBackToDashboard}
                      className="btn btn-sm btn-outline"
                    >
                      <HomeIcon size={16} />
                      Back to Dashboard
                    </button>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {(error || projectError) && (
                <div 
                  className="bg-error/10 border border-error/30 rounded-lg p-4 text-center my-4 animate-fadeIn"
                >
                  <AlertTriangle className="mx-auto mb-2 text-error" size={48} />
                  <h3 className="font-bold text-lg text-error">Generation Failed</h3>
                  <p className="text-sm opacity-75 mb-4">
                    {getErrorDetails()}
                  </p>
                  <div className="flex justify-center gap-2">
                    <button 
                      onClick={handleRetry}
                      className="btn btn-sm btn-error gap-2"
                    >
                      <RefreshCw size={16} />
                      Retry Generation
                    </button>
                  </div>
                </div>
              )}

              {/* Toggle Console Button */}
              <div className="flex justify-center mt-4">
                <button 
                  onClick={() => setShowConsole(!showConsole)}
                  className="btn btn-sm btn-ghost gap-2"
                >
                  <Terminal size={16} />
                  {showConsole ? 'Hide' : 'Show'} Console Output
                </button>
              </div>
            </div>

            {/* Command Console */}
            {showConsole && (
              <div 
                className="bg-black px-4 py-2 text-green-400 font-mono text-xs overflow-auto animate-slideDown"
                style={{ maxHeight: '400px' }}
              >
                <div className="border-b border-gray-700 pb-1 mb-2 flex justify-between">
                  <span>Command Output</span>
                  <button 
                    onClick={() => setCommandLogs([])}
                    className="text-gray-400 hover:text-white"
                  >
                    Clear
                  </button>
                </div>
                {commandLogs.length === 0 ? (
                  <div className="text-gray-500 italic">Waiting for command output...</div>
                ) : (
                  commandLogs.map((log, index) => (
                    <div key={index} className="mb-1">
                      <span className="text-blue-400">$</span> {log}
                    </div>
                  ))
                )}
                <div ref={logEndRef} />
              </div>
            )}
          </div>

          {/* Selected Modules Section */}
          <div 
            className="card bg-base-200 shadow-sm opacity-0 animate-fadeIn"
            style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}
          >
            <div className="card-body">
              <h3 className="card-title">Selected Modules</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {selectedModules.map(module => (
                  <div key={module.id} className="bg-base-100 p-3 rounded-lg text-sm">
                    <div className="flex justify-between items-center">
                      <p className="font-medium">{module.name}</p>
                      <span className="badge badge-xs badge-outline">{module.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add custom animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideDown {
          from { max-height: 0; }
          to { max-height: 400px; }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        
        .animate-slideDown {
          animation: slideDown 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
} 