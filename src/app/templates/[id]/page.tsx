"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import MainLayout from "@/components/layouts/MainLayout";
import { useTemplateStore } from "@/lib/store";
import { Template as BaseTemplate, Template } from "@/lib/store/template-store";
import { getApiService } from "@/lib/api";


// Extended Template interface that includes modules property
interface TemplateWithModules extends Template {
  modules?: Record<string, {
    name: string;
    description: string;
  }>;
  files?: string[];
  dependencies?: Record<string, string>;
}

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;
  const { templates = [], favoriteTemplates = [], addFavorite, removeFavorite } = useTemplateStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState<TemplateWithModules | null>(null);

  // Load template
  useEffect(() => {
    async function fetchData() {
      if (!templateId) return;

      try {
        setIsLoading(true);
        setError(null);

        // If templates are already loaded, find the template
        if (templates.length > 0) {
          const foundTemplate = templates.find(t => t.id === templateId);
          if (foundTemplate) {
            setTemplate(foundTemplate);
            setIsLoading(false);
            return;
          }
        }

        // Otherwise fetch from API
        const apiService = getApiService();
        const templatesData = await apiService.getTemplates();
        
        // Update store
        useTemplateStore.getState().setTemplates(templatesData);
        
        // Find the template
        const foundTemplate = templatesData.find((t: any) => t.id === templateId);
        if (foundTemplate) {
          setTemplate(foundTemplate);
        } else {
          setError("Template not found");
        }
      } catch (err) {
        console.error('Failed to fetch template:', err);
        setError('Failed to load template. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, [templateId, templates.length]);

  // Handle favorite toggle
  const handleFavoriteToggle = () => {
    if (!template) return;
    
    if (favoriteTemplates.includes(template.id)) {
      removeFavorite(template.id);
    } else {
      addFavorite(template.id);
    }
  };

  // Get recommended modules info
  const getRecommendedModulesCount = () => {
    if (!template || !template.recommendedModules) return 0;
    return template.recommendedModules.length;
  };

  // Start new project with this template
  const handleStartProject = () => {
    router.push(`/new-project?template=${templateId}`);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="text-sm breadcrumbs">
          <ul>
            <li>
              <Link href="/templates">Templates</Link>
            </li>
            <li>
              {isLoading ? (
                <span className="loading loading-dots loading-xs"></span>
              ) : template ? (
                template.name
              ) : (
                "Template Details"
              )}
            </li>
          </ul>
        </div>

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
        ) : template ? (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold">{template.name}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex flex-wrap gap-1">
                    {template.tags.map((tag: string) => (
                      <span key={tag} className="badge badge-outline">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  className="btn btn-circle" 
                  onClick={handleFavoriteToggle}
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
                <button className="btn btn-primary" onClick={handleStartProject}>
                  Start New Project
                </button>
              </div>
            </div>

            {/* Template Preview */}
            <div className="card bg-base-100 border border-base-300 overflow-hidden">
              <figure className="h-64 md:h-96 bg-gradient-to-br from-primary/5 to-secondary/5">
                {template.screenshot ? (
                  <img 
                    src={template.screenshot} 
                    alt={template.name} 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    <div className="text-6xl opacity-20">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                      </svg>
                    </div>
                  </div>
                )}
              </figure>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Description */}
              <div className="md:col-span-2 space-y-6">
                <div className="card bg-base-100 border border-base-300">
                  <div className="card-body">
                    <h2 className="card-title">Description</h2>
                    <p className="whitespace-pre-line">{template.description}</p>
                  </div>
                </div>

                {/* Files and Structure */}
                {template.files && template.files.length > 0 && (
                  <div className="card bg-base-100 border border-base-300">
                    <div className="card-body">
                      <h2 className="card-title">Files and Structure</h2>
                      <ul className="list-disc pl-5 space-y-2">
                        {template.files.map((file: string, index: number) => (
                          <li key={index}>{file}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                
                {/* Dependencies */}
                {template.dependencies && Object.keys(template.dependencies).length > 0 && (
                  <div className="card bg-base-100 border border-base-300">
                    <div className="card-body">
                      <h2 className="card-title">Dependencies</h2>
                      <div className="overflow-x-auto">
                        <table className="table table-zebra w-full">
                          <thead>
                            <tr>
                              <th>Package</th>
                              <th>Version</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(template.dependencies).map(([pkg, version]: [string, any]) => (
                              <tr key={pkg}>
                                <td>{pkg}</td>
                                <td>{version}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Template Info */}
                <div className="card bg-base-100 border border-base-300">
                  <div className="card-body">
                    <h2 className="card-title">Template Info</h2>
                    <div className="stats stats-vertical shadow">
                      <div className="stat">
                        <div className="stat-title">Recommended Modules</div>
                        <div className="stat-value">{getRecommendedModulesCount()}</div>
                      </div>
                      
                      {template.version && (
                        <div className="stat">
                          <div className="stat-title">Version</div>
                          <div className="stat-value text-primary">{template.version}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Recommended Modules */}
                {template.recommendedModules && template.recommendedModules.length > 0 && (
                  <div className="card bg-base-100 border border-base-300">
                    <div className="card-body">
                      <h2 className="card-title">Recommended Modules</h2>
                      <ul className="menu bg-base-200 w-full rounded-box">
                        {template.recommendedModules.map((moduleId: string) => {
                          const moduleDetails = (templates as TemplateWithModules[]).reduce((acc, t) => {
                            if (t.modules && t.modules[moduleId]) {
                              return t.modules[moduleId];
                            }
                            return acc;
                          }, { name: moduleId, description: "" });
                          
                          return (
                            <li key={moduleId}>
                              <Link href={`/modules/${moduleId}`}>
                                <span className="font-medium">{moduleDetails.name || moduleId}</span>
                                {moduleDetails.description && (
                                  <span className="text-xs text-base-content/70">{moduleDetails.description}</span>
                                )}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                      <div className="card-actions mt-4">
                        <Link href="/modules" className="btn btn-outline btn-block">
                          Browse All Modules
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Actions */}
                <div className="card bg-base-100 border border-base-300">
                  <div className="card-body">
                    <h2 className="card-title">Actions</h2>
                    <div className="space-y-3">
                      <button className="btn btn-primary btn-block" onClick={handleStartProject}>
                        Start New Project
                      </button>
                      <Link href="/templates" className="btn btn-outline btn-block">
                        Back to Templates
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="alert">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Template not found.</span>
          </div>
        )}
      </div>
    </MainLayout>
  );
} 