"use client";

import type { Module } from "@/lib/store/framework-store";
import { cn } from "@/lib/utils/cn";
import { useState } from "react";

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
  disabled = false,
}: ModuleCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

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
      case "styling":
        return "badge-primary";
      case "state":
        return "badge-secondary";
      case "i18n":
        return "badge-accent";
      case "testing":
        return "badge-info";
      case "ui":
        return "badge-success";
      case "forms":
        return "badge-warning";
      case "advanced":
        return "badge-error";
      default:
        return "badge-ghost";
    }
  };

  return (
    <div
      className={cn(
        "card transition-all duration-300 relative",
        selected
          ? "bg-primary/10 border-2 border-primary shadow-md"
          : "bg-base-100 border border-base-300 shadow-sm hover:shadow",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        isHovering && !disabled && !selected
          ? "transform -translate-y-1 shadow-md"
          : "",
        expanded ? "z-10" : "",
        "animate-fadeIn",
      )}
      onClick={handleToggle}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Selection indicator */}
      {selected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary shadow-lg flex items-center justify-center text-primary-content animate-scaleIn">
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
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}

      <div className="card-body p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <div className="relative mr-3">
              {/* <input 
                type="checkbox" 
                className={cn(
                  "checkbox transition-all duration-200",
                  selected ? "checkbox-primary" : "checkbox-secondary",
                  disabled ? "opacity-50" : "",
                  selected ? "scale-110" : ""
                )}
                checked={selected} 
                readOnly
                disabled={disabled}
              /> */}
              {!disabled && !selected && isHovering && (
                <span className="absolute inset-0 w-full h-full bg-secondary/20 rounded-md animate-pulse" />
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold leading-tight">
                {module.name}{" "}
                <span className="text-xs opacity-70">v{module.version}</span>
              </h3>
              <p className="text-sm opacity-70">{module.description}</p>
            </div>
          </div>

          <div className="flex gap-2">
            {module.logo && (
              <div
                className={cn(
                  "w-10 h-10 rounded bg-base-200 flex items-center justify-center transition-transform duration-300",
                  selected ? "rotate-3" : "",
                )}
              >
                <img
                  src={module.logo}
                  alt={module.name}
                  className="w-8 h-8 object-contain"
                />
              </div>
            )}
            <span
              className={cn(
                "badge transition-all duration-300",
                getCategoryColor(module.category),
                selected ? "badge-lg" : "",
              )}
            >
              {module.category}
            </span>
            <button
              className={cn(
                "btn btn-circle btn-ghost btn-xs transition-all duration-300",
                expanded ? "bg-base-200" : "",
                isHovering && !expanded ? "animate-bounce-once" : "",
              )}
              onClick={handleExpandClick}
            >
              {expanded ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 transition-transform duration-300 -translate-y-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 15l7-7 7 7"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 transition-transform duration-300 translate-y-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* CLI Commands Display */}
        {module.installation.commands.length > 0 && (
          <div
            className={cn(
              "mt-2 bg-base-200 rounded-md p-2 font-mono text-xs overflow-x-auto whitespace-nowrap",
              "transition-all duration-300",
              selected ? "bg-primary/5 border border-primary/20" : "",
            )}
          >
            $ {module.installation.commands[0]}
            {module.installation.commands.length > 1 && "..."}
          </div>
        )}

        {expanded && (
          <div className="mt-4 text-sm space-y-3 border-t pt-3 animate-slideDown">
            {/* Dependencies */}
            {module.dependencies.length > 0 && (
              <div className="animate-fadeIn animation-delay-100">
                <h4 className="font-medium">Dependencies</h4>
                <div className="flex flex-wrap gap-1 mt-1">
                  {module.dependencies.map((dep, index) => (
                    <span
                      key={dep}
                      className={cn(
                        "badge badge-outline badge-sm transition-all",
                        "animate-fadeIn",
                        `animation-delay-${(index + 1) * 100}`,
                      )}
                    >
                      {dep}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Incompatible with */}
            {module.incompatible_with.length > 0 && (
              <div className="animate-fadeIn animation-delay-200">
                <h4 className="font-medium">Incompatible with</h4>
                <div className="flex flex-wrap gap-1 mt-1">
                  {module.incompatible_with.map((inc, index) => (
                    <span
                      key={inc}
                      className={cn(
                        "badge badge-error badge-sm",
                        "animate-fadeIn",
                        `animation-delay-${(index + 1) * 100}`,
                      )}
                    >
                      {inc}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Full CLI Commands */}
            {module.installation.commands.length > 1 && (
              <div className="animate-fadeIn animation-delay-300">
                <h4 className="font-medium">Installation Commands</h4>
                <div className="bg-base-200 rounded p-2 font-mono text-xs mt-1">
                  {module.installation.commands.map((cmd, index) => (
                    <div
                      key={index}
                      className={cn(
                        "whitespace-nowrap overflow-x-auto",
                        "animate-slideIn",
                        `animation-delay-${(index + 1) * 100}`,
                      )}
                    >
                      $ {cmd}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* File Operations */}
            {module.installation.file_operations.length > 0 && (
              <div className="animate-fadeIn animation-delay-400">
                <h4 className="font-medium">File Operations</h4>
                <div className="space-y-1 mt-1">
                  {module.installation.file_operations.map((op, index) => (
                    <div
                      key={index}
                      className={cn(
                        "text-xs",
                        "animate-slideIn",
                        `animation-delay-${(index + 1) * 100}`,
                      )}
                    >
                      <span
                        className={`inline-block rounded px-1 mr-1 ${
                          op.operation === "create"
                            ? "bg-success/20 text-success"
                            : op.operation === "modify"
                              ? "bg-warning/20 text-warning"
                              : "bg-info/20 text-info"
                        }`}
                      >
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
              <div className="animate-fadeIn animation-delay-500">
                <h4 className="font-medium">Configuration Options</h4>
                <ul className="list-disc list-inside">
                  {module.configuration.options.map((opt, index) => (
                    <li
                      key={opt.id}
                      className={cn(
                        "text-xs",
                        "animate-slideIn",
                        `animation-delay-${(index + 1) * 100}`,
                      )}
                    >
                      {opt.label}: {opt.description}
                    </li>
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
