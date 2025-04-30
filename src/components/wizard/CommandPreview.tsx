"use client";

import { Framework, Module } from "@/lib/store/framework-store";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils/cn";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";

interface CommandPreviewProps {
  framework: Framework;
  modules: Module[];
  projectName: string;
}

export default function CommandPreview({
  framework,
  modules,
  projectName
}: CommandPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showCopiedIndicator, setShowCopiedIndicator] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const { toast } = useToast();

  // Auto-expand when there are few modules
  useEffect(() => {
    if (modules.length <= 2) {
      setExpanded(true);
    }
  }, [modules.length]);

  // Format framework CLI command for display
  const formatFrameworkCommand = () => {
    // Add null checks to prevent runtime errors
    if (!framework.cli) return `npx create-${framework.type}-app ${projectName}`;
    
    const baseCommand = framework.cli.base_command;
    let args = "";

    if (framework.cli.arguments) {
      args = Object.entries(framework.cli.arguments)
        .filter(([_, arg]) => arg.default && arg.flag)
        .map(([_, arg]) => arg.flag)
        .join(" ");
    }

    return `${baseCommand} ${args} ${projectName}`;
  };

  // Get all module installation commands
  const getModuleCommands = () => {
    // Flatten all commands from all modules
    return modules.flatMap(module => 
      module.installation.commands.map(cmd => cmd)
    );
  };

  // Get file operations summary
  const getFileOperations = () => {
    const operations = {
      create: 0,
      modify: 0,
      other: 0
    };

    modules.forEach(module => {
      module.installation.file_operations.forEach(op => {
        if (op.operation === "create") {
          operations.create++;
        } else if (op.operation === "modify") {
          operations.modify++;
        } else {
          operations.other++;
        }
      });
    });

    return operations;
  };

  // Get all commands for copying
  const getAllCommands = () => {
    const commands = [];
    commands.push(formatFrameworkCommand());
    commands.push(...getModuleCommands());
    return commands.join('\n');
  };

  // Animation effect for command execution simulation
  useEffect(() => {
    if (!expanded) {
      setActiveLineIndex(0);
      return;
    }

    // Calculate total number of lines
    const allLines = [
      // Framework installation
      formatFrameworkCommand(),
      "Creating project...",
      "Framework installed!",
      
      // Module installation
      ...(modules.length > 0 ? ["Installing modules..."] : []),
      ...getModuleCommands(),
      ...(modules.length > 0 ? ["All modules installed!"] : []),
      
      // File operations
      ...(getFileOperations().create + getFileOperations().modify + getFileOperations().other > 0 
          ? ["Applying file operations..."] : []),
      ...(getFileOperations().create > 0 ? [`Creating ${getFileOperations().create} file(s)...`] : []),
      ...(getFileOperations().modify > 0 ? [`Modifying ${getFileOperations().modify} file(s)...`] : []),
      ...(getFileOperations().other > 0 ? [`Other operations: ${getFileOperations().other}`] : []),
      ...(getFileOperations().create + getFileOperations().modify + getFileOperations().other > 0 
          ? ["File operations complete!"] : []),
      
      // Completion
      "Project ready! 🚀"
    ];

    // Simulate executing each line in sequence
    const interval = setInterval(() => {
      setActiveLineIndex(prev => {
        if (prev >= allLines.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 300);

    return () => clearInterval(interval);
  }, [expanded, modules, formatFrameworkCommand]);

  // Handle copy to clipboard
  const handleCopy = async () => {
    const commandText = getAllCommands();
    try {
      await navigator.clipboard.writeText(commandText);
      setCopiedText(commandText);
      setShowCopiedIndicator(true);
      
      // Show success toast
      toast({
        type: "success",
        title: "Copied!",
        message: "Commands copied to clipboard",
      });
      
      // Reset copied state after a short delay
      setTimeout(() => {
        setShowCopiedIndicator(false);
        setTimeout(() => {
          setCopiedText(null);
        }, 300);
      }, 2000);
    } catch (err) {
      toast({
        type: "error",
        title: "Copy Failed",
        message: "Could not copy commands to clipboard",
      });
      console.error("Failed to copy commands:", err);
    }
  };

  const fileOperations = getFileOperations();
  const totalFileOps = fileOperations.create + fileOperations.modify + fileOperations.other;

  // Calculate if the command is currently "running"
  const isCommandRunning = expanded && activeLineIndex > 0 && activeLineIndex < getModuleCommands().length + 3;

  return (
    <div className="bg-base-200 rounded-lg p-4 font-mono text-sm animate-fadeIn">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-lg font-sans">Command Preview</h3>
        <div className="flex gap-2">
          <Button 
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            disabled={isCommandRunning}
            className="relative"
            leftIcon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            }
          >
            {showCopiedIndicator ? "Copied!" : "Copy"}
            {showCopiedIndicator && (
              <span className="absolute -top-2 -right-2 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-success"></span>
              </span>
            )}
          </Button>
          <Button 
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            disabled={isCommandRunning}
          >
            {expanded ? "Collapse" : "Expand"}
          </Button>
        </div>
      </div>

      <div className="mockup-code bg-neutral/90 text-neutral-content relative shadow-md overflow-hidden border border-base-300">
        {/* Terminal header */}
        <div className="absolute top-0 left-0 right-0 flex items-center px-4 py-1 bg-neutral-focus text-neutral-content/80 text-xs">
          <div className="flex space-x-1 mr-2">
            <div className="w-3 h-3 rounded-full bg-error"></div>
            <div className="w-3 h-3 rounded-full bg-warning"></div>
            <div className="w-3 h-3 rounded-full bg-success"></div>
          </div>
          <div className="flex-1 text-center font-sans opacity-70">terminal</div>
        </div>

        {/* Main content with extra padding for header */}
        <div className="pt-6">
          {/* Fancy highlight effect */}
          <div className="absolute top-6 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent"></div>
          
          <pre 
            data-prefix="$" 
            className={cn(
              "transition-all duration-300 hover:bg-neutral-focus",
              activeLineIndex >= 0 ? "bg-neutral-focus/50" : ""
            )}
          >
            <code>
              <span className="text-primary font-bold">npx</span> 
              <span className="text-info">{formatFrameworkCommand().replace(/^npx /, '')}</span>
            </code>
          </pre>
          
          <pre 
            data-prefix=">" 
            className={cn(
              "text-success animate-slideIn animation-delay-100",
              activeLineIndex >= 1 ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
            )}
          >
            <code>Creating project...</code>
          </pre>
          
          <pre 
            data-prefix=">" 
            className={cn(
              "text-success",
              activeLineIndex >= 2 ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
            )}
          >
            <code>Framework installed!</code>
          </pre>
          
          {modules.length > 0 && (
            <pre 
              data-prefix="#" 
              className={cn(
                "text-warning",
                activeLineIndex >= 3 ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
              )}
            >
              <code>Installing modules...</code>
            </pre>
          )}
          
          {/* Module installation commands */}
          {expanded && modules.map((module, index) => (
            <div key={`module-${module.id}`}>
              {module.installation.commands.map((command, cmdIndex) => (
                <pre 
                  key={`cmd-${index}-${cmdIndex}`}
                  data-prefix="$"
                  className={cn(
                    "transition-all duration-300 hover:bg-neutral-focus",
                    activeLineIndex >= 4 + index + cmdIndex ? "bg-neutral-focus/30" : "",
                    activeLineIndex < 4 + index + cmdIndex ? "opacity-0 h-0 overflow-hidden" : "opacity-100"
                  )}
                >
                  <code>
                    {command.startsWith('npm') ? (
                      <>
                        <span className="text-primary font-bold">npm</span> 
                        <span className="text-cyan-400">{command.replace(/^npm /, '')}</span>
                      </>
                    ) : command.startsWith('npx') ? (
                      <>
                        <span className="text-primary font-bold">npx</span> 
                        <span className="text-cyan-400">{command.replace(/^npx /, '')}</span>
                      </>
                    ) : (
                      command
                    )}
                  </code>
                </pre>
              ))}
            </div>
          ))}
          
          {!expanded && modules.length > 0 && (
            <pre 
              data-prefix="$"
              className="bg-neutral-focus/30"
            >
              <code>
                <span className="text-primary font-bold">{modules.length > 0 ? 'npm' : 'npx'}</span> 
                <span className="text-cyan-400">install {modules.map(m => m.id).join(' ')}</span>
                {modules.length > 2 && <span className="text-warning"> // ...and more</span>}
              </code>
            </pre>
          )}
          
          {modules.length > 0 && activeLineIndex > 3 + getModuleCommands().length && (
            <pre 
              data-prefix=">" 
              className={cn(
                "text-success",
                activeLineIndex >= 4 + getModuleCommands().length ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
              )}
            >
              <code>All modules installed!</code>
            </pre>
          )}
          
          {/* File operations summary */}
          {totalFileOps > 0 && (
            <>
              <pre 
                data-prefix="#" 
                className={cn(
                  "text-warning",
                  activeLineIndex >= 5 + getModuleCommands().length ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
                )}
              >
                <code>Applying file operations...</code>
              </pre>
              
              {fileOperations.create > 0 && (
                <pre 
                  data-prefix="$" 
                  className={cn(
                    "bg-neutral-focus/30",
                    activeLineIndex >= 6 + getModuleCommands().length ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
                  )}
                >
                  <code>Creating {fileOperations.create} file(s)...</code>
                </pre>
              )}
              
              {fileOperations.modify > 0 && (
                <pre 
                  data-prefix="$" 
                  className={cn(
                    "bg-neutral-focus/30",
                    activeLineIndex >= 7 + getModuleCommands().length ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
                  )}
                >
                  <code>Modifying {fileOperations.modify} file(s)...</code>
                </pre>
              )}
              
              {fileOperations.other > 0 && (
                <pre 
                  data-prefix="$" 
                  className={cn(
                    "bg-neutral-focus/30",
                    activeLineIndex >= 8 + getModuleCommands().length ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
                  )}
                >
                  <code>Other operations: {fileOperations.other}</code>
                </pre>
              )}
              
              <pre 
                data-prefix=">" 
                className={cn(
                  "text-success",
                  activeLineIndex >= 9 + getModuleCommands().length ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
                )}
              >
                <code>File operations complete!</code>
              </pre>
            </>
          )}
          
          {/* Project ready */}
          <pre 
            data-prefix=">" 
            className={cn(
              "text-success",
              activeLineIndex >= (totalFileOps > 0 ? 10 : 5) + getModuleCommands().length ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
            )}
          >
            <code>Project ready! 🚀</code>
          </pre>
        </div>
      </div>

      <div className="mt-2 text-xs font-sans opacity-70 flex justify-between items-center">
        <span>These commands will run in sequence to set up your project.</span>
        <span className="text-primary-focus hover:underline cursor-pointer" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show less" : "Show more"}
        </span>
      </div>
    </div>
  );
} 