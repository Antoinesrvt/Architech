"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MainLayout from "@/components/layouts/MainLayout";
import { useTemplateStore } from "@/lib/store";
import { Template } from "@/lib/store/template-store";
import { getApiService } from "@/lib/api";

export default function TemplatesPage() {
  const router = useRouter();
  const templateStore = useTemplateStore();
  const templates = Array.isArray(templateStore.templates) ? templateStore.templates : [];
  const favoriteTemplates = Array.isArray(templateStore.favoriteTemplates) ? templateStore.favoriteTemplates : [];
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Load templates if they're not already loaded
  useEffect(() => {
    if (isInitialized) return;
    
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);
        
        // Only fetch if we need to
        if (!Array.isArray(templateStore.templates) || templateStore.templates.length === 0) {
          const templateService = getApiService();
          const templatesData = await templateService.getTemplates();
          
          // Safely update store
          if (typeof templateStore.setTemplates === 'function') {
            templateStore.setTemplates(templatesData || []);
          }
        }
        
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to fetch templates:', err);
        setError('Failed to load templates. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
    
    void fetchData();
  }, [templateStore, isInitialized]);

  // Extract all unique tags from templates with defensive coding
  const allTags = useMemo(() => {
    try {
      if (!Array.isArray(templates)) return [];
      
      return Array.from(
        new Set(
          templates.flatMap(template => 
            Array.isArray(template.tags) ? template.tags : []
          )
        )
      ).sort();
    } catch (err) {
      console.error('Error extracting tags:', err);
      return [];
    }
  }, [templates]);

  // Filter templates based on search query and tag with defensive coding
  const filteredTemplates = useMemo(() => {
    try {
      if (!Array.isArray(templates)) return [];
      
      return templates.filter(template => {
        if (!template) return false;
        
        const matchesSearch = 
          !searchQuery || 
          (typeof template.name === 'string' && template.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (typeof template.description === 'string' && template.description.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesTag = 
          !selectedTag || 
          (Array.isArray(template.tags) && template.tags.includes(selectedTag));
        
        return matchesSearch && matchesTag;
      });
    } catch (err) {
      console.error('Error filtering templates:', err);
      return [];
    }
  }, [templates, searchQuery, selectedTag]);

  // Handle template click to navigate to details page
  const handleTemplateClick = (templateId: string) => {
    router.push(`/templates/${templateId}`);
  };

  // Handle favorite toggle with error handling
  const handleFavoriteToggle = (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    try {
      if (favoriteTemplates.includes(templateId)) {
        templateStore.removeFavorite?.(templateId);
      } else {
        templateStore.addFavorite?.(templateId);
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  // Handle use template with error handling
  const handleUseTemplate = (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    try {
      router.push(`/new-project?template=${templateId}`);
    } catch (err) {
      console.error('Error navigating to new project:', err);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Templates</h1>
            <p className="text-base-content/70">
              Browse and select templates for your next project
            </p>
          </div>
          <Link href="/new-project" className="btn btn-primary">
            New Project
          </Link>
        </div>

        {/* Search and filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="form-control flex-1">
            <div className="input-group">
              <input
                type="text"
                placeholder="Search templates..."
                className="input input-bordered w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="btn btn-square">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="flex-none">
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-outline m-1">
                {selectedTag || "All Tags"}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </label>
              <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                <li><a onClick={() => setSelectedTag(null)}>All Tags</a></li>
                {allTags.map(tag => (
                  <li key={tag}>
                    <a onClick={() => { setSelectedTag(tag); }}>
                      {tag}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Templates grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : error ? (
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="alert">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>No templates found matching your criteria.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTemplates.map(template => (
              <div 
                key={template.id}
                className="card bg-base-100 border border-base-300 shadow-sm hover:shadow-md transition-all cursor-pointer"
                onClick={() => { handleTemplateClick(template.id); }}
              >
                <figure className="h-48 bg-gradient-to-br from-primary/5 to-secondary/5 relative">
                  {template.screenshot ? (
                    <img 
                      src={template.screenshot} 
                      alt={template.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full">
                      <div className="text-6xl opacity-20">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                        </svg>
                      </div>
                    </div>
                  )}
                  <button 
                    className="absolute top-2 right-2 btn btn-circle btn-sm"
                    onClick={(e) => { handleFavoriteToggle(e, template.id); }}
                  >
                    {favoriteTemplates.includes(template.id) ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-warning" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    )}
                  </button>
                </figure>
                <div className="card-body">
                  <h2 className="card-title">{template.name}</h2>
                  <p className="text-base-content/70">{template.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {template.tags && template.tags.map(tag => (
                      <span 
                        key={tag} 
                        className="badge badge-outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTag(tag);
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="card-actions justify-end mt-4">
                    <button 
                      className="btn btn-primary"
                      onClick={(e) => { handleUseTemplate(e, template.id); }}
                    >
                      Use Template
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
} 