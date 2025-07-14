import type { LucideIcon } from "lucide-react";
import type { RefObject } from "react";

export type SectionRefs = {
  [key: string]: RefObject<HTMLElement | null>;
};

export type NavItem = {
  id: string;
  name: string;
};

export type FeatureHighlight = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export type ProcessStep = {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
};

export type Benefit = {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  stat: string;
  statLabel: string;
  painPoint: string;
  beforeExample: string;
  afterExample: string;
  codeExample: {
    before: string;
    after: string;
  };
};

export type TechItem = {
  name: string;
  icon: LucideIcon;
  score: number;
};

export type TechnicalComponent = {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
};

export type SectionProps = {
  sectionRef: RefObject<HTMLElement | null>;
  isVisible?: boolean;
  scrollToSection: (sectionId: string) => void;
};
