import {
  ArrowDown,
  ArrowRight,
  BrainCircuit,
  CheckCircle,
  Code,
  Cpu,
  Database,
  FileCode,
  FilePlus,
  Folder,
  GitBranch,
  Layout,
  Loader2,
  Monitor,
  PackageOpen,
  Search,
  Server,
  Shield,
  TerminalSquare,
  Workflow,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SectionWrapper } from "./SectionWrapper";
import { useStepAnimation } from "./hooks";
import { type ProcessStep, type SectionProps, TechItem } from "./types";

export const HowItWorks = ({
  sectionRef,
  isVisible,
  scrollToSection,
}: SectionProps) => {
  const { activeStep, setActiveStep } = useStepAnimation(isVisible || false);

  return (
    <SectionWrapper
      sectionRef={sectionRef}
      isVisible={isVisible}
      scrollToSection={scrollToSection}
      id="how-it-works"
      className="py-24 bg-gradient-to-b from-gray-900 to-gray-950"
      heading={{
        title: "How The Architect Works",
        titleClasses:
          "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600",
        subtitle:
          "A simple three-step process that transforms weeks of setup into minutes of productivity.",
      }}
    >
      {/* Process steps */}
      <ProcessSteps activeStep={activeStep} isVisible={isVisible} />

      {/* Interactive process visualization */}
      <WorkflowDemo
        activeStep={activeStep}
        setActiveStep={setActiveStep}
        isVisible={isVisible}
      />

      {/* Added: Output Preview */}
      <OutputPreview activeStep={activeStep} isVisible={isVisible} />

      {/* Added: Key Features */}
      <KeyFeatures isVisible={isVisible} />
    </SectionWrapper>
  );
};

