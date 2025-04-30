import { Search, Cpu, Code, CheckCircle, ArrowRight, Layout, Server, Database, Shield } from 'lucide-react';
import { useStepAnimation } from './hooks';
import { ProcessStep, SectionProps, TechItem } from './types';

export const HowItWorks = ({ sectionRef, isVisible, scrollToSection }: SectionProps) => {
  const { activeStep, setActiveStep } = useStepAnimation(isVisible || false);

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="py-24 bg-gradient-to-b from-gray-900 to-gray-950"
    >
      <div className="max-w-6xl mx-auto px-4">
        {/* Section heading */}
        <SectionHeading />

        {/* Process steps */}
        <ProcessSteps 
          activeStep={activeStep} 
          isVisible={isVisible} 
        />

        {/* Interactive process visualization */}
        <ProcessVisualization 
          activeStep={activeStep} 
          setActiveStep={setActiveStep} 
          isVisible={isVisible} 
        />
      </div>
    </section>
  );
};

const SectionHeading = () => (
  <div className="text-center mb-16">
    <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
        How The Architect Works
      </span>
    </h2>
    <p className="text-xl text-gray-300 max-w-2xl mx-auto">
      A simple three-step process that transforms the development
      workflow.
    </p>
  </div>
);

const ProcessSteps = ({ 
  activeStep, 
  isVisible 
}: { 
  activeStep: number; 
  isVisible?: boolean; 
}) => {
  const steps: ProcessStep[] = [
    {
      title: "Requirement Analysis",
      description:
        "The Architect analyzes your specific needs, application type, and feature requirements.",
      icon: Search,
      color: "text-blue-400",
      bgColor: "bg-blue-900/20",
      borderColor: "border-blue-900/50",
    },
    {
      title: "Technology Selection",
      description:
        "Optimal technology combinations are recommended based on compatibility and requirements.",
      icon: Cpu,
      color: "text-purple-400",
      bgColor: "bg-purple-900/20",
      borderColor: "border-purple-900/50",
    },
    {
      title: "Foundation Generation",
      description:
        "A complete, production-ready project foundation is generated in minutes.",
      icon: Code,
      color: "text-green-400",
      bgColor: "bg-green-900/20",
      borderColor: "border-green-900/50",
    },
  ];

  return (
    <div className="grid md:grid-cols-3 gap-8 mb-16 relative">
      {/* Connection lines */}
      <div className="hidden md:block absolute top-16 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 z-0"></div>

      {steps.map((step, index) => {
        const isActive = activeStep === index;
        const StepIcon = step.icon;

        return (
          <div
            key={index}
            className={`relative z-10 transition-all duration-500 transform ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            } ${isActive ? "scale-105" : "scale-100"}`}
            style={{ transitionDelay: `${index * 100}ms` }}
          >
            <div
              className={`p-6 rounded-xl ${step.bgColor} border ${
                step.borderColor
              } h-full transition-all duration-300 ${
                isActive ? "shadow-lg shadow-blue-900/20" : ""
              }`}
            >
              {/* Step number */}
              <div className="w-10 h-10 rounded-full bg-gray-900 border-2 border-gray-700 flex items-center justify-center mb-6 mx-auto">
                <span
                  className={`font-bold ${
                    isActive ? step.color : "text-gray-400"
                  }`}
                >
                  {index + 1}
                </span>
              </div>

              {/* Step icon */}
              <div
                className={`w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center ${step.bgColor} ${step.borderColor} border`}
              >
                <StepIcon size={32} className={step.color} />
              </div>

              {/* Step content */}
              <h3 className="text-xl font-bold text-white text-center mb-4">
                {step.title}
              </h3>
              <p className="text-gray-300 text-center">
                {step.description}
              </p>
            </div>

            {/* Connection arrow */}
            {index < 2 && (
              <div className="hidden md:block absolute top-1/3 -right-4 z-20">
                <ArrowRight size={24} className="text-gray-600" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const ProcessVisualization = ({ 
  activeStep, 
  setActiveStep, 
  isVisible 
}: { 
  activeStep: number; 
  setActiveStep: (step: number | ((prev: number) => number)) => void; 
  isVisible?: boolean; 
}) => {
  const technologies: TechItem[] = [
    { name: "React", icon: Layout, score: 98 },
    { name: "TypeScript", icon: Code, score: 95 },
    { name: "Next.js", icon: Server, score: 92 },
    { name: "Tailwind CSS", icon: Layout, score: 90 },
    { name: "PostgreSQL", icon: Database, score: 87 },
    { name: "JWT Auth", icon: Shield, score: 94 },
  ];

  return (
    <div
      className={`bg-gray-900/70 backdrop-blur-sm border border-gray-800 rounded-xl p-8 transition-all duration-1000 ${
        isVisible
          ? "opacity-100 transform translate-y-0"
          : "opacity-0 transform translate-y-16"
      }`}
    >
      {/* Visualization header */}
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-medium text-white">
          Interactive Demonstration
        </h3>
        <div className="flex space-x-2">
          {[0, 1, 2].map((index) => (
            <button
              key={index}
              className={`w-3 h-3 rounded-full transition-all ${
                activeStep === index
                  ? "bg-blue-500 scale-125"
                  : "bg-gray-700"
              }`}
              onClick={() => setActiveStep(index)}
              aria-label={`Step ${index + 1}`}
            ></button>
          ))}
        </div>
      </div>

      {/* Step content visualization */}
      <div className="flex flex-col md:flex-row">
        {/* Left panel: Input */}
        <div className="flex-1 p-4">
          {activeStep === 0 && (
            <RequirementsInput />
          )}

          {activeStep === 1 && (
            <TechnologyAnalysis technologies={technologies} />
          )}

          {activeStep === 2 && (
            <GenerationComplete />
          )}
        </div>

        {/* Right panel: Output visualization */}
        <div className="flex-1 md:ml-8 mt-6 md:mt-0">
          <OutputPanel activeStep={activeStep} />
        </div>
      </div>

      {/* Controls */}
      <div className="mt-8 flex justify-center">
        <button
          className={`px-6 py-3 rounded-lg text-white font-medium transition-all ${
            activeStep === 2
              ? "bg-green-600 hover:bg-green-700"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
          onClick={() =>
            setActiveStep((prev) => (prev < 2 ? prev + 1 : 0))
          }
        >
          {activeStep === 2 ? "Start Again" : "Next Step"}
        </button>
      </div>
    </div>
  );
};

const RequirementsInput = () => (
  <div className="bg-gray-950 rounded-lg p-4 border border-gray-800 font-mono text-xs text-gray-300">
    <div className="text-blue-400 mb-2">
      // Developer Requirements
    </div>
    <pre className="whitespace-pre-wrap">{`{
  "applicationTypes": ["web", "api"],
  "features": [
    "authentication",
    "database",
    "routing",
    "state management"
  ],
  "preferences": {
    "typescript": true,
    "testing": "jest",
    "styling": "tailwind",
    "deployment": "containerized"
  },
  "priorities": {
    "security": "high",
    "performance": "medium",
    "scalability": "high"
  }
}`}</pre>
  </div>
);

const TechnologyAnalysis = ({ technologies }: { technologies: TechItem[] }) => (
  <div className="bg-gray-950 rounded-lg p-4 border border-gray-800">
    <div className="text-purple-400 mb-4 font-mono text-xs">
      // Technology Graph Analysis
    </div>
    <div className="flex flex-wrap gap-4">
      {technologies.map((tech, i) => {
        const TechIcon = tech.icon;
        return (
          <div
            key={i}
            className="bg-gray-900 rounded p-3 flex items-center border border-gray-800"
          >
            <TechIcon
              size={18}
              className="text-purple-400 mr-2"
            />
            <span className="text-gray-300 text-sm">
              {tech.name}
            </span>
            <span className="ml-2 text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded">
              {tech.score}%
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

const GenerationComplete = () => {
  const completedItems = [
    "Project structure generated",
    "Dependencies configured",
    "Authentication system implemented",
    "Database connections configured",
    "Example components created",
    "Testing framework setup",
    "Documentation generated",
  ];

  return (
    <div className="bg-gray-950 rounded-lg p-4 border border-gray-800">
      <div className="text-green-400 mb-4 font-mono text-xs">
        // Generation Complete
      </div>
      <div className="space-y-2">
        {completedItems.map((item, i) => (
          <div
            key={i}
            className="flex items-center text-gray-300"
          >
            <CheckCircle
              size={16}
              className="text-green-400 mr-2 flex-shrink-0"
            />
            <span className="text-sm">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const OutputPanel = ({ activeStep }: { activeStep: number }) => (
  <div
    className={`bg-gray-950 rounded-lg border overflow-hidden transition-all duration-500 ${
      activeStep === 2 ? "border-green-900/50" : "border-gray-800"
    }`}
  >
    <div className="bg-gray-900 px-4 py-2 flex items-center justify-between">
      <div className="text-gray-300 font-medium flex items-center">
        <Code
          size={18}
          className={`mr-2 ${
            activeStep === 0
              ? "text-blue-400"
              : activeStep === 1
              ? "text-purple-400"
              : "text-green-400"
          }`}
        />
        Project Preview
      </div>
      <div
        className={`text-xs px-2 py-1 rounded ${
          activeStep === 0
            ? "bg-blue-900/50 text-blue-300"
            : activeStep === 1
            ? "bg-purple-900/50 text-purple-300"
            : "bg-green-900/50 text-green-300"
        }`}
      >
        {activeStep === 0
          ? "Analyzing"
          : activeStep === 1
          ? "Selecting"
          : "Complete"}
      </div>
    </div>

    <div className="p-4 min-h-56">
      {/* Dynamic content based on step */}
      {activeStep === 0 && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="inline-block p-3 rounded-full bg-blue-900/30 mb-4">
              <Search
                size={32}
                className="text-blue-400 animate-pulse"
              />
            </div>
            <div className="text-gray-400">
              Analyzing requirements...
            </div>
          </div>
        </div>
      )}

      {activeStep === 1 && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="inline-block p-3 rounded-full bg-purple-900/30 mb-4">
              <Cpu
                size={32}
                className="text-purple-400 animate-pulse"
              />
            </div>
            <div className="text-gray-400">
              Selecting optimal technologies...
            </div>
          </div>
        </div>
      )}

      {activeStep === 2 && (
        <div className="font-mono text-xs text-gray-400 space-y-2">
          <div className="flex items-center text-green-400">
            <CheckCircle size={12} className="mr-2" />
            <span>Project ready! Generated in 15 seconds.</span>
          </div>
          <div className="ml-4 space-y-1">
            <div>/my-project</div>
            <div className="ml-4">├── package.json</div>
            <div className="ml-4">├── tsconfig.json</div>
            <div className="ml-4">├── next.config.js</div>
            <div className="ml-4">├── tailwind.config.js</div>
            <div className="ml-4">├── /src</div>
            <div className="ml-8">├── /components</div>
            <div className="ml-8">├── /pages</div>
            <div className="ml-8">├── /services</div>
            <div className="ml-8">├── /hooks</div>
            <div className="ml-8">├── /utils</div>
            <div className="ml-8">└── /types</div>
            <div className="ml-4">├── /public</div>
            <div className="ml-4">├── /tests</div>
            <div className="ml-4">└── README.md</div>
          </div>
        </div>
      )}
    </div>
  </div>
); 