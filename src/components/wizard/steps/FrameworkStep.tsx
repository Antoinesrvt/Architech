import { useFrameworkSelection } from '../hooks/useFrameworkSelection';
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
        "card bg-base-200 hover:bg-base-300 cursor-pointer transition-all transform hover:scale-[1.02] duration-300 border-2",
        selected ? "border-primary shadow-lg" : "border-transparent"
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
  const { 
    frameworksByType,
    selectedFrameworkId,
    selectedType,
    loading,
    error,
    setSelectedType,
    selectFramework
  } = useFrameworkSelection();

  return (
    <div className="space-y-6 animate-fadeIn">
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
          {frameworksByType.map(framework => (
            <FrameworkCard
              key={framework.id}
              framework={framework}
              selected={framework.id === selectedFrameworkId}
              onSelect={() => selectFramework(framework.id)}
            />
          ))}
          
          {frameworksByType.length === 0 && (
            <div className="col-span-3 text-center py-8">
              <p className="text-base-content/50">No frameworks available for this type.</p>
            </div>
          )}
        </div>
      )}

      {/* Selection summary */}
      {selectedFrameworkId && (
        <div className="alert alert-success mt-4 animate-fadeIn">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>You've selected a framework! Click "Next" to continue.</span>
        </div>
      )}
    </div>
  );
} 