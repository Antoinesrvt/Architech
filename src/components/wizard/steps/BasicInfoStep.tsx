import { useState, useEffect } from 'react';
import { useProjectStore } from '@/lib/store/project-store';
import { frameworkService } from '@/lib/api';
import Button from '@/components/ui/Button';
import { WizardStepProps } from '../types';
import { cn } from '@/lib/utils/cn';
import { useToast } from '@/components/ui/Toast';

export function BasicInfoStep({ onNext, onPrevious, canGoNext, canGoPrevious, onBackToDashboard }: WizardStepProps) {
  const { 
    projectName, 
    projectPath, 
    projectDescription, 
    setProjectName, 
    setProjectPath, 
    setProjectDescription,
    saveDraft
  } = useProjectStore();
  
  const { toast } = useToast();
  const [isSelectingPath, setIsSelectingPath] = useState(false);
  const [isTouched, setIsTouched] = useState({
    name: false,
    path: false,
    description: false
  });
  const [formErrors, setFormErrors] = useState({
    name: '',
    path: '',
  });

  // Initialize form errors on mount
  useEffect(() => {
    setFormErrors({
      name: validateProjectName(projectName),
      path: projectPath ? '' : 'Project path is required'
    });
  }, [projectName, projectPath]);

  // Validate project name
  const validateProjectName = (name: string) => {
    if (!name.trim()) {
      return 'Project name is required';
    }
    
    if (!/^[a-z0-9-_]+$/.test(name)) {
      return 'Project name can only contain lowercase letters, numbers, hyphens, and underscores';
    }
    
    if (name.length > 50) {
      return 'Project name must be 50 characters or less';
    }
    
    return '';
  };

  // Handle project name change
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Always convert to lowercase to prevent capitalization issues
    const name = e.target.value.toLowerCase();
    setProjectName(name);
    
    if (!isTouched.name) {
      setIsTouched(prev => ({ ...prev, name: true }));
    }
    
    const error = validateProjectName(name);
    setFormErrors(prev => ({
      ...prev,
      name: error,
    }));
    
    // Auto-save after a short delay
    const timeoutId = setTimeout(() => {
      saveDraft();
    }, 500);
    
    // Clean up the timeout
    return () => clearTimeout(timeoutId);
  };

  // Browse for directory
  const handleBrowseDirectory = async () => {
    setIsSelectingPath(true);
    setIsTouched(prev => ({ ...prev, path: true }));
    
    try {
      const selectedPath = await frameworkService.browseForDirectory();
      if (selectedPath) {
        setProjectPath(selectedPath);
        setFormErrors(prev => ({
          ...prev,
          path: '',
        }));
        saveDraft();
        
        toast({
          type: "success",
          message: "Project location selected",
        });
      } else {
        // Silently handle the case where no directory was selected
        // User might have just closed the dialog
        console.log('No directory was selected');
      }
    } catch (error) {
      console.error('Failed to browse for directory:', error);
      // Only show an error if it's not simply a "No directory selected" error
      if (String(error).indexOf('No directory selected') === -1) {
        setFormErrors(prev => ({
          ...prev,
          path: `Error selecting directory: ${error}`,
        }));
        
        toast({
          type: "error",
          title: "Error",
          message: "Failed to select directory",
        });
      }
    } finally {
      setIsSelectingPath(false);
    }
  };

  // Handle description change
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const description = e.target.value;
    setProjectDescription(description);
    
    if (!isTouched.description) {
      setIsTouched(prev => ({ ...prev, description: true }));
    }
    
    // Auto-save after a short delay
    const timeoutId = setTimeout(() => {
      saveDraft();
    }, 500);
    
    // Clean up the timeout
    return () => clearTimeout(timeoutId);
  };

  // Is the form valid?
  const isFormValid = !formErrors.name && !formErrors.path && projectName && projectPath;

  // Handle next button
  const handleNext = () => {
    // Check if form needs validation
    if (!isTouched.name || !isTouched.path) {
      setIsTouched({ name: true, path: true, description: true });
      
      // Show toast if there are errors
      if (!isFormValid) {
        toast({
          type: "warning",
          title: "Validation Error",
          message: "Please fix the errors before continuing"
        });
        return;
      }
    }
    
    if (isFormValid) {
      saveDraft();
      onNext();
    }
  };

  // Calculate path to show
  const getFullProjectPath = () => {
    if (!projectPath || !projectName) return "";
    return `${projectPath}/${projectName}`;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Project Details</h2>
          <p className="text-base-content/70 mt-1">
            Let's start with the basic information about your new project.
          </p>
        </div>
        <button 
          onClick={onBackToDashboard} 
          className="btn btn-ghost btn-sm"
          aria-label="Back to dashboard"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="card bg-base-100 shadow-sm border border-base-300">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">Basic Information</h3>
          
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-medium">Project Name</span>
              {isTouched.name && formErrors.name && (
                <span className="label-text-alt text-error animate-fadeIn">{formErrors.name}</span>
              )}
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="my-awesome-project"
                className={cn(
                  "input input-bordered w-full pr-10",
                  isTouched.name && formErrors.name ? 'input-error animate-shake' : '',
                  isTouched.name && !formErrors.name && projectName ? 'input-success' : ''
                )}
                value={projectName}
                onChange={handleNameChange}
              />
              {isTouched.name && !formErrors.name && projectName && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-success animate-fadeIn">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
            <label className="label">
              <span className="label-text-alt">
                Use lowercase letters, numbers, hyphens, and underscores only
              </span>
              {projectName && (
                <span className="label-text-alt">{projectName.length}/50 characters</span>
              )}
            </label>
          </div>

          <div className="form-control w-full mt-2">
            <label className="label">
              <span className="label-text font-medium">Project Location</span>
              {isTouched.path && formErrors.path && (
                <span className="label-text-alt text-error animate-fadeIn">{formErrors.path}</span>
              )}
            </label>
            <div className="join w-full relative">
              <input
                type="text"
                placeholder="/path/to/project"
                className={cn(
                  "input input-bordered join-item w-full",
                  isTouched.path && formErrors.path ? 'input-error animate-shake' : '',
                  isTouched.path && !formErrors.path && projectPath ? 'input-success' : ''
                )}
                value={projectPath}
                readOnly
              />
              <button 
                className={cn(
                  "btn join-item",
                  isSelectingPath ? "loading" : ""
                )}
                onClick={handleBrowseDirectory}
                disabled={isSelectingPath}
              >
                {isSelectingPath ? "Selecting..." : "Browse"}
              </button>
              {isTouched.path && !formErrors.path && projectPath && (
                <div className="absolute right-16 top-1/2 -translate-y-1/2 text-success animate-fadeIn">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
            <label className="label">
              <span className="label-text-alt">
                Select a directory where your project will be created
              </span>
            </label>
          </div>

          <div className="form-control w-full mt-2">
            <label className="label">
              <span className="label-text font-medium">Project Description (optional)</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full min-h-24"
              placeholder="Briefly describe your project"
              value={projectDescription}
              onChange={handleDescriptionChange}
            />
            <label className="label">
              <span className="label-text-alt">
                This will be added to your package.json description
              </span>
              {projectDescription && (
                <span className="label-text-alt">{projectDescription.length}/150 characters</span>
              )}
            </label>
          </div>
        </div>
      </div>

      {/* Project path preview */}
      {isFormValid && (
        <div className="card bg-base-200 shadow-sm border border-base-300 overflow-hidden animate-slideUp">
          <div className="card-body p-4">
            <h3 className="card-title text-md mb-2">Project Preview</h3>
            <div className="font-mono text-sm bg-base-300 p-2 rounded overflow-x-auto">
              $ mkdir -p {getFullProjectPath()}
            </div>
            <div className="mt-2 text-xs opacity-70">
              This is where your project will be created
            </div>
          </div>
        </div>
      )}

      <div className={cn(
        "alert shadow-lg transition-all duration-300 border",
        isFormValid ? 'alert-success animate-pulse-slow border-success/30' : 'alert-info border-info/30'
      )}>
        <div>
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            {isFormValid
              ? 'All set! Your project will be created at: ' + getFullProjectPath()
              : 'Please fill in the required fields to continue'}
          </span>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between mt-8">
        <Button
          variant={canGoPrevious ? "outline" : "ghost"}
          onClick={onPrevious}
          disabled={!canGoPrevious}
          leftIcon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          }
        >
          Previous
        </Button>

        <Button
          variant="primary"
          onClick={handleNext}
          disabled={!isFormValid || !canGoNext}
          className={isFormValid ? 'animate-pulse-slow' : ''}
          rightIcon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          }
        >
          Next
        </Button>
      </div>
    </div>
  );
} 