'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  executeNodeCommand, 
  executeCommandStreaming, 
  cleanupCommand, 
  CommandResult,
  NodeCommandType,
  CommandEvent
} from '../lib/api/nodejs-executor';

interface NodeCommandExecutorProps {
  /**
   * Initial working directory
   */
  workingDir: string;
  /**
   * Initial command to execute
   */
  defaultCommand?: string;
  /**
   * Callback function to call when command completes
   */
  onCommandComplete?: (result: CommandResult) => void;
}

/**
 * Component for executing Node.js commands with real-time output
 */
const NodeCommandExecutor: React.FC<NodeCommandExecutorProps> = ({
  workingDir,
  defaultCommand = 'npm --version',
  onCommandComplete,
}) => {
  const [command, setCommand] = useState(defaultCommand);
  const [output, setOutput] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [commandId, setCommandId] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<NodeCommandType>(NodeCommandType.Npm);
  const outputRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll output to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (commandId) {
        cleanupCommand(commandId);
      }
    };
  }, [commandId]);
  
  // Parse command into args for tool-based execution
  const parseCommand = (cmd: string): string[] => {
    if (!cmd.trim()) return [];
    
    // Split by spaces but respect quoted strings
    const args: string[] = [];
    let currentArg = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < cmd.length; i++) {
      const char = cmd[i];
      
      if ((char === '"' || char === "'") && (i === 0 || cmd[i - 1] !== '\\')) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = '';
        } else {
          currentArg += char;
        }
      } else if (char === ' ' && !inQuotes) {
        if (currentArg) {
          args.push(currentArg);
          currentArg = '';
        }
      } else {
        currentArg += char;
      }
    }
    
    if (currentArg) {
      args.push(currentArg);
    }
    
    return args;
  };
  
  const handleExecuteCommand = async () => {
    if (!command.trim() || isRunning) return;
    
    try {
      setIsRunning(true);
      setOutput([]);
      setError(null);

      // For custom tool type, use the raw command
      let result: CommandResult;
      if (selectedTool === NodeCommandType.Custom) {
        result = await executeNodeCommand(workingDir, command);
      } else {
        // For specific tools, parse args and use the tool-specific function
        const args = parseCommand(command);
        result = await executeNodeCommand(workingDir, `${selectedTool.toLowerCase()} ${command}`);
      }
      
      // Split output by lines
      const outputLines = result.stdout.split('\n');
      const errorLines = result.stderr.split('\n');
      
      setOutput([
        ...outputLines.map(line => `[stdout] ${line}`),
        ...errorLines.map(line => `[stderr] ${line}`),
        `[system] Command completed with exit code ${result.exit_code}`,
      ]);
      
      if (onCommandComplete) {
        onCommandComplete(result);
      }
    } catch (err) {
      setError(`Failed to execute command: ${err}`);
    } finally {
      setIsRunning(false);
    }
  };
  
  const handleExecuteStreamingCommand = async () => {
    if (!command.trim() || isRunning) return;
    
    try {
      setIsRunning(true);
      setOutput([]);
      setError(null);
      
      // Handle command event
      const handleEvent = (event: CommandEvent) => {
        switch (event.type) {
          case 'stdout':
            setOutput(prev => [...prev, `[stdout] ${event.data}`]);
            break;
          case 'stderr':
            setOutput(prev => [...prev, `[stderr] ${event.data}`]);
            break;
          case 'completed':
            setOutput(prev => [
              ...prev,
              `[system] Command completed with exit code ${event.exitCode} (${event.success ? 'success' : 'failed'})`,
            ]);
            setIsRunning(false);
            setCommandId(null);
            break;
          case 'error':
            setError(`Command error: ${event.message}`);
            setIsRunning(false);
            setCommandId(null);
            break;
        }
      };

      // Execute command with streaming
      let id: string;
      if (selectedTool === NodeCommandType.Custom) {
        // For custom commands, use the raw command string
        id = await executeCommandStreaming(
          workingDir,
          NodeCommandType.Custom,
          [command],
          handleEvent
        );
      } else {
        // For specific tools, parse the arguments
        const args = parseCommand(command);
        id = await executeCommandStreaming(
          workingDir,
          selectedTool,
          args,
          handleEvent
        );
      }
      
      setCommandId(id);
    } catch (err) {
      setError(`Failed to execute streaming command: ${err}`);
      setIsRunning(false);
    }
  };
  
  const handleCancel = async () => {
    if (commandId) {
      await cleanupCommand(commandId);
      setCommandId(null);
      setIsRunning(false);
      setOutput(prev => [...prev, '[system] Command was cancelled']);
    }
  };
  
  return (
    <div className="p-4 border rounded-lg shadow-sm bg-gray-50">
      <h2 className="text-lg font-medium mb-4">Node.js Command Executor</h2>
      
      <div className="mb-4">
        <label htmlFor="tool-selector" className="block text-sm font-medium text-gray-700 mb-1">
          Tool
        </label>
        <select
          id="tool-selector"
          value={selectedTool}
          onChange={(e) => setSelectedTool(e.target.value as NodeCommandType)}
          disabled={isRunning}
          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value={NodeCommandType.Npm}>npm</option>
          <option value={NodeCommandType.Npx}>npx</option>
          <option value={NodeCommandType.Yarn}>yarn</option>
          <option value={NodeCommandType.Pnpm}>pnpm</option>
          <option value={NodeCommandType.Node}>node</option>
          <option value={NodeCommandType.Custom}>Custom</option>
        </select>
      </div>
      
      <div className="mb-4">
        <label htmlFor="command" className="block text-sm font-medium text-gray-700 mb-1">
          {selectedTool === NodeCommandType.Custom ? 'Command' : 'Arguments'}
        </label>
        <div className="flex gap-2">
          <input
            id="command"
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            disabled={isRunning}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={selectedTool === NodeCommandType.Custom 
              ? "Enter full command..." 
              : `Enter ${selectedTool.toLowerCase()} arguments...`}
          />
        </div>
      </div>
      
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleExecuteCommand}
          disabled={isRunning || !command.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Execute
        </button>
        <button
          onClick={handleExecuteStreamingCommand}
          disabled={isRunning || !command.trim()}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Execute (Streaming)
        </button>
        {isRunning && (
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Cancel
          </button>
        )}
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <div className="mb-2 text-sm font-medium text-gray-700">Output:</div>
      <div 
        ref={outputRef}
        className="bg-black text-green-400 p-3 rounded-md font-mono text-sm h-64 overflow-y-auto"
      >
        {output.length > 0 ? (
          output.map((line, i) => (
            <div key={i} className={line.startsWith('[stderr]') ? 'text-red-400' : line.startsWith('[system]') ? 'text-blue-400' : ''}>
              {line}
            </div>
          ))
        ) : (
          <div className="text-gray-500 italic">Output will appear here...</div>
        )}
        {isRunning && <div className="animate-pulse">▋</div>}
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        Working directory: {workingDir}
      </div>
    </div>
  );
};

export default NodeCommandExecutor; 