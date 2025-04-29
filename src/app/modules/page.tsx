"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layouts/MainLayout";
import { useTemplateStore } from "@/lib/store";
import { getApiService } from "@/lib/api";

// Define types for template and module structures
interface Module {
  id: string;
  name: string;
  description: string;
  tags: string[];
  dependencies: Record<string, string>;
  uses: Set<string>;
  screenshot: string | null;
}

interface ModuleData {
  name?: string;
  description?: string;
  tags?: string[];
  dependencies?: Record<string, string>;
  screenshot?: string;
}

interface Template {
  id: string;
  name: string;
  modules?: Record<string, ModuleData>;
  description?: string;
  tags?: string[];
  screenshot?: string;
}

export default function ModulesPage() {
  const router = useRouter();
  const templateStore = useTemplateStore();
  const templates = Array.isArray(templateStore.templates) ? templateStore.templates : [];
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Extract all modules from templates with defensive coding
  const extractModules = useMemo(() => {
    try {
      if (!Array.isArray(templates)) return [];
      
      const modulesMap = new Map<string, Module>();
      
      templates.forEach(template => {
        if (!template || typeof template !== 'object') return;
        
        // Use type assertion for the full Template interface
        const typedTemplate = template as Template & { modules?: Record<string, ModuleData> };
        
        // Check if modules property exists and is an object
        const templateModules = typedTemplate.modules;
        if (!templateModules || typeof templateModules !== 'object') return;
        
        Object.entries(templateModules).forEach(([moduleId, rawModuleData]) => {
          if (!moduleId) return;
          
          // Cast to ModuleData to access properties safely
          const moduleData = rawModuleData as ModuleData;
          
          try {
            modulesMap.set(moduleId, {
              id: moduleId,
              name: typeof moduleData.name === 'string' ? moduleData.name : moduleId,
              description: typeof moduleData.description === 'string' ? moduleData.description : "",
              tags: Array.isArray(moduleData.tags) ? moduleData.tags : [],
              dependencies: typeof moduleData.dependencies === 'object' ? moduleData.dependencies || {} : {},
              uses: new Set([typedTemplate.id]),
              screenshot: typeof moduleData.screenshot === 'string' ? moduleData.screenshot : null,
            });
          } catch (err) {
            console.error('Error processing module:', moduleId, err);
          }
        });
      });
      
      return Array.from(modulesMap.values());
    } catch (err) {
      console.error('Error extracting modules:', err);
      return [];
    }
  }, [templates]);
  
  // Extract unique tags from all modules
  const tags = useMemo(() => {
    try {
      if (!extractModules || !Array.isArray(extractModules)) return [];
      
      return Array.from(
        new Set(
          extractModules.flatMap(module => 
            Array.isArray(module.tags) ? module.tags : []
          )
        )
      ).sort();
    } catch (err) {
      console.error('Error extracting tags:', err);
      return [];
    }
  }, [extractModules]);
  
  // Filter modules based on search query and selected tag
  const filteredModules = useMemo(() => {
    try {
      if (!Array.isArray(extractModules)) return [];
      
      return extractModules.filter(module => {
        if (!module) return false;
        
        const matchesQuery = !searchQuery || 
          (typeof module.name === 'string' && module.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (typeof module.description === 'string' && module.description.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesTag = !selectedTag || 
          (Array.isArray(module.tags) && module.tags.includes(selectedTag));
        
        return matchesQuery && matchesTag;
      });
    } catch (err) {
      console.error('Error filtering modules:', err);
      return [];
    }
  }, [extractModules, searchQuery, selectedTag]);
  
  // Load templates if not already loaded
  useEffect(() => {
    if (isInitialized) return;
    
    async function initialize() {
      try {
        setIsLoading(true);
        setError(null);
        
        // Only fetch if we need to
        if (!Array.isArray(templateStore.templates) || templateStore.templates.length === 0) {
          const apiService = getApiService();
          const templatesData = await apiService.getTemplates();
          
          // Safely update store
          if (typeof templateStore.setTemplates === 'function') {
            templateStore.setTemplates(templatesData || []);
          }
        }
        
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to fetch templates:', err);
        setError('Failed to load modules. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
    
    void initialize();
  }, [templateStore, isInitialized]);
  
  const handleTagClick = (tag: string) => {
    setSelectedTag(tag === selectedTag ? "" : tag);
  };
  
  const handleModuleClick = (moduleId: string) => {
    router.push(`/modules/${moduleId}`);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Modules</h1>
        </div>
        
        <div className="alert bg-base-200">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <h3 className="font-bold">Build Your App with Modules</h3>
            <div className="text-xs">Modules are reusable components that can be added to your project. They provide specific functionality that can be combined to create your custom application.</div>
          </div>
        </div>
        
        {/* Search and Filter */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <input
              type="text"
              placeholder="Search modules..."
              className="input input-bordered w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div>
            <select
              className="select select-bordered w-full"
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
            >
              <option value="">All Categories</option>
              {tags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <button
                key={tag}
                className={`badge badge-lg ${selectedTag === tag ? 'badge-primary' : 'badge-outline'}`}
                onClick={() => { handleTagClick(tag); }}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
        
        {/* Content */}
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
        ) : extractModules.length === 0 ? (
          <div className="alert">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>No modules found. Try selecting a template first.</span>
          </div>
        ) : filteredModules.length === 0 ? (
          <div className="alert">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>No modules match your search criteria.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredModules.map(module => (
              <div
                key={module.id}
                className="card bg-base-100 border border-base-300 hover:border-primary cursor-pointer transition-all hover:shadow-md"
                onClick={() => { handleModuleClick(module.id); }}
              >
                <figure className="h-40 bg-gradient-to-br from-primary/5 to-secondary/5">
                  {module.screenshot ? (
                    <img
                      src={module.screenshot}
                      alt={module.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full">
                      <div className="text-4xl opacity-20">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                        </svg>
                      </div>
                    </div>
                  )}
                </figure>
                <div className="card-body">
                  <h2 className="card-title">{module.name}</h2>
                  <p className="text-sm line-clamp-2">{module.description}</p>
                  
                  <div className="flex flex-wrap gap-1 my-2">
                    {module.tags.map(tag => (
                      <span key={tag} className="badge badge-sm badge-outline">{tag}</span>
                    ))}
                  </div>
                  
                  <div className="card-actions justify-between items-center mt-2">
                    <div className="text-xs opacity-70">
                      Used in {module.uses.size} template{module.uses.size !== 1 ? 's' : ''}
                    </div>
                    <Link href={`/modules/${module.id}`} className="btn btn-sm btn-primary">
                      View Details
                    </Link>
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