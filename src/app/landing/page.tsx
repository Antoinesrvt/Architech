"use client";

import { useRef } from "react";
import {
  Header,
  Hero,
  Problem,
  HowItWorks,
  Benefits,
  Technical,
  EarlyAccess,
  Footer,
  SectionRefs,
  useScrollVisibility,
  useScrollTo
} from "../components/landing";

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
    isAccessVisible
  } = useScrollVisibility(sectionRefs);

  // Get scroll function
  const scrollToSection = useScrollTo(sectionRefs);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header 
        scrolled={scrolled} 
        activeSection={activeSection} 
        scrollToSection={scrollToSection} 
      />
      
      <Hero 
        sectionRef={sectionRefs.hero} 
        scrollToSection={scrollToSection} 
      />
      
      <Problem 
        sectionRef={sectionRefs.problem} 
        isVisible={isProblemVisible} 
        scrollToSection={scrollToSection} 
      />
      
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
      
      <Technical 
        sectionRef={sectionRefs.technical} 
        isVisible={isTechnicalVisible} 
        scrollToSection={scrollToSection} 
      />
      
      <EarlyAccess 
        sectionRef={sectionRefs.access} 
        isVisible={isAccessVisible} 
        scrollToSection={scrollToSection} 
      />
      
      <Footer 
        scrollToSection={scrollToSection} 
      />
    </div>
  );
}
