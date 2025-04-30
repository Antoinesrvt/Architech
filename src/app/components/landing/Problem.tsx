import { Clock, Zap, X, Check, Code, FileCode, Folder, FolderOpen } from 'lucide-react';
import { SectionProps } from './types';

export const Problem = ({ sectionRef, isVisible }: SectionProps) => {
  return (
    <section
      ref={sectionRef}
      className="py-24 bg-gradient-to-b from-gray-950 to-gray-900"
    >
      <div className="max-w-6xl mx-auto px-4">
        {/* Section heading */}
        <SectionHeading />

        {/* Before/After comparison */}
        <ComparisonColumns isVisible={isVisible} />

        {/* Stats comparison */}
        <StatsComparison isVisible={isVisible} />
      </div>
    </section>
  );
};

const SectionHeading = () => (
  <div className="text-center mb-16">
    <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
        The Developer Time Paradox
      </span>
    </h2>
    <p className="text-xl text-gray-300 max-w-2xl mx-auto">
      <span className="text-purple-400 font-semibold">47%</span> of
      development time is spent on repetitive setup and configuration
      rather than building unique value.
    </p>
  </div>
);

const ComparisonColumns = ({ isVisible }: { isVisible?: boolean }) => (
  <div className="grid md:grid-cols-2 gap-8 relative">
    {/* Connection line between columns */}
    <div className="hidden md:block absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-4">
      <div className="h-0.5 w-full bg-gradient-to-r from-red-400 to-blue-400 relative">
        <div className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-blue-400"></div>
        <div className="absolute -top-1.5 -left-2 w-4 h-4 rounded-full bg-red-400"></div>
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
            <span>services/</span>
          </div>
          <div className="ml-12 mb-1 flex items-center">
            <Folder size={14} className="mr-2" />
            <span>utils/</span>
          </div>
          <div className="ml-6 mb-1 flex items-center">
            <Folder size={14} className="mr-2" />
            <span>public/</span>
          </div>
          <div className="ml-6 mb-1 flex items-center text-green-400">
            <FileCode size={14} className="mr-2" />
            <span>README.md (Documentation)</span>
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
            Minutes 1-5: Define Requirements
          </div>
        </div>
        <div className="flex items-center mb-2">
          <div className="w-6 h-6 rounded-full bg-blue-900 text-blue-200 flex items-center justify-center text-xs mr-2">
            2
          </div>
          <div className="text-gray-200 font-medium">
            Minutes 6-10: Review Recommendations
          </div>
        </div>
        <div className="flex items-center">
          <div className="w-6 h-6 rounded-full bg-blue-900 text-blue-200 flex items-center justify-center text-xs mr-2">
            3
          </div>
          <div className="text-gray-200 font-medium">
            Minutes 11-15: Generate Complete Project
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
    },
    {
      value: "30+",
      description: "Hours saved per project foundation",
      color: "text-blue-400",
      delay: "delay-100",
    },
    {
      value: "100%",
      description: "Focus on building unique features",
      color: "text-purple-400",
      delay: "delay-200",
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
          <div className="text-gray-300">
            {stat.description}
          </div>
        </div>
      ))}
    </div>
  );
}; 