const ProcessSteps = ({
  activeStep,
  isVisible,
}: {
  activeStep: number;
  isVisible?: boolean;
}) => {
  const steps: ProcessStep[] = [
    {
      title: "Describe Your Project",
      description:
        "Tell The Architect what you're building - specify your features, tech preferences, and priorities.",
      icon: BrainCircuit,
      color: "text-blue-400",
      bgColor: "bg-blue-900/20",
      borderColor: "border-blue-900/50",
    },
    {
      title: "Review Recommendations",
      description:
        "The Architect analyzes your needs and recommends the optimal tech stack with explanations.",
      icon: Cpu,
      color: "text-purple-400",
      bgColor: "bg-purple-900/20",
      borderColor: "border-purple-900/50",
    },
    {
      title: "Generate & Build",
      description:
        "Generate a complete, production-ready project foundation and start building your unique features.",
      icon: Zap,
      color: "text-green-400",
      bgColor: "bg-green-900/20",
      borderColor: "border-green-900/50",
    },
  ];

  return (
    <div className="grid md:grid-cols-3 gap-8 mb-16 relative">
      {/* Connection lines */}
      <div
        className="hidden md:block absolute top-16 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 z-0"
        aria-hidden="true"
      ></div>

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
            aria-hidden={!isVisible}
          >
            <div
              className={`p-6 rounded-xl ${step.bgColor} border ${
                step.borderColor
              } h-full transition-all duration-300 ${
                isActive ? "shadow-lg shadow-blue-900/20" : ""
              }`}
              role="region"
              aria-label={`Step ${index + 1}: ${step.title}`}
              tabIndex={isActive ? 0 : -1}
            >
              {/* Step number */}
              <div
                className="w-10 h-10 rounded-full bg-gray-900 border-2 border-gray-700 flex items-center justify-center mb-6 mx-auto"
                aria-hidden="true"
              >
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
                aria-hidden="true"
              >
                <StepIcon size={32} className={step.color} />
              </div>

              {/* Step content */}
              <h3 className="text-xl font-bold text-white text-center mb-4">
                {step.title}
              </h3>
              <p className="text-gray-300 text-center">{step.description}</p>
            </div>

            {/* Connection arrow */}
            {index < 2 && (
              <div
                className="hidden md:block absolute top-1/3 -right-4 z-20"
                aria-hidden="true"
              >
                <ArrowRight size={24} className="text-gray-600" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// New improved workflow demo
const WorkflowDemo = ({
  activeStep,
  setActiveStep,
  isVisible,
}: {
  activeStep: number;
  setActiveStep: (step: number | ((prev: number) => number)) => void;
  isVisible?: boolean;
}) => {
  const [typedText, setTypedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const typewriterRef = useRef<NodeJS.Timeout | null>(null);

  // Typewriter texts for each step
  const typewriterTexts = [
    "I need a modern e-commerce platform with user authentication, product catalog, shopping cart, checkout, and payment integration. I prefer React and Node.js.",
    "Based on your requirements, here are my recommendations:",
    "Generating project foundation with recommended technologies...",
  ];

  // Reset and start typing animation when step changes
  useEffect(() => {
    setTypedText("");
    setIsTyping(true);

    if (typewriterRef.current) {
      clearInterval(typewriterRef.current);
    }

    let charIndex = 0;
    typewriterRef.current = setInterval(() => {
      if (charIndex < typewriterTexts[activeStep].length) {
        setTypedText(typewriterTexts[activeStep].substring(0, charIndex + 1));
        charIndex++;
      } else {
        setIsTyping(false);
        if (typewriterRef.current) {
          clearInterval(typewriterRef.current);
        }
      }
    }, 30);

    return () => {
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current);
      }
    };
  }, [activeStep, typewriterTexts]);

  return (
    <div
      className={`relative bg-gradient-to-b from-gray-900 to-gray-950 shadow-xl border border-gray-800 rounded-xl overflow-hidden mb-16 transition-all duration-1000 ${
        isVisible
          ? "opacity-100 transform translate-y-0"
          : "opacity-0 transform translate-y-16"
      }`}
      aria-hidden={!isVisible}
    >
      {/* Blurred gradient decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-blue-900/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-purple-900/20 rounded-full blur-3xl"></div>
      </div>

      {/* Browser chrome */}
      <div className="relative z-10">
        <div className="bg-gray-900 px-4 py-3 flex items-center border-b border-gray-800">
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <div className="mx-auto px-4 py-1 bg-gray-800 rounded-md text-gray-400 text-sm max-w-md">
            app.thearchitect.dev
          </div>
        </div>

        {/* Content area */}
        <div className="p-8">
          <div className="grid md:grid-cols-5 gap-6">
            {/* Step indicators */}
            <div className="md:col-span-1">
              <div className="space-y-4">
                {[0, 1, 2].map((step) => (
                  <button
                    key={step}
                    onClick={() => setActiveStep(step)}
                    className={`w-full flex items-center p-3 rounded-lg transition-all ${
                      activeStep === step
                        ? "bg-blue-900/30 border border-blue-800"
                        : "bg-gray-900/50 border border-gray-800 hover:bg-gray-800/50"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                        activeStep === step
                          ? "bg-blue-600"
                          : activeStep > step
                            ? "bg-green-600"
                            : "bg-gray-700"
                      }`}
                    >
                      {activeStep > step ? (
                        <CheckCircle size={16} className="text-white" />
                      ) : (
                        <span className="text-white text-sm font-medium">
                          {step + 1}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-sm ${
                        activeStep === step
                          ? "text-blue-300 font-medium"
                          : "text-gray-400"
                      }`}
                    >
                      {step === 0
                        ? "Requirements"
                        : step === 1
                          ? "Tech Stack"
                          : "Generate"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Main content area */}
            <div className="md:col-span-4 bg-gray-950 border border-gray-800 rounded-lg p-6 min-h-[400px] relative">
              {/* Dynamic content based on step */}
              <div className="h-full">
                {activeStep === 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center mr-3">
                        <BrainCircuit size={18} className="text-white" />
                      </div>
                      <h3 className="text-white font-medium">
                        Describe Your Project
                      </h3>
                    </div>

                    <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                      <p className="text-gray-300 text-sm">
                        {typedText}
                        {isTyping && (
                          <span className="inline-block w-2 h-4 bg-blue-400 ml-1 animate-blink"></span>
                        )}
                      </p>
                    </div>

                    <div className="pt-2">
                      <div className="text-xs text-gray-500">
                        Suggested Requirements:
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {[
                          "Authentication",
                          "Database",
                          "API Integration",
                          "Responsive UI",
                          "Performance",
                        ].map((tag, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-gray-800 text-gray-400 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeStep === 1 && (
                  <div className="space-y-4">
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center mr-3">
                        <Cpu size={18} className="text-white" />
                      </div>
                      <h3 className="text-white font-medium">
                        Recommended Technology Stack
                      </h3>
                    </div>

                    <div className="p-4 bg-gray-900 rounded-lg border border-gray-800 mb-4">
                      <p className="text-gray-300 text-sm mb-2">
                        {typedText}
                        {isTyping && (
                          <span className="inline-block w-2 h-4 bg-purple-400 ml-1 animate-blink"></span>
                        )}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        {
                          name: "Next.js",
                          icon: Layout,
                          score: 98,
                          reason: "Best for SEO and performance",
                        },
                        {
                          name: "TypeScript",
                          icon: Code,
                          score: 95,
                          reason: "Type safety for complex e-commerce",
                        },
                        {
                          name: "Stripe",
                          icon: Server,
                          score: 97,
                          reason: "Secure payment processing",
                        },
                        {
                          name: "PostgreSQL",
                          icon: Database,
                          score: 92,
                          reason: "Relational data for products",
                        },
                        {
                          name: "NextAuth.js",
                          icon: Shield,
                          score: 94,
                          reason: "Authentication with social login",
                        },
                        {
                          name: "TailwindCSS",
                          icon: Layout,
                          score: 96,
                          reason: "Rapid UI development",
                        },
                      ].map((tech, i) => {
                        const TechIcon = tech.icon;
                        return (
                          <div
                            key={i}
                            className="flex items-start p-3 bg-gray-900/50 rounded-lg border border-gray-800"
                          >
                            <div className="w-8 h-8 rounded-full bg-purple-900/50 flex items-center justify-center mr-3 flex-shrink-0">
                              <TechIcon size={16} className="text-purple-400" />
                            </div>
                            <div>
                              <div className="flex items-center">
                                <span className="text-white text-sm font-medium">
                                  {tech.name}
                                </span>
                                <span className="ml-2 text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded">
                                  {tech.score}%
                                </span>
                              </div>
                              <p className="text-gray-400 text-xs mt-1">
                                {tech.reason}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeStep === 2 && (
                  <div className="space-y-4">
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center mr-3">
                        <Zap size={18} className="text-white" />
                      </div>
                      <h3 className="text-white font-medium">
                        Generating Project Foundation
                      </h3>
                    </div>

                    <div className="p-4 bg-gray-900 rounded-lg border border-gray-800 mb-4">
                      <p className="text-gray-300 text-sm">
                        {typedText}
                        {isTyping && (
                          <span className="inline-block w-2 h-4 bg-green-400 ml-1 animate-blink"></span>
                        )}
                      </p>
                    </div>

                    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                      <div className="bg-gray-950 px-3 py-2 border-b border-gray-800">
                        <div className="flex items-center">
                          <TerminalSquare
                            size={14}
                            className="text-gray-400 mr-2"
                          />
                          <span className="text-gray-400 text-xs">
                            Terminal
                          </span>
                        </div>
                      </div>
                      <div className="p-3 font-mono text-xs">
                        <div className="text-green-400">
                          $ generating project structure...
                        </div>
                        {isTyping ? (
                          <div className="flex items-center text-gray-400 mt-1">
                            <span className="mr-2 animate-spin">
                              <Loader2 size={12} />
                            </span>
                            Building foundation...
                          </div>
                        ) : (
                          <>
                            <div className="text-gray-400 mt-1">
                              <span className="text-blue-400">→</span> Setup
                              Next.js with TypeScript...{" "}
                              <span className="text-green-400">✓</span>
                            </div>
                            <div className="text-gray-400 mt-1">
                              <span className="text-blue-400">→</span> Configure
                              TailwindCSS...{" "}
                              <span className="text-green-400">✓</span>
                            </div>
                            <div className="text-gray-400 mt-1">
                              <span className="text-blue-400">→</span> Add
                              NextAuth.js authentication...{" "}
                              <span className="text-green-400">✓</span>
                            </div>
                            <div className="text-gray-400 mt-1">
                              <span className="text-blue-400">→</span> Setup
                              Stripe payment integration...{" "}
                              <span className="text-green-400">✓</span>
                            </div>
                            <div className="text-gray-400 mt-1">
                              <span className="text-blue-400">→</span> Configure
                              PostgreSQL with Prisma...{" "}
                              <span className="text-green-400">✓</span>
                            </div>
                            <div className="text-gray-400 mt-1">
                              <span className="text-blue-400">→</span> Generate
                              product models...{" "}
                              <span className="text-green-400">✓</span>
                            </div>
                            <div className="text-gray-400 mt-1">
                              <span className="text-blue-400">→</span> Add cart
                              functionality...{" "}
                              <span className="text-green-400">✓</span>
                            </div>
                            <div className="text-green-400 mt-2">
                              ✨ Done in 15.4s
                            </div>
                            <div className="text-gray-500 mt-2">
                              Ready to use! Your project has been generated and
                              is ready for development.
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Next button */}
              <div className="mt-6 flex justify-end">
                <button
                  className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-all flex items-center ${
                    isTyping
                      ? "bg-gray-700 cursor-not-allowed"
                      : activeStep === 2
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-blue-600 hover:bg-blue-700"
                  }`}
                  onClick={() =>
                    !isTyping &&
                    setActiveStep((prev) => (prev < 2 ? prev + 1 : 0))
                  }
                  disabled={isTyping}
                >
                  {activeStep === 2 ? "Start Again" : "Continue"}
                  {activeStep < 2 && <ArrowRight size={16} className="ml-1" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// New component to show the output preview
const OutputPreview = ({
  activeStep,
  isVisible,
}: { activeStep: number; isVisible?: boolean }) => {
  return (
    <div
      className={`bg-gradient-to-br from-gray-900/80 to-gray-950 border border-gray-800 rounded-xl mb-16 overflow-hidden shadow-lg transition-all duration-1000 ${
        isVisible
          ? "opacity-100 transform translate-y-0"
          : "opacity-0 transform translate-y-16"
      }`}
    >
      <div className="p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <span className="w-10 h-10 rounded-full bg-blue-900/50 text-blue-300 flex items-center justify-center mr-3">
            <Code size={20} />
          </span>
          What You'll Get
        </h3>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="bg-gray-950 border border-gray-800 rounded-lg overflow-hidden mb-4">
              <div className="bg-gray-900 px-4 py-2 border-b border-gray-800">
                <div className="flex items-center">
                  <FilePlus size={16} className="text-blue-400 mr-2" />
                  <span className="text-gray-300 text-sm">
                    Project Structure
                  </span>
                </div>
              </div>
              <div className="p-4 font-mono text-xs text-gray-400">
                <div className="space-y-1">
                  <div className="flex items-center">
                    <PackageOpen size={14} className="text-yellow-500 mr-2" />
                    <span>my-ecommerce/</span>
                  </div>
                  <div className="ml-4 flex items-center">
                    <FileCode size={14} className="text-blue-400 mr-2" />
                    <span>package.json</span>
                  </div>
                  <div className="ml-4 flex items-center">
                    <FileCode size={14} className="text-blue-400 mr-2" />
                    <span>tsconfig.json</span>
                  </div>
                  <div className="ml-4 flex items-center">
                    <FileCode size={14} className="text-gray-400 mr-2" />
                    <span>next.config.js</span>
                  </div>
                  <div className="ml-4 flex items-center">
                    <Folder size={14} className="text-orange-400 mr-2" />
                    <span>src/</span>
                  </div>
                  <div className="ml-8 flex items-center">
                    <Folder size={14} className="text-orange-400 mr-2" />
                    <span>app/</span>
                  </div>
                  <div className="ml-8 flex items-center">
                    <Folder size={14} className="text-orange-400 mr-2" />
                    <span>components/</span>
                  </div>
                  <div className="ml-8 flex items-center">
                    <Folder size={14} className="text-orange-400 mr-2" />
                    <span>lib/</span>
                  </div>
                  <div className="ml-4 flex items-center">
                    <FileCode size={14} className="text-purple-400 mr-2" />
                    <span>prisma/schema.prisma</span>
                  </div>
                  <div className="ml-4 flex items-center">
                    <Folder size={14} className="text-orange-400 mr-2" />
                    <span>public/</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-950 border border-gray-800 rounded-lg overflow-hidden">
              <div className="bg-gray-900 px-4 py-2 border-b border-gray-800">
                <div className="flex items-center">
                  <GitBranch size={16} className="text-blue-400 mr-2" />
                  <span className="text-gray-300 text-sm">
                    CI/CD Configuration
                  </span>
                </div>
              </div>
              <div className="p-4 font-mono text-xs text-gray-400">
                <div className="space-y-1">
                  <div className="flex items-center">
                    <Folder size={14} className="text-blue-400 mr-2" />
                    <span>.github/</span>
                  </div>
                  <div className="ml-4 flex items-center">
                    <Folder size={14} className="text-blue-400 mr-2" />
                    <span>workflows/</span>
                  </div>
                  <div className="ml-8 flex items-center">
                    <FileCode size={14} className="text-green-400 mr-2" />
                    <span>ci.yml</span>
                  </div>
                  <div className="ml-8 flex items-center">
                    <FileCode size={14} className="text-green-400 mr-2" />
                    <span>deployment.yml</span>
                  </div>
                  <div className="text-gray-600 mt-2">
                    # CI/CD pipeline configured for:
                  </div>
                  <div className="text-gray-600">- Automated testing</div>
                  <div className="text-gray-600">- Code quality checks</div>
                  <div className="text-gray-600">- Preview deployments</div>
                  <div className="text-gray-600">- Production releases</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="bg-gray-950 border border-gray-800 rounded-lg overflow-hidden mb-4">
              <div className="bg-gray-900 px-4 py-2 border-b border-gray-800">
                <div className="flex items-center">
                  <Monitor size={16} className="text-blue-400 mr-2" />
                  <span className="text-gray-300 text-sm">Live Preview</span>
                </div>
              </div>
              <div className="p-4 h-[220px] bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center">
                <div className="text-center">
                  <div className="bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Layout size={28} className="text-blue-400" />
                  </div>
                  <div className="text-white text-sm font-medium mb-1">
                    Ready-to-use UI Components
                  </div>
                  <div className="text-gray-400 text-xs max-w-xs mx-auto">
                    Complete with authentication flows, product listings, cart
                    functionality and checkout process
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-950 border border-gray-800 rounded-lg overflow-hidden">
              <div className="bg-gray-900 px-4 py-2 border-b border-gray-800">
                <div className="flex items-center">
                  <Server size={16} className="text-blue-400 mr-2" />
                  <span className="text-gray-300 text-sm">API Integration</span>
                </div>
              </div>
              <div className="p-4 font-mono text-xs">
                <div className="space-y-2 text-gray-400">
                  <div className="text-green-400">
                    // Authentication API routes
                  </div>
                  <div>import NextAuth from "next-auth/next";</div>
                  <div>
                    import {"{"} authOptions {"}"} from "@/lib/auth";
                  </div>
                  <div className="text-purple-400">
                    export default NextAuth(authOptions);
                  </div>

                  <div className="mt-3 text-green-400">
                    // Product API endpoints
                  </div>
                  <div>
                    import {"{"} db {"}"} from "@/lib/db";
                  </div>
                  <div className="text-blue-400">
                    export async function GET() {"{"}
                  </div>
                  <div className="ml-4">
                    const products = await db.product.findMany();
                  </div>
                  <div className="ml-4">
                    return Response.json({"{"} products {"}"});
                  </div>
                  <div>{"}"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// New component to display key features
const KeyFeatures = ({ isVisible }: { isVisible?: boolean }) => {
  const features = [
    {
      title: "Best Practices Built In",
      description:
        "Every project follows industry best practices for architecture, security, and performance.",
      icon: CheckCircle,
      color: "text-green-400",
      bgColor: "bg-green-900/20",
    },
    {
      title: "Fully Documented",
      description:
        "Comprehensive documentation generated automatically for your specific project setup.",
      icon: FileCode,
      color: "text-blue-400",
      bgColor: "bg-blue-900/20",
    },
    {
      title: "Testing Ready",
      description:
        "Testing frameworks configured with example tests to ensure quality from day one.",
      icon: Shield,
      color: "text-purple-400",
      bgColor: "bg-purple-900/20",
    },
    {
      title: "DevOps Integrated",
      description:
        "CI/CD pipelines, containerization, and deployment configurations included.",
      icon: Workflow,
      color: "text-orange-400",
      bgColor: "bg-orange-900/20",
    },
  ];

  return (
    <div className="mt-8">
      <h3 className="text-xl font-bold text-white mb-8 text-center">
        Everything You Need to Start Building
      </h3>

      <div className="grid md:grid-cols-4 gap-6">
        {features.map((feature, index) => {
          const Icon = feature.icon;

          return (
            <div
              key={index}
              className={`p-6 rounded-xl border border-gray-800 ${feature.bgColor} transition-all duration-700 ${
                isVisible
                  ? "opacity-100 transform translate-y-0"
                  : "opacity-0 transform translate-y-10"
              }`}
              style={{ transitionDelay: `${index * 100 + 300}ms` }}
            >
              <div
                className={`w-12 h-12 rounded-full ${feature.bgColor} flex items-center justify-center mb-4`}
              >
                <Icon size={24} className={feature.color} />
              </div>

              <h4 className="text-lg font-bold text-white mb-2">
                {feature.title}
              </h4>

              <p className="text-gray-400 text-sm">{feature.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
