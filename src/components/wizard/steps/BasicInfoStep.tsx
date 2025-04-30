import { useState, useEffect } from 'react';
import { useProjectStore } from '@/lib/store/project-store';
import { frameworkService } from '@/lib/api';

export function BasicInfoStep() {
  const { 
    projectName, 
    projectPath, 
    projectDescription, 
    setProjectName, 
    setProjectPath, 
    setProjectDescription,
    saveDraft
  } = useProjectStore();
  
  const [isSelectingPath, setIsSelectingPath] = useState(false);
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
    
    return '';
  };

  // Handle project name change
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Always convert to lowercase to prevent capitalization issues
    const name = e.target.value.toLowerCase();
    setProjectName(name);
    
    setFormErrors(prev => ({
      ...prev,
      name: validateProjectName(name),
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
    try {
      const selectedPath = await frameworkService.browseForDirectory();
      if (selectedPath) {
        setProjectPath(selectedPath);
        setFormErrors(prev => ({
          ...prev,
          path: '',
        }));
        saveDraft();
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
      }
    } finally {
      setIsSelectingPath(false);
    }
  };

  // Handle description change
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const description = e.target.value;
    setProjectDescription(description);
    
    // Auto-save after a short delay
    const timeoutId = setTimeout(() => {
      saveDraft();
    }, 500);
    
    // Clean up the timeout
    return () => clearTimeout(timeoutId);
  };

  // Is the form valid?
  const isFormValid = !formErrors.name && !formErrors.path && projectName && projectPath;

  return (
    <div className="space-y-6 animate-fadeIn">
      <h2 className="text-2xl font-bold">Project Details</h2>
      <p className="text-base-content/70">
        Let's start with the basic information about your new project.
      </p>

      <div className="form-control w-full">
        <label className="label">
          <span className="label-text">Project Name</span>
          <span className="label-text-alt text-error">{formErrors.name}</span>
        </label>
        <input
          type="text"
          placeholder="my-awesome-project"
          className={`input input-bordered w-full ${formErrors.name ? 'input-error' : ''}`}
          value={projectName}
          onChange={handleNameChange}
        />
        <label className="label">
          <span className="label-text-alt">
            Use lowercase letters, numbers, hyphens, and underscores only
          </span>
        </label>
      </div>

      <div className="form-control w-full">
        <label className="label">
          <span className="label-text">Project Location</span>
          <span className="label-text-alt text-error">{formErrors.path}</span>
        </label>
        <div className="join w-full">
          <input
            type="text"
            placeholder="/path/to/project"
            className="input input-bordered join-item w-full"
            value={projectPath}
            readOnly
          />
          <button 
            className="btn join-item"
            onClick={handleBrowseDirectory}
            disabled={isSelectingPath}
          >
            {isSelectingPath ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              'Browse'
            )}
          </button>
        </div>
        <label className="label">
          <span className="label-text-alt">
            Select a directory where your project will be created
          </span>
        </label>
      </div>

      <div className="form-control w-full">
        <label className="label">
          <span className="label-text">Project Description (optional)</span>
        </label>
        <textarea
          className="textarea textarea-bordered w-full"
          placeholder="Briefly describe your project"
          value={projectDescription}
          onChange={handleDescriptionChange}
        />
      </div>

      <div className={`alert ${isFormValid ? 'alert-success' : 'alert-info'} shadow-lg transition-all duration-300`}>
        <div>
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            {isFormValid
              ? 'All set! Your project will be created at: ' + (projectPath ? `${projectPath}/${projectName}` : '')
              : 'Please fill in the required fields to continue'}
          </span>
        </div>
      </div>
    </div>
  );
} 