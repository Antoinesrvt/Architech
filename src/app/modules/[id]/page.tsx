import MainLayout from "@/components/layouts/MainLayout";
import { frameworkService } from "@/lib/api";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ModuleDetailClient from "./ModuleDetailClient";

// This function is required for Next.js static site generation with dynamic routes
export async function generateStaticParams() {
  try {
    // Get all module IDs from the frameworkService
    const modules = await frameworkService.getModules();

    // Return an array of objects with the id parameter
    return modules.map((module) => ({
      id: module.id,
    }));
  } catch (error) {
    console.error("Error generating static params:", error);
    return [];
  }
}

// Fetch module data on the server during build time
export default async function ModuleDetailPage({
  params,
}: { params: { id: string } }) {
  const moduleId = params.id;

  try {
    // This will be run at build time for static export
    const modules = await frameworkService.getModules();
    const module = modules.find((m) => m.id === moduleId);

    if (!module) {
      notFound();
    }

    return (
      <MainLayout>
        <Suspense
          fallback={
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg" />
            </div>
          }
        >
          <ModuleDetailClient module={module} />
        </Suspense>
      </MainLayout>
    );
  } catch (error) {
    console.error("Error fetching module:", error);
    return (
      <MainLayout>
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
          <span>Failed to load module details</span>
        </div>
      </MainLayout>
    );
  }
}
