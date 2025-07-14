"use client";

import MainLayout from "@/components/layouts/MainLayout";
import { frameworkService } from "@/lib/api";
import { useFrameworkStore } from "@/lib/store";
import {
  Framework,
  type Module as ModuleType,
} from "@/lib/store/framework-store";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface ModuleWithMetadata extends ModuleType {
  uses: Set<string>;
  tags?: string[];
  screenshot?: string | null;
}

export default function ModulesPage() {
  const router = useRouter();
  const { frameworks, modules, setFrameworks, setModules } =
    useFrameworkStore();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("");

  // Fetch data if needed
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        // Only fetch if we need to
        if (frameworks.length === 0) {
          const frameworksData = await frameworkService.getFrameworks();
          setFrameworks(frameworksData);
        }

        if (modules.length === 0) {
          const modulesData = await frameworkService.getModules();
          setModules(modulesData);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setError("Failed to load modules. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    void fetchData();
  }, [frameworks.length, modules.length, setFrameworks, setModules]);

  // Enhance modules with usage data
  const enhancedModules = useMemo(() => {
    const result: ModuleWithMetadata[] = [];

    // Create a map of module IDs to frameworks that use them
    const usageMap = new Map<string, Set<string>>();

    // Populate the map
    for (const framework of frameworks) {
      for (const moduleId of framework.compatible_modules) {
        if (!usageMap.has(moduleId)) {
          usageMap.set(moduleId, new Set());
        }
        usageMap.get(moduleId)?.add(framework.id);
      }
    }

    // Create enhanced modules
    for (const moduleItem of modules) {
      result.push({
        ...moduleItem,
        uses: usageMap.get(moduleItem.id) ?? new Set(),
      });
    }

    return result;
  }, [frameworks, modules]);

  // Extract unique tags from all modules
  const tags = useMemo(() => {
    return Array.from(
      new Set(enhancedModules.flatMap((module) => module.tags ?? [])),
    ).sort();
  }, [enhancedModules]);

  // Filter modules based on search query and selected tag
  const filteredModules = useMemo(() => {
    return enhancedModules.filter((module) => {
      const matchesQuery =
        !searchQuery ||
        module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        module.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTag = !selectedTag || module.tags?.includes(selectedTag);

      return matchesQuery && matchesTag;
    });
  }, [enhancedModules, searchQuery, selectedTag]);

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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="stroke-info shrink-0 w-6 h-6"
            aria-label="Information icon"
          >
            <title>Information icon</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 className="font-bold">Build Your App with Modules</h3>
            <div className="text-xs">
              Modules are reusable components that can be added to your project.
              They provide specific functionality that can be combined to create
              your custom application.
            </div>
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
              {tags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`badge badge-lg ${selectedTag === tag ? "badge-primary" : "badge-outline"}`}
                onClick={() => handleTagClick(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : error ? (
          <div className="alert alert-error">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              aria-label="Error icon"
            >
              <title>Error icon</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
        ) : enhancedModules.length === 0 ? (
          <div className="alert">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-info shrink-0 w-6 h-6"
              aria-label="Information icon"
            >
              <title>Information icon</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>No modules found. Try selecting a framework first.</span>
          </div>
        ) : filteredModules.length === 0 ? (
          <div className="alert">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-info shrink-0 w-6 h-6"
              aria-label="Information icon"
            >
              <title>Information icon</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>No modules match your search criteria.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredModules.map((module) => (
              <button
                key={module.id}
                type="button"
                className="card bg-base-100 border border-base-300 hover:border-primary cursor-pointer transition-all hover:shadow-md text-left w-full"
                onClick={() => handleModuleClick(module.id)}
                aria-label={`View details for ${module.name} module`}
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
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-16 w-16"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          aria-label="Module placeholder"
                        >
                          <title>Module placeholder</title>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1"
                            d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </figure>
                <div className="card-body">
                  <h2 className="card-title">{module.name}</h2>
                  <p className="text-sm line-clamp-2">{module.description}</p>

                  <div className="flex flex-wrap gap-1 my-2">
                    {module.tags?.map((tag) => (
                      <span key={tag} className="badge badge-sm badge-outline">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="card-actions justify-between items-center mt-2">
                    <div className="text-xs opacity-70">
                      Used in {module.uses.size} framework
                      {module.uses.size !== 1 ? "s" : ""}
                    </div>
                    <Link
                      href={`/modules/${module.id}`}
                      className="btn btn-sm btn-primary"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
