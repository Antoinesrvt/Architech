import { Framework } from "@/lib/store/framework-store";
import { cn } from "@/lib/utils/cn";

type FrameworkCardProps = {
  framework: Framework;
  selected?: boolean;
  onSelect: (framework: Framework) => void;
};

export default function FrameworkCard({ framework, selected = false, onSelect }: FrameworkCardProps) {
  return (
    <div 
      className={cn(
        "card bg-base-100 shadow-lg hover:shadow-xl transition-all cursor-pointer",
        selected && "ring-2 ring-primary"
      )}
      onClick={() => onSelect(framework)}
    >
      <div className="card-body">
        <h3 className="card-title flex items-center">
          {framework.name}
          {selected && (
            <div className="badge badge-primary ml-2">Selected</div>
          )}
        </h3>
        
        <p className="text-sm text-base-content/70">{framework.description}</p>
        
        <div className="mt-2 flex flex-wrap gap-1">
          {framework.tags.map(tag => (
            <div key={tag} className="badge badge-outline badge-sm">{tag}</div>
          ))}
        </div>
        
        <div className="mt-4">
          <div className="text-xs text-base-content/50">Type: {framework.type}</div>
          {framework.cli && (
            <div className="text-xs font-mono mt-1 text-base-content/50">
              CLI: {framework.cli.base_command}
            </div>
          )}
        </div>
        
        <div className="card-actions justify-end mt-4">
          <button 
            className="btn btn-primary btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(framework);
            }}
          >
            Select
          </button>
        </div>
      </div>
    </div>
  );
} 