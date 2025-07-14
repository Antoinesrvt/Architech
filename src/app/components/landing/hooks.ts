import { RefObject, useEffect, useState } from "react";
import type { SectionRefs } from "./types";

export const useScrollVisibility = (sectionRefs: SectionRefs) => {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const [isHeroVisible, setIsHeroVisible] = useState(true);
  const [isProblemVisible, setIsProblemVisible] = useState(false);
  const [isHowItWorksVisible, setIsHowItWorksVisible] = useState(false);
  const [isBenefitsVisible, setIsBenefitsVisible] = useState(false);
  const [isAccessVisible, setIsAccessVisible] = useState(false);
  const [isTechnicalVisible, setIsTechnicalVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);

      const scrollPosition = window.scrollY + window.innerHeight / 2;

      for (const section in sectionRefs) {
        const element = sectionRefs[section].current;
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (
            scrollPosition >= offsetTop &&
            scrollPosition < offsetTop + offsetHeight
          ) {
            setActiveSection(section);

            setIsHeroVisible(section === "hero");
            setIsProblemVisible(section === "problem");
            setIsHowItWorksVisible(section === "howItWorks");
            setIsBenefitsVisible(section === "benefits");
            setIsTechnicalVisible(section === "technical");
            setIsAccessVisible(section === "access");
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [sectionRefs]);

  return {
    scrolled,
    activeSection,
    isHeroVisible,
    isProblemVisible,
    isHowItWorksVisible,
    isBenefitsVisible,
    isTechnicalVisible,
    isAccessVisible,
  };
};

export const useScrollTo = (
  sectionRefs: SectionRefs,
  closeMobileMenu?: () => void,
) => {
  const scrollToSection = (sectionId: string) => {
    if (closeMobileMenu) {
      closeMobileMenu();
    }

    const element = sectionRefs[sectionId].current;
    if (element) {
      const yOffset = -80;
      const y =
        element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return scrollToSection;
};

export const useStepAnimation = (isVisible: boolean) => {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setActiveStep((prev) => (prev < 2 ? prev + 1 : 0));
    }, 4000);

    return () => {
      clearInterval(interval);
    };
  }, [isVisible]);

  return { activeStep, setActiveStep };
};
