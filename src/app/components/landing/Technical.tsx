import { Code, Settings, Search, Database, Zap, Check } from 'lucide-react';
import { SectionProps, TechnicalComponent } from './types';
import { useState } from 'react';

// Framework logos/icons
const frameworks = [
  {
    id: 'react',
    name: 'React',
    icon: '/icons/react.svg',
    category: 'frontend',
    color: 'bg-blue-500'
  },
  {
    id: 'vue',
    name: 'Vue',
    icon: '/icons/vue.svg',
    category: 'frontend',
    color: 'bg-green-500'
  },
  {
    id: 'angular',
    name: 'Angular',
    icon: '/icons/angular.svg',
    category: 'frontend',
    color: 'bg-red-500'
  },
  {
    id: 'nextjs',
    name: 'Next.js',
    icon: '/icons/nextjs.svg',
    category: 'fullstack',
    color: 'bg-gray-800'
  },
  {
    id: 'nuxt',
    name: 'Nuxt',
    icon: '/icons/nuxt.svg',
    category: 'fullstack',
    color: 'bg-green-600'
  },
  {
    id: 'svelte',
    name: 'Svelte',
    icon: '/icons/svelte.svg',
    category: 'frontend',
    color: 'bg-orange-600'
  },
  {
    id: 'nest',
    name: 'NestJS',
    icon: '/icons/nestjs.svg',
    category: 'backend',
    color: 'bg-red-600'
  },
  {
    id: 'express',
    name: 'Express',
    icon: '/icons/express.svg',
    category: 'backend',
    color: 'bg-gray-600'
  },
  {
    id: 'fastify',
    name: 'Fastify',
    icon: '/icons/fastify.svg',
    category: 'backend',
    color: 'bg-black'
  },
  {
    id: 'django',
    name: 'Django',
    icon: '/icons/django.svg',
    category: 'backend',
    color: 'bg-green-800'
  },
  {
    id: 'flask',
    name: 'Flask',
    icon: '/icons/flask.svg',
    category: 'backend',
    color: 'bg-gray-700'
  },
  {
    id: 'laravel',
    name: 'Laravel',
    icon: '/icons/laravel.svg',
    category: 'backend',
    color: 'bg-red-700'
  },
  {
    id: 'rails',
    name: 'Rails',
    icon: '/icons/rails.svg',
    category: 'backend',
    color: 'bg-red-600'
  },
  {
    id: 'dotnet',
    name: '.NET',
    icon: '/icons/dotnet.svg',
    category: 'backend',
    color: 'bg-purple-700'
  },
  {
    id: 'spring',
    name: 'Spring',
    icon: '/icons/spring.svg',
    category: 'backend',
    color: 'bg-green-600'
  }
];

export const Technical = ({ sectionRef, isVisible }: SectionProps) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'frontend' | 'backend' | 'fullstack'>('all');
  
  // Filter frameworks based on active category
  const filteredFrameworks = activeCategory === 'all' 
    ? frameworks 
    : frameworks.filter(framework => framework.category === activeCategory);
  
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
              Technical Excellence
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            The Architect was built from the ground up to deliver optimized,
            production-ready code adhering to industry best practices.
          </p>
        </div>

        {/* Framework compatibility showcase */}
        <FrameworkShowcase 
          isVisible={isVisible} 
          frameworks={filteredFrameworks} 
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
        />
        
        {/* Key tech benefits */}
        <div className="mt-24 grid md:grid-cols-2 gap-8">
          <TechBenefit
            title="Pattern-Based Generation"
            description="Rather than simple templates, The Architect uses smart patterns that adjust to your specific requirements."
            delay={100}
            isVisible={isVisible}
          />
          <TechBenefit
            title="Optimized for Performance"
            description="Every project is configured with performance best practices for faster load times and better user experience."
            delay={200}
            isVisible={isVisible}
          />
          <TechBenefit
            title="Security by Default"
            description="All projects include security best practices to protect against common vulnerabilities."
            delay={300}
            isVisible={isVisible}
          />
          <TechBenefit
            title="Always Up-to-Date"
            description="The Architect stays current with the latest framework versions and best practices."
            delay={400}
            isVisible={isVisible}
          />
        </div>
      </div>
    </section>
  );
};

interface TechBenefitProps {
  title: string;
  description: string;
  delay: number;
  isVisible?: boolean;
}

const TechBenefit = ({ title, description, delay, isVisible }: TechBenefitProps) => (
  <div
    className={`bg-gray-800/30 rounded-xl p-6 border border-gray-700 transform transition-all duration-700 ${
      isVisible
        ? "opacity-100 translate-y-0"
        : "opacity-0 translate-y-10"
    } delay-${delay}`}
  >
    <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
    <p className="text-gray-300">{description}</p>
  </div>
);

interface FrameworkShowcaseProps {
  frameworks: typeof frameworks;
  activeCategory: 'all' | 'frontend' | 'backend' | 'fullstack';
  setActiveCategory: (category: 'all' | 'frontend' | 'backend' | 'fullstack') => void;
  isVisible?: boolean;
}

const FrameworkShowcase = ({ 
  frameworks, 
  activeCategory, 
  setActiveCategory,
  isVisible 
}: FrameworkShowcaseProps) => {
  const categories = [
    { id: 'all', name: 'All Frameworks' },
    { id: 'frontend', name: 'Frontend' },
    { id: 'backend', name: 'Backend' },
    { id: 'fullstack', name: 'Full Stack' }
  ];
  
  return (
    <div 
      className={`bg-gray-900/50 rounded-xl p-8 border border-gray-800 transition-all duration-1000 ${
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
    >
      <h3 className="text-2xl font-bold text-white mb-2">Framework Compatibility</h3>
      <p className="text-gray-400 mb-6">
        The Architect supports a wide range of frameworks and technologies, letting you use the tools you already know and love.
      </p>
      
      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeCategory === category.id
                ? 'bg-purple-700 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>
      
      {/* Framework grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {frameworks.map(framework => (
          <div 
            key={framework.id}
            className={`bg-gray-800 rounded-lg p-4 flex flex-col items-center justify-center border border-gray-700 hover:border-purple-500 transition-all hover:scale-105 group cursor-pointer h-32`}
          >
            <div className={`w-12 h-12 rounded-full ${framework.color} flex items-center justify-center mb-3`}>
              {/* Placeholder for framework icon */}
              <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">{framework.name.charAt(0)}</span>
              </div>
            </div>
            <div className="text-white font-medium text-center">{framework.name}</div>
            <div className="text-xs text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {framework.category === 'frontend' && 'UI Framework'}
              {framework.category === 'backend' && 'Backend Framework'}
              {framework.category === 'fullstack' && 'Full Stack Framework'}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 text-gray-400 text-sm text-center">
        Don't see your favorite technology? <button className="text-purple-400 hover:underline">Request it here</button>
      </div>
    </div>
  );
}; 