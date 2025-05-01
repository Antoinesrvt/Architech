"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useProjectStore } from "@/lib/store/project-store";
import { useFrameworkStore } from "@/lib/store/framework-store";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils/formatters";
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';

export default function ProjectDrafts() {
  const router = useRouter();
  const { drafts, loadDraft, deleteDraft } = useProjectStore();
  const { frameworks } = useFrameworkStore();
  const [expandedDraft, setExpandedDraft] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ left: 0, top: 0 });
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  // Fix hydration issues by only rendering after component mounts
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (activeDropdown && 
          !(event.target as Element).closest('.dropdown-content') && 
          !(event.target as Element).closest('.dropdown-trigger')) {
        setActiveDropdown(null);
      }
    }

    // Add the event listener with capture to ensure it runs before other handlers
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [activeDropdown]);

  // Update position of dropdown when active dropdown changes
  useEffect(() => {
    if (activeDropdown && buttonRefs.current[activeDropdown]) {
      const buttonElement = buttonRefs.current[activeDropdown];
      if (buttonElement) {
        const rect = buttonElement.getBoundingClientRect();
        
        // Position directly below the button
        setDropdownPosition({
          left: rect.left,
          top: rect.bottom + 5, // Add a small gap
        });
      }
    }
  }, [activeDropdown]);

  // Sort drafts by last updated date (newest first)
  const sortedDrafts = [...drafts].sort((a, b) => 
    new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
  );

  if (sortedDrafts.length === 0) {
    return null;
  }

  const toggleExpand = (draftId: string) => {
    // Don't toggle if clicking on the dropdown or its content
    if (activeDropdown) return;
    setExpandedDraft(expandedDraft === draftId ? null : draftId);
  };

  const toggleDropdown = (e: React.MouseEvent, draftId: string) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent any other actions
    
    // Calculate position immediately on toggle
    if (e.currentTarget instanceof HTMLButtonElement) {
      const rect = e.currentTarget.getBoundingClientRect();
      
      // Position directly below the button
      setDropdownPosition({
        left: rect.left,
        top: rect.bottom + 5, // Add a small gap
      });
    }
    
    setActiveDropdown(activeDropdown === draftId ? null : draftId);
  };

  const getFrameworkName = (frameworkId: string | null) => {
    if (!frameworkId) return 'No framework selected';
    const framework = frameworks.find(f => f.id === frameworkId);
    return framework?.name || 'Unknown framework';
  };

  const handleContinueDraft = (e: React.MouseEvent, draftId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveDropdown(null);
    
    try {
      loadDraft(draftId);
      // Use a slight delay to ensure the state is updated before navigation
      setTimeout(() => {
        router.push('/new-project');
      }, 100);
    } catch (error) {
      console.error("Error loading draft:", error);
      alert("There was an error loading this draft. It may be corrupted.");
    }
  };

  const handleDeleteDraft = (e: React.MouseEvent, draftId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveDropdown(null);
    
    // Use a more attractive confirmation dialog if possible
    if (confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
      try {
        deleteDraft(draftId);
      } catch (error) {
        console.error("Error deleting draft:", error);
        alert("There was an error deleting this draft.");
      }
    }
  };

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Drafts</h2>
          <div className="btn btn-sm">Loading...</div>
        </div>
        <div className="bg-base-200 rounded-lg p-4 text-center">
          Loading drafts...
        </div>
      </div>
    );
  }

  // Render dropdown menu as a portal-style element at the body level
  const renderDropdownMenu = () => {
    if (!activeDropdown) return null;
    
    return (
      <div 
        className="dropdown-content dropdown-menu menu p-2 shadow bg-base-100 rounded-box fixed w-48 z-[9999]"
        style={{ 
          left: `${dropdownPosition.left}px`,
          top: `${dropdownPosition.top}px`,
          maxHeight: '200px',
          overflowY: 'auto'
        }}
      >
        <button 
          className="btn btn-sm btn-ghost justify-start gap-2 w-full my-1 hover:bg-base-200"
          onClick={(e) => handleContinueDraft(e, activeDropdown)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
          Continue
        </button>
        <button 
          className="btn btn-sm btn-ghost text-error justify-start gap-2 w-full my-1 hover:bg-error/10"
          onClick={(e) => handleDeleteDraft(e, activeDropdown)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Drafts</h2>
        <Link href="/new-project" className="btn btn-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          New Draft
        </Link>
      </div>
      
      <div className="bg-base-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Framework</th>
                <th>Last Updated</th>
                <th className="w-16">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedDrafts.map((draft) => (
                <React.Fragment key={draft.id}>
                  <tr 
                    className={`hover:bg-base-300 cursor-pointer transition-colors ${expandedDraft === draft.id ? 'bg-base-300' : ''}`}
                    onClick={() => toggleExpand(draft.id)}
                  >
                    <td className="font-medium">
                      {draft.name || 'Untitled Project'}
                    </td>
                    <td>
                      {getFrameworkName(draft.frameworkId)}
                    </td>
                    <td>
                      {draft.lastUpdated ? formatRelativeTime(draft.lastUpdated) : 'Unknown'}
                    </td>
                    <td className="relative">
                      <div className="dropdown dropdown-end">
                        <button 
                          ref={(el) => { buttonRefs.current[draft.id] = el; }}
                          onClick={(e) => toggleDropdown(e, draft.id)}
                          className="btn btn-sm btn-ghost btn-square dropdown-trigger hover:bg-base-300 relative z-20"
                          aria-label="Open actions menu"
                          title="Actions"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedDraft === draft.id && (
                    <tr className="bg-base-300">
                      <td colSpan={4} className="p-4">
                        <div className="space-y-2">
                          {draft.path && (
                            <div>
                              <span className="font-semibold">Path:</span> {draft.path}
                            </div>
                          )}
                          {draft.description && (
                            <div>
                              <span className="font-semibold">Description:</span> {draft.description}
                            </div>
                          )}
                          {draft.moduleIds && Array.isArray(draft.moduleIds) && draft.moduleIds.length > 0 && (
                            <div>
                              <span className="font-semibold">Modules:</span> {draft.moduleIds.length} selected
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {createPortal(renderDropdownMenu(), document.body)}
    </div>
  );
} 