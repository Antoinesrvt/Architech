import { Clock, Shield, Zap, Layers, Code, CheckCircle, FileCode, Terminal, GitBranch, ArrowRight } from 'lucide-react';
import { Benefit, SectionProps } from './types';
import { SectionWrapper } from './SectionWrapper';
import { useState } from 'react';

export const Benefits = ({ sectionRef, isVisible, scrollToSection }: SectionProps) => {
  const [activeTab, setActiveTab] = useState<number>(0);

  const benefits: Benefit[] = [
    {
      title: "Hours Back In Your Day",
      description:
        "Eliminate weeks of repetitive setup time. What took 30+ hours now takes just minutes, giving you back time to focus on innovation.",
      icon: Clock,
      color: "text-blue-400",
      bgColor: "bg-blue-900/20",
      borderColor: "border-blue-900/50",
      stat: "97%",
      statLabel: "Time Savings",
      painPoint: "Configuration Time",
      beforeExample: "Manually researching and configuring tech stacks for days",
      afterExample: "Complete project foundation in 15 minutes",
      codeExample: {
        before: `// Typical workflow without The Architect
1. Research compatible tech stack options
2. Setup package.json with dozens of dependencies
3. Configure build tools and environments
4. Setup linting and formatting
5. Create project structure manually
6. Set up authentication flows
7. Configure database connections
8. Create CI/CD pipelines
// ...and 20+ more steps`,
        after: `// With The Architect
1. Describe your project requirements
2. Review tech recommendations
3. Generate complete foundation
4. Start building unique features immediately`
      }
    },
    {
      title: "Quality & Consistency",
      description:
        "Never worry about configuration errors or inconsistent architecture. Get built-in security, performance optimizations, and industry best practices automatically.",
      icon: Shield,
      color: "text-purple-400",
      bgColor: "bg-purple-900/20",
      borderColor: "border-purple-900/50",
      stat: "100%",
      statLabel: "Best Practices",
      painPoint: "Quality Concerns",
      beforeExample: "Inconsistent patterns, security vulnerabilities, technical debt",
      afterExample: "Production-ready architecture with built-in best practices",
      codeExample: {
        before: `// Inconsistent error handling
function fetchData() {
  try {
    // API call
  } catch (e) {
    console.error(e);
  }
}

// Security vulnerability
app.get('/api/user/:id', (req, res) => {
  const userId = req.params.id;
  // No validation, directly using params
  db.getUser(userId).then(user => res.json(user));
});`,
        after: `// Consistent error handling with proper logging
async function fetchData() {
  try {
    // API call with timeout and retry logic
  } catch (error) {
    logger.error('Failed to fetch data', { error, context });
    throw new ApiError('DATA_FETCH_FAILED', error.message);
  }
}

// Secure endpoint with validation and proper error handling
app.get('/api/user/:id', 
  validateRequest(userSchema),
  authMiddleware,
  rateLimit,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const user = await userService.getById(id);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }
);`
      }
    },
    {
      title: "Focus On Innovation",
      description:
        "Free yourself from repetitive boilerplate work. Build what matters - the unique features that make your product stand out.",
      icon: Zap,
      color: "text-pink-400",
      bgColor: "bg-pink-900/20",
      borderColor: "border-pink-900/50",
      stat: "5x",
      statLabel: "Faster Time to Market",
      painPoint: "Creative Bottlenecks",
      beforeExample: "Spending weeks on setup before building actual features",
      afterExample: "Start implementing core value on day one",
      codeExample: {
        before: `// Project timeline without The Architect
Week 1: Research technologies
Week 2: Configure project & tooling
Week 3: Setup basic structure
Week 4: Implement authentication
Week 5: Finally start on unique features
...`,
        after: `// Project timeline with The Architect
Day 1 (Morning): Generate project foundation
Day 1 (Afternoon): Start implementing unique features
Week 1: Core feature set nearly complete
Week 2: Ready for feedback and iteration
...`
      }
    },
    {
      title: "Modern & Adaptable",
      description:
        "Always use the latest tech stack and best practices. Your foundation evolves with the industry, preventing technical debt from day one.",
      icon: Layers,
      color: "text-green-400",
      bgColor: "bg-green-900/20",
      borderColor: "border-green-900/50",
      stat: "Zero",
      statLabel: "Technical Debt",
      painPoint: "Technology Evolution",
      beforeExample: "Projects quickly become outdated, requiring major rewrites",
      afterExample: "Always up-to-date with latest patterns and practices",
      codeExample: {
        before: `// Outdated patterns and hard to update
const UserComponent = React.createClass({
  getInitialState() {
    return { data: [] };
  },
  componentDidMount() {
    fetch('/api/data')
      .then(response => response.json())
      .then(data => this.setState({ data }));
  },
  render() {
    // Render logic
  }
});`,
        after: `// Modern React patterns with TypeScript
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

function UserComponent() {
  // Automatic data fetching with caching, retries, etc.
  const { data, isLoading, error } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: fetchUsers
  });
  
  // Component using modern patterns
  return (
    // JSX with modern patterns
  );
}`
      }
    },
  ];

  return (
    <SectionWrapper
      sectionRef={sectionRef}
      isVisible={isVisible}
      scrollToSection={scrollToSection}
      className="py-24 bg-gradient-to-b from-gray-950 to-gray-900"
      heading={{
        title: "Transformative Benefits",
        titleClasses: "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600",
        subtitle: "Real-world impact on your development workflow and productivity."
      }}
    >
      {/* Main benefit cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        {benefits.map((benefit, index) => {
          const BenefitIcon = benefit.icon;
          const isActive = activeTab === index;

          return (
            <div
              key={index}
              className={`p-6 rounded-xl ${benefit.bgColor} border ${
                benefit.borderColor
              } transition-all duration-500 transform cursor-pointer ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-12"
              } ${
                isActive ? "ring-2 ring-offset-2 ring-offset-gray-900 " + benefit.borderColor : ""
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
              aria-hidden={!isVisible}
              onClick={() => setActiveTab(index)}
            >
              {/* Pain point tag */}
              <div className="flex justify-between items-center mb-4">
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${benefit.bgColor} ${benefit.color}`}>
                  {benefit.painPoint}
                </div>
                {isActive && (
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${benefit.bgColor}`}>
                    <CheckCircle size={12} className={benefit.color} />
                  </div>
                )}
              </div>

              {/* Benefit icon */}
              <div
                className={`w-16 h-16 rounded-full mb-6 flex items-center justify-center ${benefit.bgColor} ${benefit.borderColor} border`}
                aria-hidden="true"
              >
                <BenefitIcon size={32} className={benefit.color} />
              </div>

              {/* Stat */}
              <div className={`text-4xl font-bold ${benefit.color} mb-2`}>
                {benefit.stat}
              </div>
              <div className="text-gray-400 text-sm mb-4">
                {benefit.statLabel}
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-white mb-4">
                {benefit.title}
              </h3>
              <p className="text-gray-300 mb-4">{benefit.description}</p>
              
              {/* Quick Before/After */}
              <div className="flex items-center text-sm text-gray-400 mt-4">
                <span className="line-through text-red-400">{benefit.beforeExample}</span>
                <ArrowRight size={14} className="mx-2 text-gray-600" />
                <span className="text-green-400">{benefit.afterExample}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed example section */}
      <div 
        className={`mt-16 bg-gray-900/70 backdrop-blur-sm rounded-xl border border-gray-800 overflow-hidden transition-all duration-1000 ${
          isVisible
            ? "opacity-100 transform translate-y-0"
            : "opacity-0 transform translate-y-16"
        }`}
      >
        <div className="border-b border-gray-800">
          <div className="flex overflow-x-auto">
            {benefits.map((benefit, index) => (
              <button
                key={index}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === index
                    ? `border-b-2 ${benefit.color} ${benefit.bgColor}`
                    : "text-gray-400 hover:text-gray-300"
                }`}
                onClick={() => setActiveTab(index)}
              >
                {benefit.title}
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-6">
          <div className="flex items-center mb-6">
            <div className={`w-10 h-10 rounded-full ${benefits[activeTab].bgColor} flex items-center justify-center mr-3`}>
              <Code size={20} className={benefits[activeTab].color} />
            </div>
            <h3 className="text-xl font-bold text-white">
              Real-World Example: {benefits[activeTab].title}
            </h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Before Example */}
            <div className="bg-gray-950 rounded-lg overflow-hidden border border-gray-800">
              <div className="bg-gray-900 px-4 py-2 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center">
                  <Terminal size={16} className="text-red-400 mr-2" />
                  <span className="text-gray-300 text-sm">Without The Architect</span>
                </div>
                <div className="px-2 py-1 rounded text-xs bg-red-900/30 text-red-400">Before</div>
              </div>
              <div className="p-4 font-mono text-sm text-gray-400 overflow-x-auto">
                <pre className="whitespace-pre-wrap">{benefits[activeTab].codeExample.before}</pre>
              </div>
            </div>
            
            {/* After Example */}
            <div className="bg-gray-950 rounded-lg overflow-hidden border border-gray-800">
              <div className="bg-gray-900 px-4 py-2 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center">
                  <GitBranch size={16} className="text-green-400 mr-2" />
                  <span className="text-gray-300 text-sm">With The Architect</span>
                </div>
                <div className="px-2 py-1 rounded text-xs bg-green-900/30 text-green-400">After</div>
              </div>
              <div className="p-4 font-mono text-sm text-gray-400 overflow-x-auto">
                <pre className="whitespace-pre-wrap">{benefits[activeTab].codeExample.after}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Testimonial quote */}
      <div
        className={`mt-16 p-8 rounded-xl bg-gradient-to-br from-purple-900/20 to-gray-900 border border-purple-900/40 transition-all duration-1000 ${
          isVisible
            ? "opacity-100 transform translate-y-0"
            : "opacity-0 transform translate-y-16"
        }`}
      >
        <div className="mx-auto max-w-4xl text-center">
          <svg className="w-10 h-10 mx-auto mb-4 text-purple-500 opacity-50" fill="currentColor" viewBox="0 0 32 32">
            <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
          </svg>
          <p className="text-2xl text-gray-300 leading-relaxed italic">
            "The Architect eliminated weeks of setup time for our team. Now we can focus on building what makes our product unique instead of spending time on repetitive configuration."
          </p>
          <div className="mt-6">
            <div className="text-white font-medium">Sarah Johnson</div>
            <div className="text-purple-400 text-sm">CTO at TechInnovate</div>
          </div>
        </div>
      </div>

      {/* Call to action */}
      <div
        className={`mt-24 text-center transition-all duration-1000 ${
          isVisible
            ? "opacity-100 transform translate-y-0"
            : "opacity-0 transform translate-y-16"
        }`}
      >
        <h3 className="text-2xl font-bold text-white mb-6">
          Experience these benefits for yourself
        </h3>
        
        <div className="inline-flex bg-gray-900/70 backdrop-blur-sm p-1 rounded-lg border border-gray-800 mb-6">
          <div className="px-4 py-2 rounded-lg bg-purple-900/30 text-purple-300 text-sm font-medium">
            Limited Early Access Spots
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={() => scrollToSection("access")}
            className="px-8 py-4 rounded-lg bg-gradient-to-r from-purple-700 to-blue-700 hover:from-purple-600 hover:to-blue-600 text-white font-medium transition-all shadow-lg shadow-purple-900/20"
            aria-label="Join the Early Access List"
          >
            Join the Early Access List
          </button>
        </div>
      </div>
    </SectionWrapper>
  );
}; 