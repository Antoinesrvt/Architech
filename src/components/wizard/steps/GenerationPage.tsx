import { useState, useEffect, useRef, useCallback } from 'react';
import { useFrameworkStore } from '@/lib/store/framework-store';
import { useProjectStore } from '@/lib/store/project-store';
import { frameworkService } from '@/lib/api';
import { Terminal, FolderOpen, RefreshCw, ArrowLeft, HomeIcon, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { TaskStatus, TaskStatusHelpers, TASK_STATUS } from '@/lib/api/local';
import { 
  executeNodeCommandStreaming, 
  cleanupCommand, 
  getActiveCommands 
} from '@/lib/api/nodejs';

interface GenerationPageProps {
  onBackToDashboard?: () => void;
}

interface NodeCommandPanelProps {
  projectPath: string;
  projectName: string;
  isProjectReady: boolean;
}

function NodeCommandPanel({ projectPath, projectName, isProjectReady }: NodeCommandPanelProps) {
  const [activeCommands, setActiveCommands] = useState<Array<{ id: string, command: string }>>([]);
  const [commandOutput, setCommandOutput] = useState<Record<string, string[]>>({});
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Poll for active commands every second
    const interval = setInterval(() => {
      const commands = getActiveCommands();
      setActiveCommands(commands.map(c => ({ id: c.id, command: c.command })));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom of output when new lines are added
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [commandOutput]);

  // Cancel command handler
  const handleCancelCommand = async (commandId: string) => {
    await cleanupCommand(commandId);
  };

  // Run a test command
  const handleRunTestCommand = async () => {
    const projectFullPath = `${projectPath}/${projectName}`;

    const commandId = await executeNodeCommandStreaming(
      projectFullPath, 
      'npm --version',
      {
        onStdout: (line: string) => {
          setCommandOutput(prev => ({
            ...prev,
            [commandId]: [...(prev[commandId] || []), `[stdout] ${line}`]
          }));
        },
        onStderr: (line: string) => {
          setCommandOutput(prev => ({
            ...prev,
            [commandId]: [...(prev[commandId] || []), `[stderr] ${line}`]
          }));
        },
        onCompleted: (exitCode: number, success: boolean) => {
          setCommandOutput(prev => ({
            ...prev,
            [commandId]: [
              ...(prev[commandId] || []), 
              `[system] Command completed with exit code ${exitCode} (${success ? 'success' : 'failed'})`
            ]
          }));
        },
        onError: (error: string) => {
          setCommandOutput(prev => ({
            ...prev,
            [commandId]: [...(prev[commandId] || []), `[error] ${error}`]
          }));
        }
      }
    );
  };

  if (activeCommands.length === 0 && Object.keys(commandOutput).length === 0) {
    return null;
  }

  return (
    <div className="mt-4 card bg-base-200 shadow-sm">
      <div className="card-body">
        <h3 className="card-title flex justify-between">
          <span>Node.js Commands</span>
          <span className="badge badge-primary">{activeCommands.length} active</span>
        </h3>

        <div className="space-y-2">
          {activeCommands.map((cmd) => (
            <div key={cmd.id} className="bg-base-100 p-3 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="font-mono text-sm">{cmd.command}</span>
                </div>
                <button 
                  onClick={() => handleCancelCommand(cmd.id)}
                  className="btn btn-xs btn-error"
                >
                  Cancel
                </button>
              </div>

              {commandOutput[cmd.id] && (
                <div 
                  ref={outputRef}
                  className="bg-black text-green-400 p-2 rounded-md font-mono text-xs h-32 overflow-y-auto"
                >
                  {commandOutput[cmd.id].map((line, i) => (
                    <div 
                      key={i} 
                      className={
                        line.startsWith('[stderr]') ? 'text-red-400' : 
                        line.startsWith('[system]') ? 'text-blue-400' :
                        line.startsWith('[error]') ? 'text-yellow-400' :
                        ''
                      }
                    >
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {isProjectReady && (
          <div className="flex justify-end mt-2">
            <button 
              onClick={handleRunTestCommand}
              className="btn btn-sm btn-outline"
            >
              Run Test Command
            </button>
          </div>
        )}
      </div>
    </div>
  );
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
    resumeGeneration,
    setupGenerationListeners,
    setIsLoading
  } = useProjectStore();

  const [showConsole, setShowConsole] = useState(false);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);
  const [initStep, setInitStep] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Get the selected framework
  const selectedFramework = selectedFrameworkId 
    ? frameworks.find(f => f.id === selectedFrameworkId)
    : null;

  // Get the selected modules
  const selectedModules = modules.filter(module => selectedModuleIds.includes(module.id));

  // Trigger the loading state on component mount if not already loading
  useEffect(() => {
    console.log('GenerationPage - Initial mount effect:', { isLoading, currentGenerationId });
    
    // If we have required data and are not loading or completed, start generation
    if (
      projectName && 
      projectPath && 
      selectedFrameworkId && 
      !isLoading && 
      !currentGenerationId && 
      !generationState
    ) {
      console.log('GenerationPage - Setting initial loading state to true');
      setIsLoading(true);
    }
  }, []);

  // Scroll to bottom of logs when new entries come in
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [generationLogs]);

  // Set up polling for generation status updates
  const startPolling = useCallback(() => {
    console.log('GenerationPage - startPolling called:', { 
      currentGenerationId, 
      isLoading,
      hasState: Boolean(generationState)
    });
    
    // If we're not loading, don't poll
    if (!isLoading) {
      console.log('GenerationPage - Not polling because not loading');
      return;
    }

    // Clear any existing poll interval
    if (pollInterval) {
      clearInterval(pollInterval);
    }

    // If we have a generation ID, get status immediately
    if (currentGenerationId) {
      // Get initial status immediately
      getGenerationStatus();
      getGenerationLogs();
    }

    // Poll every 1 second
    const interval = setInterval(async () => {
      // Only fetch if we have a generation ID
      if (currentGenerationId) {
        await getGenerationStatus();
        await getGenerationLogs();
      } else {
        console.log('GenerationPage - Waiting for generation ID before polling');
      }
    }, 1000);

    setPollInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentGenerationId, isLoading, getGenerationStatus, getGenerationLogs, pollInterval]);

  // Setup event listeners and polling
  useEffect(() => {
    console.log('GenerationPage - Setting up listeners and polling with current generation ID:', currentGenerationId);
    
    // Add detailed debug info
    console.log('GenerationPage - Debug state:', { 
      isLoading, 
      hasGenerationId: Boolean(currentGenerationId),
      hasState: Boolean(generationState),
      stateStatus: generationState?.status || 'N/A',
      projectName,
      projectPath,
      frameworkId: selectedFrameworkId
    });
    
    // Only setup listeners and polling if we're in loading state
    if (isLoading) {
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
    }
    
    return () => {}; // No-op cleanup if not loading
  }, [isLoading, currentGenerationId]); // Re-run when loading state or generation ID changes
  
  // Start project generation if needed when component mounts
  useEffect(() => {
    // If not loading yet, don't do anything
    if (!isLoading) return;
    
    console.log('GenerationPage - Checking if we need to start generation:', 
      { isLoading, hasGenerationId: Boolean(currentGenerationId) });
    
    // If we already have a generation ID, just poll status
    // If not and we're supposed to be loading, start generation
    if (!currentGenerationId) {
      console.log('Starting project generation from GenerationPage');
      handleGenerateProject();
    } else {
      console.log('Generation already has ID, getting status:', currentGenerationId);
      // If we already have an ID, just get the status
      getGenerationStatus();
      getGenerationLogs();
    }
  }, [isLoading, currentGenerationId]);

  // Track initialization steps from logs
  useEffect(() => {
    if (generationLogs.length > 0) {
      const lastLog = generationLogs[generationLogs.length - 1];
      if (lastLog.includes('task initialization')) {
        setInitStep('Initializing tasks...');
      } else if (lastLog.includes('created') && lastLog.includes('tasks')) {
        setInitStep('Tasks created, ready to start generation');
      }
    }
  }, [generationLogs]);

  // Update polling when generation state changes
  useEffect(() => {
    if (generationState) {
      // If generation is complete or failed, stop polling
      if (generationState.status === TASK_STATUS.COMPLETED || 
          TaskStatusHelpers.isFailed(generationState.status)) {
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
      console.log('GenerationPage - Initiating project generation with config:', {
        name: projectName,
        path: projectPath,
        framework: selectedFrameworkId
      });
      
      // Show initialization starting in logs
      if (!generationState) {
        // Manually log the initialization to console
        const initialLog = `Starting project generation: ${projectName} (${selectedFramework?.name || 'Unknown framework'})`;
        console.log(initialLog);
      }
      
      // Generate project using the store method
      const projectId = await generateProject();
      console.log('GenerationPage - Project generation initiated with ID:', projectId);
      
      if (projectId) {
        // If generation started successfully, poll status right away
        getGenerationStatus();
        getGenerationLogs();
      }
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
  const handleRetry = async () => {
    if (setProjectError) setProjectError(null);
    
    // If we can resume the generation, do so
    if (generationState && TaskStatusHelpers.isFailed(generationState.status) && generationState.resumable) {
      try {
        await resumeGeneration();
      } catch (err) {
        console.error('Project resumption failed:', err);
      }
    } else {
      // Otherwise start a new generation
      try {
        await generateProject();
      } catch (err) {
        console.error('Project generation failed:', err);
      }
    }
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
    if (!generationState) {
      return 'Initializing...';
    }
    
    // For initialization phase
    if (generationState.status === 'Initializing') {
      return initStep || 'Setting up project tasks...';
    }
    
    // For regular task execution
    if (generationState.current_task) {
      const currentTask = generationState.tasks && generationState.current_task ? 
        generationState.tasks[generationState.current_task] : null;
      return currentTask ? currentTask.name : 'Processing...';
    }
    
    return 'Preparing...';
  };

  const isGenerationSuccessful = () => {
    return generationState && generationState.status === TASK_STATUS.COMPLETED;
  };

  const isGenerationFailed = () => {
    return generationState && TaskStatusHelpers.isFailed(generationState.status);
  };

  const getErrorDetails = () => {
    if (projectError) return projectError;
    
    if (generationState && TaskStatusHelpers.isFailed(generationState.status)) {
      const reason = TaskStatusHelpers.getReason(generationState.status);
      return reason ? `Failed: ${reason}` : 'Project generation failed';
    }
    
    return 'Project generation failed';
  };

  const renderTaskList = () => {
    console.log('GenerationPage - renderTaskList - generationState:', generationState);
    
    if (!generationState) {
      console.log('GenerationPage - No generation state available yet');
      return (
        <div className="mt-4 space-y-2">
          <h4 className="font-medium">Generation Tasks</h4>
          <div className="p-4 text-center bg-base-300 rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <span className="loading loading-spinner loading-md"></span>
              <p className="text-sm opacity-75">Waiting for generation to start...</p>
            </div>
            <button
              onClick={() => {
                console.log('Manual debug refresh triggered');
                getGenerationStatus();
                getGenerationLogs();
              }}
              className="btn btn-xs btn-ghost mt-2"
            >
              Refresh Status
            </button>
          </div>
        </div>
      );
    }
    
    if (!generationState.tasks || Object.keys(generationState.tasks).length === 0) {
      console.log('GenerationPage - No tasks available yet, waiting for initialization...');
      console.log('GenerationState status:', generationState.status);
      
      // Check if we're in an initialization phase
      const status = generationState?.status;
      if (status === 'Initializing') {
        return (
          <div className="mt-4 space-y-2">
            <h4 className="font-medium">Initializing Project</h4>
            <div className="p-4 bg-base-300 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="loading loading-spinner loading-md"></span>
                <p>Creating project structure and initializing tasks...</p>
              </div>
              <div className="mt-3">
                <progress className="progress progress-primary w-full" value="5" max="100"></progress>
              </div>
            </div>
            <div className="px-4 pt-2 text-sm">
              <p className="text-info">
                {initStep || 'Preparing project tasks...'}
              </p>
            </div>
            <div className="mt-2 p-2 border border-base-300 rounded-md">
              <p className="text-xs text-base-content">Debug Info:</p>
              <pre className="text-xs overflow-auto bg-base-200 p-2 rounded mt-1">
                {JSON.stringify({
                  status: generationState.status,
                  progress: generationState.progress,
                  taskCount: Object.keys(generationState.tasks || {}).length,
                  currentTask: generationState.current_task,
                  id: generationState.id
                }, null, 2)}
              </pre>
              <button
                onClick={() => {
                  console.log('Manual tasks refresh triggered');
                  // Force creating placeholder tasks if initialization is complete
                  if (generationState && generationState.status === 'Initializing') {
                    console.log('Requesting task initialization status manually');
                    getGenerationStatus();
                    getGenerationLogs();
                  }
                }}
                className="btn btn-xs btn-primary mt-2"
              >
                Force Refresh
              </button>
            </div>
          </div>
        );
      }
      
      return (
        <div className="mt-4 space-y-2">
          <h4 className="font-medium">Generation Tasks</h4>
          <div className="p-4 text-center bg-base-300 rounded-lg">
            <p className="text-sm opacity-75">Waiting for tasks to initialize...</p>
            <div className="mt-2 p-2 border border-base-300 rounded-md">
              <p className="text-xs text-base-content">Debug Info:</p>
              <pre className="text-xs overflow-auto bg-base-200 p-2 rounded mt-1">
                {JSON.stringify({
                  status: generationState.status,
                  progress: generationState.progress,
                  id: generationState.id
                }, null, 2)}
              </pre>
            </div>
            <button
              onClick={() => {
                console.log('Manual debug refresh triggered');
                getGenerationStatus();
                getGenerationLogs();
              }}
              className="btn btn-xs btn-ghost mt-2"
            >
              Refresh Status
            </button>
          </div>
        </div>
      );
    }
    
    // Sort tasks by status: running first, then pending, then completed, then failed
    const sortedTasks = Object.values(generationState.tasks).sort((a, b) => {
      const getStatusPriority = (status: TaskStatus | string) => {
        if (status === TASK_STATUS.RUNNING) return 0;
        if (status === TASK_STATUS.PENDING) return 1;
        if (status === TASK_STATUS.COMPLETED) return 2;
        if (TaskStatusHelpers.isSkipped(status)) return 3;
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
                task.status === TASK_STATUS.RUNNING ? 'bg-primary/10 border border-primary/30' :
                task.status === TASK_STATUS.COMPLETED ? 'bg-success/10 border border-success/30' :
                TaskStatusHelpers.isFailed(task.status) ? 'bg-error/10 border border-error/30' :
                TaskStatusHelpers.isSkipped(task.status) ? 'bg-base-100' :
                'bg-base-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {task.status === TASK_STATUS.RUNNING && (
                  <div className="w-4 h-4 rounded-full bg-primary animate-pulse"></div>
                )}
                {task.status === TASK_STATUS.COMPLETED && (
                  <CheckCircle size={16} className="text-success" />
                )}
                {TaskStatusHelpers.isFailed(task.status) && (
                  <AlertTriangle size={16} className="text-error" />
                )}
                {TaskStatusHelpers.isSkipped(task.status) && (
                  <XCircle size={16} className="text-base-content/50" />
                )}
                {task.status === TASK_STATUS.PENDING && (
                  <div className="w-4 h-4 rounded-full border border-base-content/30"></div>
                )}
                <span className="text-sm">{task.name}</span>
              </div>
              <div className="text-xs opacity-75">
                {task.status === TASK_STATUS.RUNNING && `${Math.round(task.progress * 100)}%`}
                {task.status === TASK_STATUS.COMPLETED && 'Done'}
                {TaskStatusHelpers.isFailed(task.status) && 'Failed'}
                {TaskStatusHelpers.isSkipped(task.status) && 'Skipped'}
                {task.status === TASK_STATUS.PENDING && 'Pending'}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderInitializationStatus = () => {
    if (!generationState || generationState.status !== 'Initializing') return null;
    
    return (
      <div className="mt-2 bg-base-200 p-3 rounded-lg">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="loading loading-spinner loading-sm"></span>
            <span className="text-sm font-medium">Initializing Project</span>
          </div>
          <div className="badge badge-info">Phase 1/2</div>
        </div>
        <div className="mt-2">
          <p className="text-xs opacity-75">
            Setting up project structure and preparing generation tasks...
          </p>
          <div className="mt-2">
            <progress className="progress progress-info w-full" value="30" max="100"></progress>
          </div>
        </div>
      </div>
    );
  };

  const handleBackToDashboard = () => {
    if (onBackToDashboard) onBackToDashboard();
  };

  const renderFailedState = () => {
    const isResumable = generationState?.resumable === true;
    
    return (
      <div className="flex flex-col items-center gap-4 my-8">
        <div className="w-16 h-16 text-error">
          <XCircle className="w-full h-full" />
        </div>
        <h2 className="text-xl font-bold text-error">Project Generation Failed</h2>
        <p className="text-center max-w-lg opacity-80">
          {getErrorDetails()}
        </p>
        
        <div className="flex gap-2 mt-4">
          <button
            className={`btn ${isResumable ? 'btn-primary' : 'btn-error'}`}
            onClick={handleRetry}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {isResumable ? 'Resume Generation' : 'Retry Generation'}
          </button>
          
          <button 
            className="btn btn-ghost" 
            onClick={handleBackToDashboard}
          >
            Back to Dashboard
          </button>
        </div>
        
        {isResumable && (
          <div className="mt-2 text-sm text-success">
            <p>The generation can be resumed from where it left off.</p>
          </div>
        )}
      </div>
    );
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
              
              {/* Show initialization status if appropriate */}
              {renderInitializationStatus()}
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
                    generationState?.status === 'Initializing' ? 'bg-info' :
                    'bg-primary'
                  }`}
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>

              {/* Initial Loading State */}
              {isLoading && !generationState && (
                <div className="flex flex-col items-center justify-center p-4">
                  <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
                  <h3 className="font-bold text-lg">Starting Project Generation</h3>
                  <p className="text-center text-sm opacity-75 mb-4">
                    Initializing task runner, please wait...
                  </p>
                  <div className="w-full max-w-xs">
                    <div className="flex justify-between mb-1 text-xs">
                      <span>Connecting to backend</span>
                      <span>Initializing</span>
                    </div>
                    <div className="w-full bg-base-300 h-2 rounded-full overflow-hidden">
                      <div className="bg-primary h-full animate-pulse" style={{ width: '10%' }}></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Waiting for Tasks State */}
              {isLoading && generationState && !generationState.tasks && Object.keys(generationState.tasks || {}).length === 0 && (
                <div className="flex flex-col items-center justify-center p-4">
                  <div className="loading loading-dots loading-md text-info mb-4"></div>
                  <h3 className="font-medium text-md">Initializing Project Structure</h3>
                  <p className="text-center text-sm opacity-75 mb-4">
                    Setting up project tasks...
                  </p>
                  <div className="w-full max-w-xs">
                    <div className="flex justify-between mb-1 text-xs">
                      <span>Tasks initializing</span>
                      <span>Phase 1/2</span>
                    </div>
                    <div className="w-full bg-base-300 h-2 rounded-full overflow-hidden">
                      <div className="bg-info h-full" style={{ width: '30%' }}></div>
                    </div>
                  </div>
                </div>
              )}

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
              {isGenerationFailed() && renderFailedState()}

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

          {/* Add the Node.js Command Panel */}
          {(isGenerationSuccessful() || isGenerationInProgress()) && (
            <NodeCommandPanel 
              projectPath={projectPath} 
              projectName={projectName}
              isProjectReady={isGenerationSuccessful() === true}
            />
          )}

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

// Helper function to check if generation is in progress
function isGenerationInProgress() {
  const { generationState } = useProjectStore.getState();
  return generationState && 
         generationState.status !== TASK_STATUS.COMPLETED &&
         !TaskStatusHelpers.isFailed(generationState.status);
} 