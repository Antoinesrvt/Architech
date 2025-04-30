"use client";

import { Framework, Module } from "@/lib/store/framework-store";
import { useState } from "react";

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

  const fileOperations = getFileOperations();
  const totalFileOps = fileOperations.create + fileOperations.modify + fileOperations.other;

  return (
    <div className="bg-base-200 rounded-lg p-4 font-mono text-sm">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-lg font-sans">Command Preview</h3>
        <button 
          className="btn btn-sm btn-ghost"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      <div className="mockup-code">
        <pre data-prefix="$"><code>{formatFrameworkCommand()}</code></pre>
        <pre data-prefix=">" className="text-success"><code>Creating project...</code></pre>
        <pre data-prefix=">" className="text-success"><code>Framework installed!</code></pre>
        
        {expanded && modules.length > 0 && (
          <>
            <pre data-prefix="#" className="text-warning"><code>Installing modules...</code></pre>
            {getModuleCommands().map((cmd, index) => (
              <pre key={index} data-prefix="$"><code>{cmd}</code></pre>
            ))}
            <pre data-prefix=">" className="text-success"><code>All modules installed!</code></pre>
            
            {totalFileOps > 0 && (
              <>
                <pre data-prefix="#" className="text-warning"><code>Applying file operations...</code></pre>
                {fileOperations.create > 0 && (
                  <pre data-prefix="$"><code>Creating {fileOperations.create} file(s)...</code></pre>
                )}
                {fileOperations.modify > 0 && (
                  <pre data-prefix="$"><code>Modifying {fileOperations.modify} file(s)...</code></pre>
                )}
                {fileOperations.other > 0 && (
                  <pre data-prefix="$"><code>Other operations: {fileOperations.other}</code></pre>
                )}
                <pre data-prefix=">" className="text-success"><code>File operations complete!</code></pre>
              </>
            )}
          </>
        )}

        {!expanded && modules.length > 0 && (
          <pre data-prefix="..." className="text-info"><code>+ {modules.length} module installations ({totalFileOps} file operations)</code></pre>
        )}

        <pre data-prefix=">" className="text-success"><code>Project ready! 🚀</code></pre>
      </div>

      <div className="mt-2 text-xs font-sans opacity-70">
        These commands will run in sequence to set up your project.
      </div>
    </div>
  );
} 