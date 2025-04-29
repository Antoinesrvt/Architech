# ArchiTech Development Plan

## Completed Tasks

1. **Migration to Framework-First Approach**
   - Changed from template-based to framework-based architecture
   - Updated the Rust backend to support frameworks
   - Created framework definitions for web, app, and desktop frameworks
   - Updated frontend API services and stores

2. **UI Components**
   - Created FrameworkStep component for framework selection
   - Updated ProjectWizard component to use the framework-based flow

## Remaining Tasks

### 1. Complete Wizard Flow Components

- [ ] Create BasicInfoStep component (project name, path, etc.)
- [ ] Create ModulesStep component for module selection
- [ ] Create ConfigurationStep component for configuring modules
- [ ] Create SummaryStep component for final review

### 2. API Integration

- [ ] Implement API calls to load frameworks from the backend
- [ ] Fix project store interface to match the new implementation
- [ ] Implement module compatibility checking

### 3. Project Generation

- [ ] Test end-to-end flow from framework selection to generation
- [ ] Implement progress tracking
- [ ] Handle project generation errors
- [ ] Implement project opening in editor

### 4. Utilities and Helpers

- [ ] Install required dependencies (clsx, tailwind-merge)
- [ ] Create necessary utility functions

### 5. Testing and Documentation

- [ ] Test project generation with different frameworks
- [ ] Document the framework-first approach
- [ ] Create user documentation for the project wizard

## Timeline

- Week 1: Complete remaining wizard components and API integration
- Week 2: Implement project generation and test end-to-end flow
- Week 3: Finalize utilities, testing, and documentation

## Dependencies

- Tauri
- Next.js
- Zustand (for state management)
- clsx and tailwind-merge (for UI utilities)
- DaisyUI (for UI components) 