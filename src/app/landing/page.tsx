"use client";

import { useEffect, useRef } from "react";
import {
  Benefits,
  EarlyAccess,
  Footer,
  Header,
  Hero,
  HowItWorks,
  Problem,
  type SectionRefs,
  Technical,
  Testimonials,
  testimonials,
  useScrollTo,
  useScrollVisibility,
} from "../components/landing";

// Custom hook for parallax effect
const useParallax = () => {
  useEffect(() => {
    // Function to handle parallax scroll effect
    const handleScroll = () => {
      const parallaxElements =
        document.querySelectorAll<HTMLElement>(".parallax");
      const scrollPosition = window.scrollY;

      for (const element of parallaxElements) {
        const speed = element.getAttribute("data-speed") ?? "0.1";
        const movement = scrollPosition * Number(speed);

        // Apply transform based on direction attribute
        const direction = element.getAttribute("data-direction") ?? "up";
        if (direction === "up") {
          element.style.transform = `translate3d(0, -${movement}px, 0)`;
        } else if (direction === "down") {
          element.style.transform = `translate3d(0, ${movement}px, 0)`;
        } else if (direction === "left") {
          element.style.transform = `translate3d(-${movement}px, 0, 0)`;
        } else if (direction === "right") {
          element.style.transform = `translate3d(${movement}px, 0, 0)`;
        }
      }
    };

    // Add scroll event listener
    window.addEventListener("scroll", handleScroll);

    // Clean up
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);
};

export default function LandingPage() {
  // Refs for scroll navigation
  const sectionRefs: SectionRefs = {
    hero: useRef<HTMLElement | null>(null),
    problem: useRef<HTMLElement | null>(null),
    howItWorks: useRef<HTMLElement | null>(null),
    benefits: useRef<HTMLElement | null>(null),
    technical: useRef<HTMLElement | null>(null),
    access: useRef<HTMLElement | null>(null),
  };

  // Get visibility and scroll states from custom hooks
  const {
    scrolled,
    activeSection,
    isHeroVisible,
    isProblemVisible,
    isHowItWorksVisible,
    isBenefitsVisible,
    isTechnicalVisible,
    isAccessVisible,
  } = useScrollVisibility(sectionRefs);

  // Get scroll function
  const scrollToSection = useScrollTo(sectionRefs);

  // Apply parallax effect
  useParallax();

  // Select different testimonials for different sections
  const technicalTestimonials = [testimonials[2], testimonials[5]];
  const benefitsTestimonials = [
    testimonials[0],
    testimonials[3],
    testimonials[4],
  ];

  // Calculate scroll progress for the indicator
  const scrollProgress =
    typeof scrolled === "number" ? Math.min(scrolled * 100, 100) : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white relative overflow-hidden">
      {/* Background decoration elements */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
        <div
          className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-purple-900/20 rounded-full blur-3xl parallax"
          data-speed="0.05"
          data-direction="up"
        />
        <div
          className="absolute top-1/4 right-1/3 w-[600px] h-[600px] bg-blue-900/20 rounded-full blur-3xl parallax"
          data-speed="0.07"
          data-direction="down"
        />
        <div
          className="absolute bottom-0 left-1/3 w-[900px] h-[900px] bg-indigo-900/20 rounded-full blur-3xl parallax"
          data-speed="0.03"
          data-direction="left"
        />
      </div>

      <div className="relative z-10">
        <Header
          scrolled={scrolled}
          activeSection={activeSection}
          scrollToSection={scrollToSection}
        />

        <Hero sectionRef={sectionRefs.hero} scrollToSection={scrollToSection} />

        <Problem
          sectionRef={sectionRefs.problem}
          isVisible={isProblemVisible}
          scrollToSection={scrollToSection}
        />

        {/* Testimonials after Problem section */}
        <div
          className={`py-16 bg-gray-950 relative transition-all duration-1000 ease-out ${isProblemVisible ? "opacity-100 transform translate-y-0" : "opacity-0 transform translate-y-10"}`}
        >
          <div className="max-w-6xl mx-auto px-4 relative z-10">
            <Testimonials
              title="Transforming Developer Productivity"
              subtitle="See what early adopters are saying about The Architect"
              testimonials={testimonials.slice(0, 3)}
              variant="dark"
            />
          </div>

          {/* Background parallax decoration */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className="absolute -right-20 -bottom-40 w-[500px] h-[500px] bg-purple-800/5 rounded-full blur-3xl parallax"
              data-speed="0.08"
              data-direction="right"
            />
          </div>
        </div>

        <HowItWorks
          sectionRef={sectionRefs.howItWorks}
          isVisible={isHowItWorksVisible}
          scrollToSection={scrollToSection}
        />

        <Benefits
          sectionRef={sectionRefs.benefits}
          isVisible={isBenefitsVisible}
          scrollToSection={scrollToSection}
        />

        {/* Testimonials after Benefits section, focused on productivity gains */}
        <div
          className={`py-16 bg-gradient-to-r from-gray-950 to-gray-900 relative transition-all duration-1000 ease-out ${isBenefitsVisible ? "opacity-100 transform translate-y-0" : "opacity-0 transform translate-y-10"}`}
        >
          <div className="max-w-5xl mx-auto px-4 relative z-10">
            <Testimonials testimonials={benefitsTestimonials} variant="light" />
          </div>

          {/* Background parallax decoration */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className="absolute -left-40 top-20 w-[600px] h-[600px] bg-blue-800/5 rounded-full blur-3xl parallax"
              data-speed="0.04"
              data-direction="up"
            />
          </div>
        </div>

        <Technical
          sectionRef={sectionRefs.technical}
          isVisible={isTechnicalVisible}
          scrollToSection={scrollToSection}
        />

        {/* Testimonials after Technical section, focused on technical excellence */}
        <div
          className={`py-16 bg-gradient-to-r from-gray-950 to-purple-950/20 relative transition-all duration-1000 ease-out ${isTechnicalVisible ? "opacity-100 transform translate-y-0" : "opacity-0 transform translate-y-10"}`}
        >
          <div className="max-w-5xl mx-auto px-4 relative z-10">
            <Testimonials
              testimonials={technicalTestimonials}
              variant="purple"
              compact={true}
            />
          </div>

          {/* Background parallax decoration */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className="absolute -right-20 bottom-0 w-[700px] h-[700px] bg-purple-800/5 rounded-full blur-3xl parallax"
              data-speed="0.05"
              data-direction="left"
            />
          </div>
        </div>

        <EarlyAccess
          sectionRef={sectionRefs.access}
          isVisible={isAccessVisible}
          scrollToSection={scrollToSection}
        />

        <Footer scrollToSection={scrollToSection} />
      </div>

      {/* Scroll progress indicator */}
      <div className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-gray-900/60 backdrop-blur-sm rounded-full border border-gray-800 flex items-center justify-center shadow-lg">
        <svg
          className="w-8 h-8"
          viewBox="0 0 36 36"
          aria-label="Scroll progress indicator"
        >
          <title>Scroll progress indicator</title>
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="#2D3748"
            strokeWidth="2"
          />
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="#8B5CF6"
            strokeWidth="2"
            strokeDasharray="100"
            strokeDashoffset={100 - scrollProgress}
            transform="rotate(-90 18 18)"
          />
        </svg>
      </div>
    </div>
  );
}
