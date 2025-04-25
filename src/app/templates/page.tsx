"use client";

import { useState, useEffect } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import TemplateCard from "@/components/project/TemplateCard";
import { useTemplateStore } from "@/lib/store";
import { getApiService } from "@/lib/api";
import Link from "next/link";

export default function TemplatesPage() {
  const { templates, setTemplates, favoriteTemplates } = useTemplateStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const api = getApiService();

  // Fetch templates on component mount
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const templatesData = await api.getTemplates();
        setTemplates(templatesData);
      } catch (err) {
        console.error("Failed to fetch templates:", err);
        setError("Failed to load templates. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, [api, setTemplates]);

  // Filter templates based on search query and category
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = searchQuery === "" || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = !categoryFilter || template.tags.includes(categoryFilter);
    
    return matchesSearch && matchesCategory;
  });

  // Extract unique categories from all templates
  const categories = [...new Set(templates.flatMap(t => t.tags))].sort();

  // Separate favorite templates
  const favoritedTemplates = templates.filter(t => favoriteTemplates.includes(t.id));

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Templates</h1>
          <Link href="/new-project" className="btn btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
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
          
          <select 
            className="select select-bordered w-full md:w-64"
            value={categoryFilter || ""}
            onChange={(e) => setCategoryFilter(e.target.value || null)}
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        
        {/* Loading and error states */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton h-80 w-full"></div>
            ))}
          </div>
        ) : error ? (
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        ) : (
          <>
            {/* Favorites section */}
            {favoritedTemplates.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Favorites</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {favoritedTemplates.map(template => (
                    <TemplateCard key={template.id} template={template} />
                  ))}
                </div>
                <div className="divider"></div>
              </div>
            )}
            
            {/* All templates or filtered results */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">
                {searchQuery || categoryFilter ? 'Search Results' : 'All Templates'}
              </h2>
              
              {filteredTemplates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTemplates.map(template => (
                    <TemplateCard key={template.id} template={template} />
                  ))}
                </div>
              ) : (
                <div className="card bg-base-100 shadow-lg">
                  <div className="card-body items-center text-center">
                    <h2 className="card-title">No Templates Found</h2>
                    <p className="text-base-content/70">
                      No templates match your search criteria. Try adjusting your filters.
                    </p>
                    <div className="card-actions mt-4">
                      <button 
                        className="btn btn-primary"
                        onClick={() => {
                          setSearchQuery("");
                          setCategoryFilter(null);
                        }}
                      >
                        Clear Filters
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
} 