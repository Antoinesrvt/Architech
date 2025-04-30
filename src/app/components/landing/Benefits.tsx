import { Clock, Shield, Zap, Layers } from 'lucide-react';
import { Benefit, SectionProps } from './types';

export const Benefits = ({ sectionRef, isVisible, scrollToSection }: SectionProps) => {
  const benefits: Benefit[] = [
    {
      title: "Time Reclaimed",
      description:
        "Save 30+ hours on every project foundation, eliminating weeks of configuration and setup.",
      icon: Clock,
      color: "text-blue-400",
      bgColor: "bg-blue-900/20",
      borderColor: "border-blue-900/50",
      stat: "30+",
      statLabel: "Hours Saved",
    },
    {
      title: "Quality Assured",
      description:
        "Best practices built in from the start with security, scalability, and maintainability by design.",
      icon: Shield,
      color: "text-purple-400",
      bgColor: "bg-purple-900/20",
      borderColor: "border-purple-900/50",
      stat: "100%",
      statLabel: "Best Practices",
    },
    {
      title: "Creative Freedom",
      description:
        "Focus completely on what makes your project unique instead of repetitive configuration.",
      icon: Zap,
      color: "text-pink-400",
      bgColor: "bg-pink-900/20",
      borderColor: "border-pink-900/50",
      stat: "47%",
      statLabel: "More Creative Time",
    },
    {
      title: "Continuous Learning",
      description:
        "Learn industry best practices through practical examples in generated code.",
      icon: Layers,
      color: "text-green-400",
      bgColor: "bg-green-900/20",
      borderColor: "border-green-900/50",
      stat: "∞",
      statLabel: "Growth Potential",
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="py-24 bg-gradient-to-b from-gray-950 to-gray-900"
    >
      <div className="max-w-6xl mx-auto px-4">
        {/* Section heading */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
              Core Benefits
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Transform your development process with these key advantages.
          </p>
        </div>

        {/* Benefits grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => {
            const BenefitIcon = benefit.icon;

            return (
              <div
                key={index}
                className={`p-6 rounded-xl ${benefit.bgColor} border ${
                  benefit.borderColor
                } transition-all duration-700 transform ${
                  isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-12"
                }`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                {/* Benefit icon */}
                <div
                  className={`w-16 h-16 rounded-full mb-6 flex items-center justify-center ${benefit.bgColor} ${benefit.borderColor} border`}
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
                <p className="text-gray-300">{benefit.description}</p>
              </div>
            );
          })}
        </div>

        {/* Testimonials (future) */}
        <div
          className={`mt-24 text-center transition-all duration-1000 ${
            isVisible
              ? "opacity-100 transform translate-y-0"
              : "opacity-0 transform translate-y-16"
          }`}
        >
          <h3 className="text-2xl font-bold text-white mb-8">
            Trusted by Developers
          </h3>

          <div className="mt-6">
            <button
              onClick={() => scrollToSection("access")}
              className="px-6 py-3 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-medium transition-all"
            >
              Join the Early Access List
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}; 