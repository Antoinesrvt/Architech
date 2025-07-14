"use client";

import MainLayout from "@/components/layouts/MainLayout";
import { frameworkService } from "@/lib/api";
import { useFrameworkStore } from "@/lib/store";
import { Framework } from "@/lib/store/framework-store";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function FrameworksPage() {
  const router = useRouter();
  const {
    frameworks,
    setFrameworks,
    favoriteFrameworks,
    addFavorite,
    removeFavorite,
  } = useFrameworkStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Fetch frameworks on component mount
  useEffect(() => {
    async function fetchFrameworks() {
      try {
        setLoading(true);
        setError(null);

        const fetchedFrameworks = await frameworkService.getFrameworks();
        setFrameworks(fetchedFrameworks);
      } catch (err) {
        console.error("Failed to load frameworks:", err);
        setError("Failed to load frameworks. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    if (frameworks.length === 0) {
      fetchFrameworks();
    } else {
      setLoading(false);
    }
  }, [frameworks.length, setFrameworks]);

  // Get unique framework types for filtering
  const frameworkTypes = Array.from(
    new Set(frameworks.map((framework) => framework.type)),
  );

  // Filter frameworks based on search and type
  const filteredFrameworks = frameworks.filter((framework) => {
    const matchesSearch =
      !searchQuery ||
      framework.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      framework.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = !selectedType || framework.type === selectedType;

    return matchesSearch && matchesType;
  });

  // Handle framework card click
  const handleFrameworkClick = (frameworkId: string) => {
    router.push(`/new-project?framework=${frameworkId}`);
  };

  // Toggle framework favorite status
  const toggleFavorite = (e: React.MouseEvent, frameworkId: string) => {
    e.stopPropagation();
    if (favoriteFrameworks.includes(frameworkId)) {
      removeFavorite(frameworkId);
    } else {
      addFavorite(frameworkId);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Frameworks</h1>
          <Link href="/new-project" className="btn btn-primary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Project
          </Link>
        </div>

        <div className="alert bg-base-200">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="stroke-info shrink-0 w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 className="font-bold">Start with a Framework</h3>
            <div className="text-xs">
              Choose a framework as the foundation for your project.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-4">
            <input
              type="text"
              placeholder="Search frameworks..."
              className="input input-bordered w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div>
            <select
              className="select select-bordered w-full"
              value={selectedType || ""}
              onChange={(e) => setSelectedType(e.target.value || null)}
            >
              <option value="">All Types</option>
              {frameworkTypes.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
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
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
        ) : filteredFrameworks.length === 0 ? (
          <div className="alert">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-info shrink-0 w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>No frameworks match your search criteria.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFrameworks.map((framework) => (
              <div
                key={framework.id}
                className="card bg-base-100 border border-base-300 hover:border-primary cursor-pointer transition-all hover:shadow-md"
                onClick={() => handleFrameworkClick(framework.id)}
              >
                <figure className="h-40 bg-gradient-to-br from-primary/5 to-secondary/5">
                  {framework.logo ? (
                    <img
                      src={framework.logo}
                      alt={framework.name}
                      className="w-full h-full object-contain p-4"
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
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1"
                            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </figure>
                <div className="card-body">
                  <div className="flex justify-between items-start">
                    <h2 className="card-title">{framework.name}</h2>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => toggleFavorite(e, framework.id)}
                    >
                      {favoriteFrameworks.includes(framework.id) ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-warning"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-sm line-clamp-2">
                    {framework.description}
                  </p>

                  <div className="flex flex-wrap gap-1 my-2">
                    {framework.tags.map((tag) => (
                      <span key={tag} className="badge badge-sm badge-outline">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="card-actions justify-between items-center mt-2">
                    <div
                      className={cn(
                        "badge",
                        framework.type === "web"
                          ? "badge-primary"
                          : framework.type === "app"
                            ? "badge-secondary"
                            : "badge-accent",
                      )}
                    >
                      {framework.type}
                    </div>
                    <button className="btn btn-sm btn-primary">
                      Use Framework
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
