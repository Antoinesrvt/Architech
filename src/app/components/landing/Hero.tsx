import { ChevronDown, Clock, Code, PlayCircle, Shield } from "lucide-react";
import { useState } from "react";
import type { SectionProps } from "./types";
import VideoDemo from "./videodemo";

export const Hero = ({ sectionRef, scrollToSection }: SectionProps) => {
  const [showDemo, setShowDemo] = useState(false);

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
            <div className="w-full h-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15)_0,rgba(99,102,241,0)_50%)]" />
          </div>
        </div>
      </div>

      {/* Content container */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center">
        {/* Pre-heading badge */}
        <div className="inline-flex items-center px-4 py-1 rounded-full text-xs font-medium bg-indigo-800/50 text-indigo-200 mb-8 backdrop-blur-sm">
          <span className="animate-pulse mr-2 h-2 w-2 rounded-full bg-purple-400" />
          Developer Preview Coming Soon
        </div>

        {/* Main heading with animated gradient text */}
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-4">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
            From Weeks To <span className="text-white">Minutes</span>
          </span>
        </h1>

        {/* Subheading */}
        <p className="mt-6 text-lg sm:text-xl md:text-2xl text-gray-300 max-w-3xl">
          The Architect generates production-ready foundations in 15 minutes,
          eliminating <span className="text-white font-medium">30+ hours</span>{" "}
          of configuration work. Build what matters—unique features, not
          boilerplate.
        </p>

        {/* Video demo mockup */}
        {/* <VideoDemo setShowDemo={setShowDemo} /> */}

        {/* CTA section */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 sm:items-center">
          <button
            type="button"
            onClick={() => { scrollToSection("access"); }}
            className="px-6 py-3 bg-gradient-to-r from-purple-700 to-indigo-700 rounded-lg text-white font-medium shadow-lg shadow-purple-900/20 transition-all duration-300 transform hover:translate-y-[-2px] hover:shadow-xl hover:shadow-purple-900/30 hover:from-purple-600 hover:to-indigo-600 active:translate-y-0 active:shadow-md"
          >
            Get Early Access
          </button>
          <button
            type="button"
            onClick={() => { scrollToSection("howItWorks"); }}
            className="px-6 py-3 bg-gray-800/80 rounded-lg text-white font-medium transition-all duration-300 group relative overflow-hidden"
          >
            <span className="relative z-10">See How It Works</span>
            <span className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
          </button>
        </div>

        {/* Social proof */}
        <div className="mt-12 text-gray-400 flex flex-col items-center mb-8">
          <div className="flex items-center">
            <div className="flex -space-x-2 mr-3">
              {Array.from({ length: 5 }, (_, i) => (
                <div
                  key={`user-avatar-${i + 1}`}
                  className={`w-8 h-8 rounded-full bg-gradient-to-br border-2 border-gray-800 ${
                    i % 2 === 0
                      ? "from-blue-500 to-purple-600"
                      : "from-purple-600 to-pink-500"
                  }`}
                  aria-hidden="true"
                />
              ))}
            </div>
            <span>
              <span className="font-semibold text-white">342+</span> developers
              already waiting
            </span>
          </div>
          {/* <div className="mt-4 px-6 py-2 bg-gray-900/40 backdrop-blur-sm rounded-full border border-gray-800">
            <span className="text-sm">
              <span className="text-green-400">★★★★★</span> Rated <span className="font-semibold text-white">4.9/5</span> by beta testers
            </span>
          </div> */}
        </div>
      </div>

      {/* Feature highlights */}
      <FeatureHighlights />

      {/* Mouse scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="w-8 h-12 rounded-full border-2 border-gray-500 flex justify-center py-2">
          <div className="w-1 h-3 bg-gray-400 rounded-full animate-bounce" />
        </div>
      </div>

      {/* Demo modal */}
      {showDemo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => { setShowDemo(false); }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setShowDemo(false);
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-title"
          tabIndex={-1}
        >
          <div
            className="w-full max-w-4xl aspect-video bg-black relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute -top-10 right-0 text-white hover:text-purple-400 transition-colors"
              onClick={() => { setShowDemo(false); }}
              aria-label="Close demo preview"
            >
              Close preview
            </button>
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-white text-center max-w-lg">
                <div className="mb-4 flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-purple-900/30 flex items-center justify-center border border-purple-500/50">
                    <Code
                      size={30}
                      className="text-purple-400"
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <h3 id="demo-title" className="text-xl font-medium mb-2">
                  The Architect in Action
                </h3>
                <p className="text-gray-400 mb-6">
                  In this demo, you&apos;ll see how The Architect turns a simple
                  project description into a complete, production-ready
                  application foundation in under a minute.
                </p>
                <div className="w-full h-12 bg-gray-800 rounded-lg overflow-hidden mb-4 relative">
                  <div className="absolute inset-0 flex items-center px-4">
                    <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                      <div className="w-2/3 h-full bg-gradient-to-r from-blue-500 to-purple-500" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-center">
                  <button
                    type="button"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-md transition-colors"
                    onClick={() => { scrollToSection("access"); }}
                  >
                    Get notified when full demo is released
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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
        {features.map((feature) => {
          const FeatureIcon = feature.icon;
          return (
            <div
              key={feature.title}
              className="bg-gray-900/40 backdrop-blur-sm p-4 rounded-lg border border-gray-800 flex items-center transform hover:translate-y-[-2px] hover:bg-gray-900/60 hover:border-gray-700 transition-all duration-300"
            >
              <FeatureIcon
                size={24}
                className="text-blue-400 mr-3 flex-shrink-0"
                aria-hidden="true"
              />
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
