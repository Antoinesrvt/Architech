import { useState, useEffect } from 'react';
import { useFrameworkStore } from '@/lib/store';
import { Framework } from '@/lib/store/framework-store';
import { cn } from '@/lib/utils/cn';

interface FrameworkCardProps {
  framework: Framework;
  selected: boolean;
  onSelect: () => void;
}

function FrameworkCard({ framework, selected, onSelect }: FrameworkCardProps) {
  return (
    <div
      className={cn(
        "card bg-base-200 hover:bg-base-300 cursor-pointer transition-all",
        selected && "border-2 border-primary"
      )}
      onClick={onSelect}
    >
      <div className="card-body">
        <h3 className="card-title flex items-center">
          {framework.name}
          {selected && <span className="badge badge-primary ml-2">Selected</span>}
        </h3>
        <p className="text-sm opacity-70">{framework.description}</p>
        <div className="flex flex-wrap gap-1 mt-2">
          {framework.tags.map(tag => (
            <span key={tag} className="badge badge-outline badge-sm">{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FrameworkStep() {
  const { frameworks, setFrameworks } = useFrameworkStore();
  const [selectedType, setSelectedType] = useState<string>('web');
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch frameworks on component mount
  useEffect(() => {
    const fetchFrameworks = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // In a real implementation, this would call the API
        // For now, assume frameworks are already loaded or use mock data
        const response = await fetch('/api/frameworks');
        const data = await response.json();
        setFrameworks(data);
      } catch (err) {
        setError('Failed to load frameworks');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (frameworks.length === 0) {
      fetchFrameworks();
    }
  }, [frameworks.length, setFrameworks]);

  // Filter frameworks by type
  const filteredFrameworks = frameworks.filter(framework => framework.type === selectedType);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Select a Framework</h2>
      <p className="text-base-content/70">
        Choose the type of framework you want to use for your project.
      </p>

      {/* Framework type selector */}
      <div className="tabs tabs-boxed">
        <button 
          className={cn("tab", selectedType === 'web' && "tab-active")}
          onClick={() => setSelectedType('web')}
        >
          Web
        </button>
        <button 
          className={cn("tab", selectedType === 'app' && "tab-active")}
          onClick={() => setSelectedType('app')}
        >
          Mobile
        </button>
        <button 
          className={cn("tab", selectedType === 'desktop' && "tab-active")}
          onClick={() => setSelectedType('desktop')}
        >
          Desktop
        </button>
      </div>

      {loading && (
        <div className="flex justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFrameworks.map(framework => (
            <FrameworkCard
              key={framework.id}
              framework={framework}
              selected={framework.id === selectedFrameworkId}
              onSelect={() => setSelectedFrameworkId(framework.id)}
            />
          ))}
          
          {filteredFrameworks.length === 0 && (
            <div className="col-span-3 text-center py-8">
              <p className="text-base-content/50">No frameworks available for this type.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 