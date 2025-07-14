"use client";

import MainLayout from "@/components/layouts/MainLayout";
import ProjectDrafts from "@/components/project/ProjectDrafts";
import RecentProjects from "@/components/project/RecentProjects";
import { useToast } from "@/components/ui/Toast";
import { frameworkService } from "@/lib/api";
import { useFrameworkStore } from "@/lib/store";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const { frameworks, setFrameworks, modules, setModules } =
    useFrameworkStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch frameworks and modules on component mount
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);

        // Fetch frameworks
        const frameworksData = await frameworkService.getFrameworks();
        setFrameworks(frameworksData);

        // Fetch modules
        const modulesData = await frameworkService.getModules();
        setModules(modulesData);

        // Show success toast if everything loaded correctly
        // toast({
        //   type: "success",
        //   message: "Ready to create projects",
        // });
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setError(
          "Failed to load frameworks and modules. Please restart the application.",
        );

        // Show error toast
        toast({
          type: "error",
          title: "Loading Error",
          message: "Failed to load application data.",
          action: {
            label: "Retry",
            onClick: () => fetchData(),
          },
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [setFrameworks, setModules, toast]);

  // Card skeleton loader component for consistency
  const CardSkeleton = () => (
    <div className="card bg-base-100 shadow-lg animate-pulse">
      <div className="card-body">
        <div className="flex items-center gap-2">
          <div className="skeleton w-6 h-6 rounded-full" />
          <div className="skeleton h-6 w-32" />
        </div>
        <div className="skeleton h-10 w-16 mt-2" />
        <div className="card-actions justify-end mt-auto">
          <div className="skeleton h-8 w-20" />
        </div>
      </div>
    </div>
  );

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center animate-fadeIn">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Link
            href="/new-project"
            className="btn btn-primary transition-all hover:scale-105 active:scale-95"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-label="Plus icon"
            >
              <title>Plus icon</title>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children">
          {isLoading ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : (
            <>
              <div
                className={cn(
                  "card bg-base-100 shadow-lg transition-all duration-300 hover:shadow-xl animate-fadeIn",
                  "animation-delay-100",
                )}
              >
                <div className="card-body">
                  <h2 className="card-title flex gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-label="Frameworks icon"
                    >
                      <title>Frameworks icon</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                    Frameworks
                  </h2>
                  <p className="text-3xl font-bold">{frameworks.length}</p>
                  <div className="card-actions justify-end">
                    <Link
                      href="/frameworks"
                      className="btn btn-sm btn-ghost transition-all hover:bg-base-200"
                    >
                      View All
                    </Link>
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  "card bg-base-100 shadow-lg transition-all duration-300 hover:shadow-xl animate-fadeIn",
                  "animation-delay-200",
                )}
              >
                <div className="card-body">
                  <h2 className="card-title flex gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-label="Modules icon"
                    >
                      <title>Modules icon</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"
                      />
                    </svg>
                    Modules
                  </h2>
                  <p className="text-3xl font-bold">{modules.length}</p>
                  <div className="card-actions justify-end">
                    <Link
                      href="/modules"
                      className="btn btn-sm btn-ghost transition-all hover:bg-base-200"
                    >
                      View All
                    </Link>
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  "card bg-primary text-primary-content shadow-lg transition-all duration-300 hover:shadow-xl animate-fadeIn",
                  "animation-delay-300",
                )}
              >
                <div className="card-body">
                  <h2 className="card-title flex gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-label="Quick start icon"
                    >
                      <title>Quick start icon</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Quick Start
                  </h2>
                  <p>Create a new project with our wizard</p>
                  <div className="card-actions justify-end">
                    <Link
                      href="/new-project"
                      className="btn btn-sm transition-all hover:scale-105 active:scale-95"
                    >
                      Start Now
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {error ? (
          <div className="alert alert-error animate-slideUp shadow-lg">
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
            <div>
              <h3 className="font-bold">Error Loading Data</h3>
              <div className="text-sm">{error}</div>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => {
                setError(null);
                setIsLoading(true);
                setTimeout(() => {
                  window.location.reload();
                }, 500);
              }}
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slideUp animation-delay-200">
            <div className="lg:col-span-2">
              <RecentProjects />
            </div>
            <div className="lg:col-span-1">
              <ProjectDrafts />
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
