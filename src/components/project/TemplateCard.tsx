"use client";

import { useTemplateStore } from "@/lib/store";
// import { Template } from "@/lib/store/template-store";
import Link from "next/link";
import { useState } from "react";

interface TemplateCardProps {
  template: any;
  onSelect?: () => void;
}

export default function TemplateCard({
  template,
  onSelect,
}: TemplateCardProps) {
  const { addFavorite, removeFavorite } = useTemplateStore();
  const isFavorite = false;

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isFavorite) {
      removeFavorite(template.id);
    } else {
      addFavorite(template.id);
    }
  };

  const handleCardClick = () => {
    if (onSelect) {
      onSelect();
    }
  };

  return (
    <div
      className={`card bg-base-100 shadow-lg hover:shadow-xl transition-shadow cursor-pointer ${onSelect ? "hover:bg-base-200" : ""}`}
      onClick={handleCardClick}
    >
      {template.screenshot ? (
        <figure className="h-48 overflow-hidden">
          <img
            src={template.screenshot}
            alt={`${template.name} template`}
            className="w-full object-cover"
          />
        </figure>
      ) : (
        <div className="h-48 bg-base-200 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 opacity-30"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
            />
          </svg>
        </div>
      )}

      <div className="card-body">
        <div className="flex justify-between">
          <h2 className="card-title">{template.name}</h2>
          <button
            className="btn btn-ghost btn-sm btn-circle"
            onClick={toggleFavorite}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill={isFavorite ? "currentColor" : "none"}
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
          </button>
        </div>

        <p className="text-base-content/70">{template.description}</p>

        <div className="flex flex-wrap gap-1 mt-2">
          {template.tags.map((tag: any) => (
            <span key={tag} className="badge badge-outline">
              {tag}
            </span>
          ))}
        </div>

        {!onSelect && (
          <div className="card-actions justify-end mt-4">
            <Link
              href={`/new-project?template=${template.id}`}
              className="btn btn-primary btn-sm"
            >
              Use Template
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
