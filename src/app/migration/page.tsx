"use client";

import { DataMigration } from "@/components/migration/DataMigration";
import React from "react";

export default function MigrationPage() {
  return (
    <div className="min-h-screen bg-base-200 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Data Migration</h1>
          <p className="text-base-content/70 max-w-2xl mx-auto">
            Welcome to the improved version of Architech! We've upgraded our
            data storage to use SQLite for better performance and reliability.
            Use the tool below to migrate your existing data.
          </p>
        </div>

        <DataMigration />

        <div className="mt-8 max-w-2xl mx-auto">
          <div className="bg-base-100 border border-base-300 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-3">Why SQLite?</h2>
            <div className="space-y-3 text-sm text-base-content/80">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <div>
                  <strong>Better Performance:</strong> Faster data access and
                  queries for large datasets
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <div>
                  <strong>Data Integrity:</strong> ACID compliance ensures your
                  data is always consistent
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <div>
                  <strong>Cross-Platform:</strong> Your data works seamlessly
                  across different operating systems
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <div>
                  <strong>Backup & Restore:</strong> Easy to backup and restore
                  your entire project database
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
