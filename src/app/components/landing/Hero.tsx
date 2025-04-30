import { ChevronDown, Clock, Code, Shield } from 'lucide-react';
import { SectionProps } from './types';

export const Hero = ({ sectionRef, scrollToSection }: SectionProps) => {
  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex flex-col items-center justify-center pt-16 overflow-hidden"
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-black">
        {/* Abstract grid lines */}
        <div className="absolute inset-0 opacity-20">
          <div className="h-full w-full">
            <div className="w-full h-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15)_0,rgba(99,102,241,0)_50%)]"></div>
          </div>
        </div>
      </div>

      {/* Content container */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center">
        {/* Pre-heading badge */}
        <div className="inline-flex items-center px-4 py-1 rounded-full text-xs font-medium bg-indigo-800/50 text-indigo-200 mb-8 backdrop-blur-sm">
          <span className="animate-pulse mr-2 h-2 w-2 rounded-full bg-purple-400"></span>
          Developer Preview Coming Soon
        </div>

        {/* Main heading with animated gradient text */}
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-4">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
            Build Beyond Boilerplate
          </span>
        </h1>

        {/* Subheading */}
        <p className="mt-6 text-lg sm:text-xl md:text-2xl text-gray-300 max-w-3xl">
          The Architect generates production-ready foundations in minutes,
          eliminating weeks of configuration. Focus on what matters—creating
          features, not configuring infrastructure.
        </p>

        {/* CTA section */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => scrollToSection("access")}
            className="px-8 py-4 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-medium text-lg transition-all duration-300 flex items-center shadow-lg shadow-purple-900/40"
          >
            Get Early Access
          </button>
          <button
            onClick={() => scrollToSection("howItWorks")}
            className="flex items-center mt-4 sm:mt-0 text-gray-300 hover:text-white transition-colors"
          >
            <span>See how it works</span>
            <ChevronDown size={16} className="ml-1" />
          </button>
        </div>

        {/* Social proof */}
        <div className="mt-12 text-gray-400 flex items-center">
          <div className="flex -space-x-2 mr-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full bg-gradient-to-br border-2 border-gray-800 ${
                  i % 2 === 0
                    ? "from-blue-500 to-purple-600"
                    : "from-purple-600 to-pink-500"
                }`}
              ></div>
            ))}
          </div>
          <span>
            <span className="font-semibold text-white">342+</span> developers
            already waiting
          </span>
        </div>
      </div>

      {/* Feature highlights */}
      <FeatureHighlights />

      {/* Mouse scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="w-8 h-12 rounded-full border-2 border-gray-500 flex justify-center py-2">
          <div className="w-1 h-3 bg-gray-400 rounded-full animate-bounce"></div>
        </div>
      </div>
    </section>
  );
};

const FeatureHighlights = () => {
  const features = [
    {
      icon: Clock,
      title: "Save 30+ Hours",
      description: "Per project foundation",
    },
    {
      icon: Code,
      title: "Best Practices",
      description: "Built in by default",
    },
    {
      icon: Shield,
      title: "100% Yours",
      description: "No vendor lock-in",
    },
  ];

  return (
    <div className="absolute bottom-16 left-0 right-0">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 px-4">
        {features.map((feature, index) => {
          const FeatureIcon = feature.icon;
          return (
            <div key={index} className="bg-gray-900/40 backdrop-blur-sm p-4 rounded-lg border border-gray-800 flex items-center">
              <FeatureIcon size={24} className="text-blue-400 mr-3 flex-shrink-0" />
              <div>
                <div className="text-white font-medium">{feature.title}</div>
                <div className="text-gray-400 text-sm">
                  {feature.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}; 