"use client";

import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { Framework, Module } from "@/lib/store/framework-store";
import { cn } from "@/lib/utils/cn";
import { useEffect, useState } from "react";

interface CommandPreviewProps {
  framework: Framework;
  modules: Module[];
  projectName: string;
}

export default function CommandPreview({
  framework,
  modules,
  projectName,
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
    if (!framework.cli)
      return `npx create-${framework.type}-app ${projectName}`;

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
    return modules.flatMap((module) =>
      module.installation.commands.map((cmd) => cmd),
    );
  };

  // Get file operations summary
  const getFileOperations = () => {
    const operations = {
      create: 0,
      modify: 0,
      other: 0,
    };

    for (const module of modules) {
      for (const op of module.installation.file_operations) {
        if (op.operation === "create") {
          operations.create++;
        } else if (op.operation === "modify") {
          operations.modify++;
        } else {
          operations.other++;
        }
      }
    }

    return operations;
  };

  // Get all commands for copying
  const getAllCommands = () => {
    const commands = [];
    commands.push(formatFrameworkCommand());
    commands.push(...getModuleCommands());
    return commands.join("\n");
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
      ...(getFileOperations().create +
        getFileOperations().modify +
        getFileOperations().other >
      0
        ? ["Applying file operations..."]
        : []),
      ...(getFileOperations().create > 0
        ? [`Creating ${getFileOperations().create} file(s)...`]
        : []),
      ...(getFileOperations().modify > 0
        ? [`Modifying ${getFileOperations().modify} file(s)...`]
        : []),
      ...(getFileOperations().other > 0
        ? [`Other operations: ${getFileOperations().other}`]
        : []),
      ...(getFileOperations().create +
        getFileOperations().modify +
        getFileOperations().other >
      0
        ? ["File operations complete!"]
        : []),

      // Completion
      "Project ready! 🚀",
    ];

    // Simulate executing each line in sequence
    const interval = setInterval(() => {
      setActiveLineIndex((prev) => {
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
  const totalFileOps =
    fileOperations.create + fileOperations.modify + fileOperations.other;

  // Calculate if the command is currently "running"
  const isCommandRunning =
    expanded &&
    activeLineIndex > 0 &&
    activeLineIndex < getModuleCommands().length + 3;

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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                />
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

      {/* Mac-style terminal */}
      <div className="overflow-hidden border border-slate-500/30 rounded-lg shadow-lg">
        {/* Terminal header */}
        <div className="bg-slate-700 p-2 flex items-center">
          <div className="flex space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <div className="flex-1 text-center text-xs text-white/70 font-sans">
            terminal
          </div>
        </div>

        {/* Gradient divider */}
        <div className="h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

        {/* Terminal content */}
        <div className="bg-slate-800 text-white p-4 space-y-1 font-mono text-xs sm:text-sm overflow-x-auto">
          <div className="flex">
            <span className="text-slate-400 w-5 flex-shrink-0">$</span>
            <span className="flex-1">
              <span className="text-cyan-400">npx</span>
              <span className="text-green-400">
                {formatFrameworkCommand().replace(/^npx /, "")}
              </span>
            </span>
          </div>

          {activeLineIndex >= 1 && (
            <div className="flex">
              <span className="text-slate-400 w-5 flex-shrink-0">&gt;</span>
              <span className="text-green-400">Creating project...</span>
            </div>
          )}

          {activeLineIndex >= 2 && (
            <div className="flex">
              <span className="text-slate-400 w-5 flex-shrink-0">&gt;</span>
              <span className="text-green-400">Framework installed!</span>
            </div>
          )}

          {modules.length > 0 && activeLineIndex >= 3 && (
            <div className="flex">
              <span className="text-slate-400 w-5 flex-shrink-0">#</span>
              <span className="text-yellow-400">Installing modules...</span>
            </div>
          )}

          {/* Module installation commands */}
          {expanded &&
            modules.map((module, index) => (
              <div key={`module-${module.id}`}>
                {module.installation.commands.map(
                  (command, cmdIndex) =>
                    activeLineIndex >= 4 + index + cmdIndex && (
                      <div key={`cmd-${index}-${cmdIndex}`} className="flex">
                        <span className="text-slate-400 w-5 flex-shrink-0">
                          $
                        </span>
                        <span>
                          {command.startsWith("npm") ? (
                            <>
                              <span className="text-cyan-400">npm</span>
                              <span className="text-green-400">
                                {command.replace(/^npm /, "")}
                              </span>
                            </>
                          ) : command.startsWith("npx") ? (
                            <>
                              <span className="text-cyan-400">npx</span>
                              <span className="text-green-400">
                                {command.replace(/^npx /, "")}
                              </span>
                            </>
                          ) : (
                            <span className="text-white">{command}</span>
                          )}
                        </span>
                      </div>
                    ),
                )}
              </div>
            ))}

          {/* Simplified view for collapsed state */}
          {!expanded && modules.length > 0 && (
            <div className="flex">
              <span className="text-slate-400 w-5 flex-shrink-0">$</span>
              <span>
                <span className="text-cyan-400">
                  {modules.length > 0 ? "npm" : "npx"}
                </span>
                <span className="text-green-400">
                  install {modules.map((m) => m.id).join(" ")}
                </span>
                {modules.length > 2 && (
                  <span className="text-yellow-400"> // ...and more</span>
                )}
              </span>
            </div>
          )}

          {/* Modules installed message */}
          {modules.length > 0 &&
            activeLineIndex > 3 + getModuleCommands().length && (
              <div className="flex">
                <span className="text-slate-400 w-5 flex-shrink-0">&gt;</span>
                <span className="text-green-400">All modules installed!</span>
              </div>
            )}

          {/* File operations */}
          {totalFileOps > 0 &&
            activeLineIndex >= 5 + getModuleCommands().length && (
              <div className="flex">
                <span className="text-slate-400 w-5 flex-shrink-0">#</span>
                <span className="text-yellow-400">
                  Applying file operations...
                </span>
              </div>
            )}

          {fileOperations.create > 0 &&
            activeLineIndex >= 6 + getModuleCommands().length && (
              <div className="flex">
                <span className="text-slate-400 w-5 flex-shrink-0">$</span>
                <span className="text-white">
                  Creating {fileOperations.create} file(s)...
                </span>
              </div>
            )}

          {fileOperations.modify > 0 &&
            activeLineIndex >= 7 + getModuleCommands().length && (
              <div className="flex">
                <span className="text-slate-400 w-5 flex-shrink-0">$</span>
                <span className="text-white">
                  Modifying {fileOperations.modify} file(s)...
                </span>
              </div>
            )}

          {fileOperations.other > 0 &&
            activeLineIndex >= 8 + getModuleCommands().length && (
              <div className="flex">
                <span className="text-slate-400 w-5 flex-shrink-0">$</span>
                <span className="text-white">
                  Other operations: {fileOperations.other}
                </span>
              </div>
            )}

          {totalFileOps > 0 &&
            activeLineIndex >= 9 + getModuleCommands().length && (
              <div className="flex">
                <span className="text-slate-400 w-5 flex-shrink-0">&gt;</span>
                <span className="text-green-400">
                  File operations complete!
                </span>
              </div>
            )}

          {/* Project ready */}
          {activeLineIndex >=
            (totalFileOps > 0 ? 10 : 5) + getModuleCommands().length && (
            <div className="flex">
              <span className="text-slate-400 w-5 flex-shrink-0">&gt;</span>
              <span className="text-green-400">Project ready! 🚀</span>
            </div>
          )}

          {/* Cursor */}
          <div className="flex">
            <span className="text-slate-400 w-5 flex-shrink-0">$</span>
            <span className="relative">
              <span className="invisible">_</span>
              <span className="absolute top-0 left-0 w-2 h-4 bg-white/70 animate-pulse"></span>
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2 text-xs font-sans opacity-70 flex justify-between items-center">
        <span>These commands will run in sequence to set up your project.</span>
        <span
          className="text-primary-focus hover:underline cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show less" : "Show more"}
        </span>
      </div>
    </div>
  );
}
