import { Clock, Zap, X, Check, Code, FileCode, Folder, FolderOpen, ChevronRight, ArrowRight, ArrowLeft } from 'lucide-react';
import { SectionProps } from './types';
import { useState } from 'react';

// New function to calculate total savings and ROI with The Architect
const calculateSavings = (hoursPerProject: number, projectsPerYear: number, hourlyRate: number) => {
  const traditionalCost = hoursPerProject * projectsPerYear * hourlyRate;
  const architectCost = 15 * projectsPerYear * (hourlyRate / 60); // 15 minutes per project
  const savings = traditionalCost - architectCost;
  const roi = (savings / architectCost) * 100;
  
  return {
    traditionalCost: Math.round(traditionalCost),
    architectCost: Math.round(architectCost),
    savings: Math.round(savings),
    roi: Math.round(roi)
  };
};

// New ROI Calculator component that replaces the PainCalculator
const ROICalculator = ({ isVisible }: { isVisible?: boolean }) => {
  const [projectsPerYear, setProjectsPerYear] = useState(4);
  const [hoursPerProject, setHoursPerProject] = useState(30);
  const [hourlyRate, setHourlyRate] = useState(85);
  const [showDetailed, setShowDetailed] = useState(false);
  
  const { traditionalCost, architectCost, savings, roi } = calculateSavings(
    hoursPerProject, 
    projectsPerYear, 
    hourlyRate
  );
  
  const totalHours = projectsPerYear * hoursPerProject;
  const daysLost = Math.round(totalHours / 8);
  
  return (
    <div 
      className={`mt-16 p-8 rounded-xl bg-gradient-to-br from-gray-900/80 via-gray-900/80 to-purple-900/10 border border-purple-900/30 transform transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
    >
      <h3 className="text-xl font-bold text-white mb-6 flex items-center">
        <span className="w-10 h-10 rounded-full bg-purple-900/50 text-purple-300 flex items-center justify-center mr-3">
          <Clock size={20} />
        </span>
        Return on Investment Calculator
      </h3>
      
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          {/* Inputs */}
          <div className="space-y-6">
            <div>
              <label className="block text-purple-300 mb-2 font-medium flex justify-between">
                <span>Number of new projects per year: {projectsPerYear}</span>
                <span className="text-gray-400 text-sm">(1-12)</span>
              </label>
              <input 
                type="range" 
                min="1" 
                max="12"
                value={projectsPerYear}
                onChange={(e) => setProjectsPerYear(parseInt(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none bg-gray-700 outline-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1</span>
                <span>4</span>
                <span>8</span>
                <span>12</span>
              </div>
            </div>
            
            <div>
              <label className="block text-purple-300 mb-2 font-medium flex justify-between">
                <span>Hours per project setup: {hoursPerProject}</span>
                <span className="text-gray-400 text-sm">(10-60)</span>
              </label>
              <input 
                type="range" 
                min="10" 
                max="60"
                value={hoursPerProject}
                onChange={(e) => setHoursPerProject(parseInt(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none bg-gray-700 outline-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>10</span>
                <span>30</span>
                <span>45</span>
                <span>60</span>
              </div>
            </div>
            
            <div>
              <label className="block text-purple-300 mb-2 font-medium flex justify-between">
                <span>Developer hourly rate: ${hourlyRate}</span>
                <span className="text-gray-400 text-sm">(50-200)</span>
              </label>
              <input 
                type="range" 
                min="50" 
                max="200"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(parseInt(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none bg-gray-700 outline-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>$50</span>
                <span>$100</span>
                <span>$150</span>
                <span>$200</span>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          {/* Results */}
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 p-6">
            <div className="text-center">
              <div className="text-sm text-gray-400 uppercase tracking-wide mb-1">Annual Savings</div>
              <div className="text-4xl font-bold text-green-400 mb-1">${savings.toLocaleString()}</div>
              <div className="text-sm text-gray-400 mb-4">with The Architect</div>
              
              <div className="h-2 bg-gray-800 rounded-full mb-6 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full"
                  style={{ width: `${Math.min(100, roi / 10)}%` }}
                ></div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-center mb-4">
                <div>
                  <div className="text-lg font-bold text-white">{daysLost}</div>
                  <div className="text-xs text-gray-400">Work days saved</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-white">{roi}%</div>
                  <div className="text-xs text-gray-400">Return on investment</div>
                </div>
              </div>
              
              <button
                onClick={() => setShowDetailed(!showDetailed)}
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors underline"
              >
                {showDetailed ? 'Hide' : 'Show'} detailed breakdown
              </button>
              
              {showDetailed && (
                <div className="mt-4 text-left text-sm space-y-2 pt-4 border-t border-gray-800">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Traditional approach cost:</span>
                    <span className="text-white">${traditionalCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">The Architect cost:</span>
                    <span className="text-white">${architectCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-gray-300">Total savings:</span>
                    <span className="text-green-400">${savings.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <button
              className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-purple-700 to-blue-700 hover:from-purple-600 hover:to-blue-600 text-white font-medium transition-all"
            >
              <span>Get your personalized ROI report</span>
              <ChevronRight size={16} className="ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add this new component just before the ComparisonColumns component

const ComparisonSlider = ({ isVisible }: { isVisible?: boolean }) => {
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  
  // Handle drag events for slider
  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      const container = e.currentTarget.getBoundingClientRect();
      const newPosition = ((e.clientX - container.left) / container.width) * 100;
      setPosition(Math.max(0, Math.min(100, newPosition)));
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    const container = e.currentTarget.getBoundingClientRect();
    const newPosition = ((touch.clientX - container.left) / container.width) * 100;
    setPosition(Math.max(0, Math.min(100, newPosition)));
  };
  
  return (
    <div 
      className={`mt-16 px-4 transition-all duration-1000 ${
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
    >
      <h3 className="text-xl font-bold text-white mb-6 text-center">
        Compare Traditional Development vs. The Architect
      </h3>
      
      <div 
        className="relative w-full h-[400px] rounded-xl overflow-hidden border border-gray-800 select-none cursor-ew-resize"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        onTouchMove={handleTouchMove}
      >
        {/* Traditional (Before) side */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-red-900/20 to-gray-900"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center mb-4">
              <Clock className="text-red-400 mr-2" size={20} />
              <h4 className="text-lg font-medium text-white">Traditional Development</h4>
              <div className="ml-auto px-3 py-1 rounded-full bg-red-900/50 text-red-400 text-sm font-medium">
                3 Weeks
              </div>
            </div>
            
            <div className="flex-1 flex flex-col space-y-4">
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex-1">
                <div className="text-sm text-gray-300">
                  <div className="mb-2 text-red-400 font-medium">Manual Technology Research</div>
                  <p>Spend days researching technology options and compatibility.</p>
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex-1">
                <div className="text-sm text-gray-300">
                  <div className="mb-2 text-red-400 font-medium">Project Setup</div>
                  <p>Configure build tools, linters, and project structure.</p>
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex-1">
                <div className="text-sm text-gray-300">
                  <div className="mb-2 text-red-400 font-medium">Boilerplate Code</div>
                  <p>Write repetitive code patterns and configure tooling.</p>
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex-1">
                <div className="text-sm text-gray-300">
                  <div className="mb-2 text-red-400 font-medium">Testing & CI Setup</div>
                  <p>Manually configure testing frameworks and CI/CD pipelines.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Architect (After) side */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-gray-900"
          style={{ clipPath: `inset(0 0 0 ${position}%)` }}
        >
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center mb-4">
              <Zap className="text-blue-400 mr-2" size={20} />
              <h4 className="text-lg font-medium text-white">With The Architect</h4>
              <div className="ml-auto px-3 py-1 rounded-full bg-blue-900/50 text-blue-400 text-sm font-medium">
                15 Minutes
              </div>
            </div>
            
            <div className="flex-1 flex flex-col space-y-4">
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex-1">
                <div className="text-sm text-gray-300">
                  <div className="mb-2 text-blue-400 font-medium">Smart Recommendations</div>
                  <p>AI-powered technology selection based on your requirements.</p>
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex-1">
                <div className="text-sm text-gray-300">
                  <div className="mb-2 text-blue-400 font-medium">Instant Setup</div>
                  <p>Complete project structure generated in minutes.</p>
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex-1">
                <div className="text-sm text-gray-300">
                  <div className="mb-2 text-blue-400 font-medium">Production-Ready</div>
                  <p>Best practices and patterns built in from the start.</p>
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex-1">
                <div className="text-sm text-gray-300">
                  <div className="mb-2 text-blue-400 font-medium">Complete Solution</div>
                  <p>Testing, CI/CD, and documentation included automatically.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Slider control */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-10 transform -translate-x-1/2"
          style={{ left: `${position}%` }}
        >
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
            <div className="flex">
              <ArrowLeft size={12} className="text-gray-700" />
              <ArrowRight size={12} className="text-gray-700" />
            </div>
          </div>
        </div>
        
        {/* Before label */}
        <div 
          className="absolute top-6 left-6 bg-red-900/70 text-white text-sm font-medium px-3 py-1 rounded-full z-[5]"
          style={{ opacity: position > 80 ? 0 : 1 }}
        >
          Before
        </div>
        
        {/* After label */}
        <div 
          className="absolute top-6 right-6 bg-blue-900/70 text-white text-sm font-medium px-3 py-1 rounded-full z-[5]"
          style={{ opacity: position < 20 ? 0 : 1 }}
        >
          After
        </div>
      </div>
      
      <div className="text-center mt-4 text-gray-400 text-sm">
        Drag the slider to compare traditional development with The Architect
      </div>
    </div>
  );
};

// Now modify the Problem component to include the ComparisonSlider
export const Problem = ({ sectionRef, isVisible }: SectionProps) => {
  const [activeTab, setActiveTab] = useState<'before' | 'after'>('before');
  const [showAdvancedComparison, setShowAdvancedComparison] = useState(false);

  return (
    <section
      ref={sectionRef}
      className="py-24 bg-gradient-to-b from-gray-950 to-gray-900"
    >
      <div className="max-w-6xl mx-auto px-4">
        {/* Section heading */}
        <SectionHeading />

        {/* Interactive comparison toggle */}
        <div className="mb-10 flex justify-center">
          <div className="inline-flex bg-gray-900/50 p-1 rounded-lg border border-gray-800">
            <button
              onClick={() => setShowAdvancedComparison(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !showAdvancedComparison
                  ? 'bg-purple-800/30 text-purple-300'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Side-by-Side
            </button>
            <button
              onClick={() => setShowAdvancedComparison(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showAdvancedComparison
                  ? 'bg-purple-800/30 text-purple-300'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Interactive Slider
            </button>
          </div>
        </div>

        {/* Conditional display of comparison components */}
        {showAdvancedComparison ? (
          // New interactive slider comparison
          <ComparisonSlider isVisible={isVisible} />
        ) : (
          <>
            {/* Tab selector for mobile */}
            <div className="mb-10 flex md:hidden">
              <button
                onClick={() => setActiveTab('before')}
                className={`flex-1 py-3 text-center font-medium rounded-l-lg transition-colors ${
                  activeTab === 'before' 
                    ? 'bg-red-900/30 text-red-300 border-t border-l border-b border-red-800' 
                    : 'bg-gray-800/30 text-gray-400 border-t border-l border-b border-gray-800'
                }`}
              >
                Traditional
              </button>
              <button
                onClick={() => setActiveTab('after')}
                className={`flex-1 py-3 text-center font-medium rounded-r-lg transition-colors ${
                  activeTab === 'after' 
                    ? 'bg-blue-900/30 text-blue-300 border-t border-r border-b border-blue-800' 
                    : 'bg-gray-800/30 text-gray-400 border-t border-r border-b border-gray-800'
                }`}
              >
                With Architect
              </button>
            </div>

            {/* Before/After comparison - visible on mobile based on active tab */}
            <div className="block md:hidden">
              {activeTab === 'before' && <TraditionalDevelopment isVisible={isVisible} />}
              {activeTab === 'after' && <WithArchitect isVisible={isVisible} />}
            </div>

            {/* Before/After comparison - always visible on desktop */}
            <div className="hidden md:block">
              <ComparisonColumns isVisible={isVisible} />
            </div>
          </>
        )}

        {/* Stats comparison */}
        <StatsComparison isVisible={isVisible} />

        {/* ROI calculator */}
        <ROICalculator isVisible={isVisible} />
      </div>
    </section>
  );
};

const SectionHeading = () => (
  <div className="text-center mb-16">
    <div className="inline-flex items-center px-4 py-1 rounded-full text-xs font-medium bg-purple-800/30 text-purple-300 mb-6 backdrop-blur-sm border border-purple-800/40">
      INDUSTRY INSIGHT
    </div>
    <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
        The Developer Time Paradox
      </span>
    </h2>
    <p className="text-xl text-gray-300 max-w-3xl mx-auto">
      <span className="text-purple-400 font-semibold">47%</span> of
      development time is spent on repetitive setup and configuration
      rather than building unique value.
    </p>
    <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-gray-400">
      <div className="flex items-center">
        <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
        <span>McKinsey Developer Productivity Report 2023</span>
      </div>
      <div className="flex items-center">
        <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
        <span>StackOverflow Developer Survey 2024</span>
      </div>
      <div className="flex items-center">
        <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
        <span>State of DevOps Report</span>
      </div>
    </div>
  </div>
);

const ComparisonColumns = ({ isVisible }: { isVisible?: boolean }) => (
  <div className="grid md:grid-cols-2 gap-8 relative">
    {/* Connection line between columns */}
    <div className="hidden md:block absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-4">
      <div className="h-0.5 w-full bg-gradient-to-r from-red-400 to-blue-400 relative">
        <ArrowRight className="absolute -top-3 -right-5 text-blue-400" size={20} />
        <ArrowLeft className="absolute -top-3 -left-5 text-red-400" size={20} />
      </div>
    </div>

    {/* BEFORE column */}
    <TraditionalDevelopment isVisible={isVisible} />

    {/* AFTER column */}
    <WithArchitect isVisible={isVisible} />
  </div>
);

const TraditionalDevelopment = ({ isVisible }: { isVisible?: boolean }) => {
  const painPoints = [
    "Manual technology selection and compatibility checking",
    "Repetitive boilerplate code for every project",
    "Configuration errors and debugging",
    "Inconsistent architecture between projects",
    "Documentation gaps for future maintainers",
  ];

  return (
    <div
      className={`p-6 rounded-xl bg-gradient-to-br from-red-900/20 to-gray-900 border border-red-900/50 transition-all duration-1000 ${
        isVisible ? "opacity-100" : "opacity-50"
      }`}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center">
          <Clock className="mr-2 text-red-400" size={24} />
          Traditional Development
        </h3>
        <div className="px-3 py-1 rounded-full bg-red-900/50 text-red-400 text-sm font-medium">
          Weeks 1-3
        </div>
      </div>

      {/* Code editor mockup */}
      <div className="bg-gray-950 rounded-lg overflow-hidden border border-gray-800 mb-6">
        {/* Tabs */}
        <div className="flex items-center bg-gray-900 px-4 py-2 overflow-x-auto">
          {[
            "package.json",
            "webpack.config.js",
            "tsconfig.json",
            ".eslintrc",
            "docker-compose.yml",
          ].map((file, i) => (
            <div
              key={i}
              className={`px-3 py-1 rounded-t-lg mr-2 text-sm whitespace-nowrap ${
                i === 0 ? "bg-gray-800 text-white" : "text-gray-400"
              }`}
            >
              {file}
            </div>
          ))}
        </div>

        {/* Code content */}
        <div className="p-4 font-mono text-sm text-gray-300 max-h-64 overflow-y-auto">
          <pre className="text-xs">{`{
  "name": "project-setup",
  "version": "0.1.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.9.0",
    "axios": "^1.3.4",
    "styled-components": "^5.3.9",
    // dozens more dependencies...
  },
  "devDependencies": {
    "@types/react": "^18.0.28",
    "@types/react-dom": "^18.0.11",
    "typescript": "^5.0.2",
    "webpack": "^5.76.3",
    "webpack-cli": "^5.0.1",
    "webpack-dev-server": "^4.13.1",
    "babel-loader": "^9.1.2",
    "@babel/core": "^7.21.3",
    "@babel/preset-env": "^7.20.2",
    "@babel/preset-react": "^7.18.6",
    "@babel/preset-typescript": "^7.21.0",
    "eslint": "^8.36.0",
    // dozens more dev dependencies...
  },
  "scripts": {
    "start": "webpack-dev-server --mode development",
    "build": "webpack --mode production",
    "test": "jest",
    "lint": "eslint src/**/*.{ts,tsx}"
  }
}`}</pre>
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <div className="w-6 h-6 rounded-full bg-red-900 text-red-200 flex items-center justify-center text-xs mr-2">
            1
          </div>
          <div className="text-gray-200 font-medium">
            Days 1-5: Dependencies & Configuration
          </div>
        </div>
        <div className="flex items-center mb-2">
          <div className="w-6 h-6 rounded-full bg-red-900 text-red-200 flex items-center justify-center text-xs mr-2">
            2
          </div>
          <div className="text-gray-200 font-medium">
            Days 6-12: Project Structure Setup
          </div>
        </div>
        <div className="flex items-center">
          <div className="w-6 h-6 rounded-full bg-red-900 text-red-200 flex items-center justify-center text-xs mr-2">
            3
          </div>
          <div className="text-gray-200 font-medium">
            Days 13-21: Boilerplate Implementation
          </div>
        </div>
      </div>

      {/* Pain points */}
      <div className="space-y-3">
        {painPoints.map((point, i) => (
          <div key={i} className="flex items-center text-gray-300">
            <X size={16} className="text-red-400 mr-2 flex-shrink-0" />
            <span className="text-sm">{point}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const WithArchitect = ({ isVisible }: { isVisible?: boolean }) => {
  const benefits = [
    "Intelligent technology selection based on requirements",
    "Production-ready project structure generated instantly",
    "Best practices and patterns built in automatically",
    "Complete with documentation and testing setup",
    "CI/CD pipelines configured and ready to go",
  ];

  return (
    <div
      className={`p-6 rounded-xl bg-gradient-to-br from-blue-900/20 to-gray-900 border border-blue-900/50 transition-all duration-1000 ${
        isVisible
          ? "opacity-100 transform translate-y-0"
          : "opacity-50 transform translate-y-8"
      }`}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center">
          <Zap className="mr-2 text-blue-400" size={24} />
          With The Architect
        </h3>
        <div className="px-3 py-1 rounded-full bg-blue-900/50 text-blue-400 text-sm font-medium">
          15 Minutes
        </div>
      </div>

      {/* Architect interface mockup */}
      <div className="bg-gray-950 rounded-lg overflow-hidden border border-gray-800 mb-6">
        {/* Interface header */}
        <div className="bg-gray-900 px-4 py-3 flex items-center justify-between">
          <div className="text-white font-medium flex items-center">
            <Code className="mr-2 text-blue-400" size={18} />
            Project Generator
          </div>
          <div className="text-blue-400 text-sm">Ready to deploy</div>
        </div>

        {/* Project structure visualization */}
        <div className="p-4 font-mono text-sm text-gray-300 max-h-64 overflow-y-auto">
          <div className="flex items-center text-blue-400 mb-2">
            <FolderOpen size={16} className="mr-2" />
            <span className="font-medium">my-project/</span>
          </div>
          <div className="ml-6 mb-1 flex items-center">
            <FileCode size={14} className="mr-2 text-purple-400" />
            <span>package.json</span>
          </div>
          <div className="ml-6 mb-1 flex items-center">
            <FileCode size={14} className="mr-2 text-purple-400" />
            <span>tsconfig.json</span>
          </div>
          <div className="ml-6 mb-1 flex items-center">
            <Folder size={14} className="mr-2" />
            <span>src/</span>
          </div>
          <div className="ml-12 mb-1 flex items-center">
            <Folder size={14} className="mr-2" />
            <span>components/</span>
          </div>
          <div className="ml-12 mb-1 flex items-center">
            <Folder size={14} className="mr-2" />
            <span>hooks/</span>
          </div>
          <div className="ml-12 mb-1 flex items-center">
            <Folder size={14} className="mr-2" />
            <span>pages/</span>
          </div>
          <div className="ml-12 mb-1 flex items-center">
            <Folder size={14} className="mr-2" />
            <span>api/</span>
          </div>
          <div className="ml-12 mb-1 flex items-center">
            <Folder size={14} className="mr-2" />
            <span>utils/</span>
          </div>
          <div className="ml-6 mb-1 flex items-center">
            <Folder size={14} className="mr-2" />
            <span>public/</span>
          </div>
          <div className="ml-6 mb-1 flex items-center">
            <FileCode size={14} className="mr-2 text-green-400" />
            <span>README.md</span>
          </div>
          <div className="ml-6 mb-1 flex items-center">
            <Folder size={14} className="mr-2" />
            <span>tests/</span>
          </div>
          <div className="ml-6 mb-1 flex items-center">
            <FileCode size={14} className="mr-2 text-yellow-400" />
            <span>.github/workflows/ci.yml</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <div className="w-6 h-6 rounded-full bg-blue-900 text-blue-200 flex items-center justify-center text-xs mr-2">
            1
          </div>
          <div className="text-gray-200 font-medium">
            Minutes 1-5: Answer requirement questions
          </div>
        </div>
        <div className="flex items-center mb-2">
          <div className="w-6 h-6 rounded-full bg-blue-900 text-blue-200 flex items-center justify-center text-xs mr-2">
            2
          </div>
          <div className="text-gray-200 font-medium">
            Minutes 6-10: Review tech recommendations
          </div>
        </div>
        <div className="flex items-center">
          <div className="w-6 h-6 rounded-full bg-blue-900 text-blue-200 flex items-center justify-center text-xs mr-2">
            3
          </div>
          <div className="text-gray-200 font-medium">
            Minutes 11-15: Generate & download complete foundation
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="space-y-3">
        {benefits.map((point, i) => (
          <div key={i} className="flex items-center text-gray-300">
            <Check
              size={16}
              className="text-blue-400 mr-2 flex-shrink-0"
            />
            <span className="text-sm">{point}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const StatsComparison = ({ isVisible }: { isVisible?: boolean }) => {
  const stats = [
    {
      value: "47%",
      description: "Development time spent on configuration",
      color: "text-red-400",
      delay: "",
      source: "McKinsey, 2023",
    },
    {
      value: "30+",
      description: "Hours saved per project foundation",
      color: "text-blue-400",
      delay: "delay-100",
      source: "Internal testing",
    },
    {
      value: "78%",
      description: "Developers who cite setup as most frustrating task",
      color: "text-purple-400",
      delay: "delay-200",
      source: "StackOverflow, 2024",
    },
  ];

  return (
    <div className="mt-16 grid md:grid-cols-3 gap-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`p-6 rounded-xl bg-gray-800/50 border border-gray-700 text-center transform transition-all duration-500 ${stat.delay} ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-6"
          }`}
        >
          <div className={`text-4xl font-bold ${stat.color} mb-2`}>{stat.value}</div>
          <div className="text-gray-300 mb-2">
            {stat.description}
          </div>
          <div className="text-xs text-gray-500">Source: {stat.source}</div>
        </div>
      ))}
    </div>
  );
}; 