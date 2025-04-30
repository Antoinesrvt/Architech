import { Code, Settings, Search, Database, Zap, Check } from 'lucide-react';
import { SectionProps, TechnicalComponent } from './types';

export const Technical = ({ sectionRef }: SectionProps) => {
  const components: TechnicalComponent[] = [
    {
      title: "Template Engine",
      description:
        "Pattern-based code generation with intelligent variable substitution",
      icon: Code,
      color: "text-blue-400",
    },
    {
      title: "Configuration Manager",
      description:
        "Handles dependencies, environment setup, and tool configurations",
      icon: Settings,
      color: "text-purple-400",
    },
    {
      title: "Pattern Recognizer",
      description:
        "Analyzes successful project structures to inform recommendations",
      icon: Search,
      color: "text-pink-400",
    },
    {
      title: "Technology Graph",
      description:
        "Maintains knowledge of compatibility and optimal combinations",
      icon: Database,
      color: "text-green-400",
    },
    {
      title: "Project Generator",
      description:
        "Assembles all elements into a cohesive, production-ready foundation",
      icon: Zap,
      color: "text-yellow-400",
    },
  ];

  const leftPoints = [
    "Language and framework agnostic platform",
    "Generated code follows industry best practices",
    "No proprietary elements or vendor lock-in",
    "Extensibility as a core design principle",
  ];

  const rightPoints = [
    "Intelligent recommendations based on project requirements",
    "Learning system that evolves with development trends",
    "Multi-framework support with optimal configurations",
    "Complete project foundations in minutes, not weeks",
  ];

  return (
    <section
      ref={sectionRef}
      className="py-24 bg-gradient-to-b from-gray-900 to-gray-950"
    >
      <div className="max-w-6xl mx-auto px-4">
        {/* Section heading */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
              Technical Overview
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Under the hood: How The Architect transforms development.
          </p>
        </div>

        {/* Technical architecture visualization */}
        <div className="bg-gray-900/70 backdrop-blur-sm border border-gray-800 rounded-xl p-8">
          <div className="grid md:grid-cols-5 gap-6">
            {components.map((component, index) => {
              const ComponentIcon = component.icon;

              return (
                <div
                  key={index}
                  className="p-4 rounded-lg bg-gray-950 border border-gray-800 transition-all duration-700 transform hover:scale-105"
                >
                  <div className="flex items-center mb-4">
                    <ComponentIcon
                      size={24}
                      className={`${component.color} mr-3`}
                    />
                    <h3 className="text-lg font-medium text-white">
                      {component.title}
                    </h3>
                  </div>
                  <p className="text-gray-400 text-sm">
                    {component.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 p-6 rounded-lg bg-gray-950 border border-gray-800">
            <h3 className="text-xl font-medium text-white mb-4">
              Technical Implementation
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                {leftPoints.map((point, i) => (
                  <div key={i} className="flex items-start text-gray-300">
                    <Check
                      size={16}
                      className="text-green-400 mr-2 mt-1 flex-shrink-0"
                    />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {rightPoints.map((point, i) => (
                  <div key={i} className="flex items-start text-gray-300">
                    <Check
                      size={16}
                      className="text-green-400 mr-2 mt-1 flex-shrink-0"
                    />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}; 