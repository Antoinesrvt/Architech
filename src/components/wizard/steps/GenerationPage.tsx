import { useState, useEffect, useRef, useCallback } from 'react';
import { useFrameworkStore } from '@/lib/store/framework-store';
import { useProjectStore } from '@/lib/store/project-store';
import { frameworkService } from '@/lib/api';
import { Terminal, FolderOpen, RefreshCw, ArrowLeft, HomeIcon, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { TaskStatus } from '@/lib/api/local';

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
    error: projectError,
    setError: setProjectError,
    
    // New state management properties
    currentGenerationId,
    generationState,
    generationLogs,
    getGenerationStatus,
    getGenerationLogs,
    cancelGeneration,
    setupGenerationListeners
  } = useProjectStore();

  const [showConsole, setShowConsole] = useState(false);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);
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
  }, [generationLogs]);

  // Set up polling for generation status updates
  const startPolling = useCallback(() => {
    if (!currentGenerationId || !isLoading) return;

    // Clear any existing poll interval
    if (pollInterval) {
      clearInterval(pollInterval);
    }

    // Poll every 2 seconds
    const interval = setInterval(async () => {
      await getGenerationStatus();
      await getGenerationLogs();
    }, 2000);

    setPollInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentGenerationId, isLoading, getGenerationStatus, getGenerationLogs, pollInterval]);

  // Setup event listeners and polling
  useEffect(() => {
    // Start project generation automatically
    handleGenerateProject();

    // Setup listeners for generation events
    const unsubscribe = setupGenerationListeners();
    
    // Start polling for updates
    startPolling();

    return () => {
      // Clean up listeners and polling
      unsubscribe();
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, []);

  // Update polling when generation state changes
  useEffect(() => {
    if (generationState) {
      // If generation is complete or failed, stop polling
      if (generationState.status === TaskStatus.Completed || 
          generationState.status === TaskStatus.Failed) {
        if (pollInterval) {
          clearInterval(pollInterval);
          setPollInterval(null);
        }
      } else if (isLoading && !pollInterval) {
        // If we're loading but not polling, start polling
        startPolling();
      }
    }
  }, [generationState, isLoading, pollInterval, startPolling]);

  // Handle project generation
  const handleGenerateProject = async () => {
    if (setProjectError) setProjectError(null);
    
    try {
      // Generate project using the store method
      await generateProject();
    } catch (err) {
      console.error('Project generation failed:', err);
    }
  };

  // Handle canceling project generation
  const handleCancelGeneration = async () => {
    if (!currentGenerationId) return;
    
    try {
      await cancelGeneration();
    } catch (err) {
      console.error('Failed to cancel generation:', err);
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
      if (setProjectError) setProjectError('Failed to open project in editor');
    }
  };

  // Handle opening the project in file explorer
  const handleOpenInFolder = async () => {
    if (!projectPath || !projectName) return;
    
    try {
      await frameworkService.openInFolder(`${projectPath}/${projectName}`);
    } catch (error) {
      console.error('Failed to open in file explorer:', error);
      if (setProjectError) setProjectError('Failed to open project location');
    }
  };

  const getProgressPercentage = () => {
    if (!generationState) return 0;
    return Math.round(generationState.progress * 100);
  };

  const getActiveTaskName = () => {
    if (!generationState || !generationState.current_task) {
      return 'Initializing...';
    }
    
    const currentTask = generationState.tasks[generationState.current_task];
    return currentTask ? currentTask.name : 'Processing...';
  };

  const isGenerationSuccessful = () => {
    return generationState && generationState.status === TaskStatus.Completed;
  };

  const isGenerationFailed = () => {
    return generationState && (
      generationState.status === TaskStatus.Failed || 
      typeof generationState.status === 'string' && generationState.status.startsWith('Failed')
    );
  };

  const getErrorDetails = () => {
    if (projectError) return projectError;
    
    if (generationState && typeof generationState.status === 'string' && 
        generationState.status.startsWith('Failed')) {
      return generationState.status;
    }
    
    return 'Project generation failed';
  };

  const renderTaskList = () => {
    if (!generationState || !generationState.tasks) return null;
    
    // Sort tasks by status: running first, then pending, then completed, then failed
    const sortedTasks = Object.values(generationState.tasks).sort((a, b) => {
      const getStatusPriority = (status: TaskStatus | string) => {
        if (status === TaskStatus.Running) return 0;
        if (status === TaskStatus.Pending) return 1;
        if (status === TaskStatus.Completed) return 2;
        if (status === TaskStatus.Skipped) return 3;
        return 4; // Failed or other
      };
      
      return getStatusPriority(a.status) - getStatusPriority(b.status);
    });
    
    return (
      <div className="mt-4 space-y-2">
        <h4 className="font-medium">Generation Tasks</h4>
        <div className="space-y-2 max-h-40 overflow-y-auto p-2 bg-base-300 rounded-lg">
          {sortedTasks.map(task => (
            <div 
              key={task.id} 
              className={`flex items-center justify-between p-2 rounded ${
                task.status === TaskStatus.Running ? 'bg-primary/10 border border-primary/30' :
                task.status === TaskStatus.Completed ? 'bg-success/10 border border-success/30' :
                task.status === TaskStatus.Failed ? 'bg-error/10 border border-error/30' :
                task.status === TaskStatus.Skipped ? 'bg-base-100' :
                'bg-base-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {task.status === TaskStatus.Running && (
                  <div className="w-4 h-4 rounded-full bg-primary animate-pulse"></div>
                )}
                {task.status === TaskStatus.Completed && (
                  <CheckCircle size={16} className="text-success" />
                )}
                {task.status === TaskStatus.Failed && (
                  <AlertTriangle size={16} className="text-error" />
                )}
                {task.status === TaskStatus.Skipped && (
                  <XCircle size={16} className="text-base-content/50" />
                )}
                {task.status === TaskStatus.Pending && (
                  <div className="w-4 h-4 rounded-full border border-base-content/30"></div>
                )}
                <span className="text-sm">{task.name}</span>
              </div>
              <div className="text-xs opacity-75">
                {task.status === TaskStatus.Running && `${Math.round(task.progress * 100)}%`}
                {task.status === TaskStatus.Completed && 'Done'}
                {task.status === TaskStatus.Failed && 'Failed'}
                {task.status === TaskStatus.Skipped && 'Skipped'}
                {task.status === TaskStatus.Pending && 'Pending'}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
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
                <span>{getActiveTaskName()}</span>
                {generationState && (
                  <span className="text-sm font-normal badge badge-primary">{getProgressPercentage()}%</span>
                )}
              </h3>

              {/* Progress Bar */}
              <div className="w-full bg-base-300 rounded-full h-4 my-4 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    isGenerationSuccessful() ? 'bg-success' : 
                    isGenerationFailed() ? 'bg-error' : 
                    'bg-primary'
                  }`}
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>

              {/* Current Action */}
              {generationState && isLoading && !isGenerationSuccessful() && !isGenerationFailed() && (
                <div className="flex justify-between items-center">
                  <p className="text-center text-sm py-2">{getActiveTaskName()}</p>
                  <button
                    onClick={handleCancelGeneration}
                    className="btn btn-sm btn-outline btn-error gap-2"
                  >
                    <XCircle size={16} />
                    Cancel
                  </button>
                </div>
              )}

              {/* Task List */}
              {renderTaskList()}

              {/* Success Message */}
              {isGenerationSuccessful() && (
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
              {isGenerationFailed() && (
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
                </div>
                {generationLogs.length === 0 ? (
                  <div className="text-gray-500 italic">Waiting for command output...</div>
                ) : (
                  generationLogs.map((log, index) => (
                    <div key={index} className="mb-1 whitespace-pre-wrap">
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