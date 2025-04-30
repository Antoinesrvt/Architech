"use client";

import { useState } from "react";
import { Framework } from "@/lib/store/framework-store";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

interface FrameworkCardProps {
  framework: Framework;
  selected: boolean;
  onSelect: (frameworkId: string) => void;
  disabled?: boolean;
}

export default function FrameworkCard({ 
  framework, 
  selected, 
  onSelect,
  disabled = false 
}: FrameworkCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleSelect = () => {
    if (!disabled) {
      onSelect(framework.id);
    }
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  // Format CLI command for display
  const formatCliCommand = () => {
    // Add null checks to prevent runtime errors
    if (!framework.cli) return framework.name;
    
    const args = framework.cli.arguments ? 
      Object.entries(framework.cli.arguments)
        .filter(([_, arg]) => arg.default && arg.flag)
        .map(([_, arg]) => arg.flag)
        .join(" ") 
      : "";
    
    return `${framework.cli.base_command} ${args} [project-name]`;
  };

  // Get framework type badge color
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'web':
        return 'badge-primary';
      case 'mobile':
        return 'badge-secondary';
      case 'desktop':
        return 'badge-accent';
      default:
        return 'badge-ghost';
    }
  };

  return (
    <Card
      interactive
      selected={selected}
      disabled={disabled}
      hoverLift={!disabled}
      onClick={handleSelect}
      className={cn("transition-all duration-300", 
        expanded && "animate-pulse"
      )}
    >
      <Card.Body className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* <input 
              type="radio" 
              className="radio radio-primary"
              checked={selected} 
              readOnly
              disabled={disabled}
              aria-label={`Select ${framework.name}`}
            /> */}
            <div>
              <h3 className="font-bold text-lg">
                {framework.name} 
                <span className="text-xs opacity-70 ml-1">v{framework.version}</span>
              </h3>
              <p className="text-sm opacity-70">{framework.description}</p>
            </div>
          </div>
          
          <div className="flex gap-2 items-start">
            {framework.logo && (
              <div className="w-12 h-12 rounded bg-base-200/50 flex items-center justify-center transition-all">
                <img 
                  src={framework.logo} 
                  alt={framework.name} 
                  className="w-10 h-10 object-contain" 
                />
              </div>
            )}
            <span className={cn("badge", getTypeColor(framework.type))}>
              {framework.type}
            </span>
            <button 
              className="btn btn-circle btn-ghost btn-xs"
              onClick={handleExpandClick}
              aria-label={expanded ? "Show less" : "Show more"}
              aria-expanded={expanded}
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

        <div className="flex flex-wrap gap-1 mt-2">
          {framework.tags.map(tag => (
            <span key={tag} className="badge badge-sm badge-outline">{tag}</span>
          ))}
        </div>
        
        {/* CLI Command Display */}
        <div className="mt-3 cli-command animate-fadeIn">
          $ {formatCliCommand()}
        </div>

        {expanded && (
          <div className="mt-4 text-sm space-y-3 border-t pt-3 animate-slideDown">
            {/* Interactive CLI Badge */}
            {framework.cli.interactive && (
              <div className="badge badge-warning">Interactive CLI</div>
            )}
            
            {/* Compatible Modules */}
            <div>
              <h4 className="font-medium mb-1">Compatible Modules</h4>
              <div className="flex flex-wrap gap-1 stagger-children">
                {framework.compatible_modules && framework.compatible_modules.map(moduleId => (
                  <span key={moduleId} className="badge badge-outline badge-sm animate-fadeIn">
                    {moduleId}
                  </span>
                ))}
                {(!framework.compatible_modules || framework.compatible_modules.length === 0) && (
                  <span className="text-xs text-base-content/50">No compatible modules specified</span>
                )}
              </div>
            </div>
            
            {/* Directory Structure */}
            <div>
              <h4 className="font-medium mb-1">Directory Structure</h4>
              <div className="bg-base-200 p-2 rounded font-mono text-xs overflow-x-auto">
                {framework.directory_structure.directories.map((dir, index) => (
                  <div 
                    key={dir} 
                    className={cn(
                      "animate-fadeIn whitespace-nowrap",
                      `animation-delay-${index * 100 > 300 ? 300 : index * 100}`
                    )}
                  >
                    └─ {dir}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
} 