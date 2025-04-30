"use client";

import { useState } from "react";
import { Module } from "@/lib/store/framework-store";

interface ModuleCardProps {
  module: Module;
  selected: boolean;
  onToggle: (moduleId: string, selected: boolean) => void;
  disabled?: boolean;
}

export default function ModuleCard({ 
  module, 
  selected, 
  onToggle, 
  disabled = false 
}: ModuleCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => {
    if (!disabled) {
      onToggle(module.id, !selected);
    }
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  // Determine category badge color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'styling':
        return 'badge-primary';
      case 'state':
        return 'badge-secondary';
      case 'i18n':
        return 'badge-accent';
      case 'testing':
        return 'badge-info';
      case 'ui':
        return 'badge-success';
      case 'forms':
        return 'badge-warning';
      case 'advanced':
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
  };

  return (
    <div 
      className={`card ${selected ? 'bg-primary/10 border-2 border-primary' : 'bg-base-100 border border-base-300'} 
        shadow-sm hover:shadow transition-all cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={handleToggle}
    >
      <div className="card-body p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            {/* <input 
              type="checkbox" 
              className="checkbox checkbox-primary mr-3" 
              checked={selected} 
              readOnly
              disabled={disabled}
            /> */}
            <div>
              <h3 className="font-bold">{module.name} <span className="text-xs opacity-70">v{module.version}</span></h3>
              <p className="text-sm opacity-70">{module.description}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <span className={`badge ${getCategoryColor(module.category)}`}>
              {module.category}
            </span>
            <button 
              className="btn btn-circle btn-ghost btn-xs" 
              onClick={handleExpandClick}
            >
              {expanded ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* CLI Commands Display */}
        {module.installation.commands.length > 0 && (
          <div className="mt-2 bg-base-200 rounded-md p-2 font-mono text-xs overflow-x-auto whitespace-nowrap">
            $ {module.installation.commands[0]}
            {module.installation.commands.length > 1 && "..."}
          </div>
        )}

        {expanded && (
          <div className="mt-4 text-sm space-y-3 border-t pt-3">
            {/* Dependencies */}
            {module.dependencies.length > 0 && (
              <div>
                <h4 className="font-medium">Dependencies</h4>
                <div className="flex flex-wrap gap-1 mt-1">
                  {module.dependencies.map(dep => (
                    <span key={dep} className="badge badge-outline badge-sm">{dep}</span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Incompatible with */}
            {module.incompatible_with.length > 0 && (
              <div>
                <h4 className="font-medium">Incompatible with</h4>
                <div className="flex flex-wrap gap-1 mt-1">
                  {module.incompatible_with.map(inc => (
                    <span key={inc} className="badge badge-error badge-sm">{inc}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Full CLI Commands */}
            {module.installation.commands.length > 1 && (
              <div>
                <h4 className="font-medium">Installation Commands</h4>
                <div className="bg-base-200 rounded p-2 font-mono text-xs mt-1">
                  {module.installation.commands.map((cmd, index) => (
                    <div key={index} className="whitespace-nowrap overflow-x-auto">$ {cmd}</div>
                  ))}
                </div>
              </div>
            )}

            {/* File Operations */}
            {module.installation.file_operations.length > 0 && (
              <div>
                <h4 className="font-medium">File Operations</h4>
                <div className="space-y-1 mt-1">
                  {module.installation.file_operations.map((op, index) => (
                    <div key={index} className="text-xs">
                      <span className={`inline-block rounded px-1 mr-1 ${
                        op.operation === 'create' ? 'bg-success/20 text-success' :
                        op.operation === 'modify' ? 'bg-warning/20 text-warning' :
                        'bg-info/20 text-info'
                      }`}>
                        {op.operation}
                      </span>
                      <span className="font-mono">{op.path}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Configuration Options */}
            {module.configuration.options.length > 0 && (
              <div>
                <h4 className="font-medium">Configuration Options</h4>
                <ul className="list-disc list-inside">
                  {module.configuration.options.map(opt => (
                    <li key={opt.id} className="text-xs">{opt.label}: {opt.description}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 