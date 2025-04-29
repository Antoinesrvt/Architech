# ArchiTech Project Generator

A modern framework-based project generator built with Next.js and Tauri.

## Development Status

### Completed Tasks

✅ Framework-first architecture implementation  
✅ Rust backend for framework and module management  
✅ Project wizard UI with step-by-step flow  
✅ State management with Zustand  
✅ Animation and transitions for smooth UX  

### In Progress

🔄 Wizard component implementation:
- ✅ Basic framework selection
- ✅ Project details step
- ✅ Module selection step
- ✅ Configuration step
- ✅ Project summary view

### Remaining Tasks

🔲 **State Management Integration**
- Connect all wizard steps to share state
- Implement project generation API calls
- Create shared context for wizard steps

🔲 **Visual Enhancements**
- Install and configure required dependencies (clsx, tailwind-merge)
- Fix UI inconsistencies
- Complete responsive design

🔲 **Testing**
- Test full wizard flow
- Verify project generation
- Test framework/module compatibility
- Ensure cross-platform compatibility

## Wizard Flow

1. **Project Details** - Basic project information
2. **Framework Selection** - Choose web/mobile/desktop framework
3. **Module Selection** - Select compatible modules
4. **Configuration** - Configure framework and modules
5. **Summary** - Review and generate

## Getting Started

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

