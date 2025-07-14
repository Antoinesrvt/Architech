import type { LucideIcon } from "lucide-react";
import type { RefObject } from "react";

export type SectionRefs = Record<string, RefObject<HTMLElement | null>>;

export interface NavItem {
  id: string;
  name: string;
}

export interface FeatureHighlight {
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface ProcessStep {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
}

export interface Benefit {
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
}

export interface TechItem {
  name: string;
  icon: LucideIcon;
  score: number;
}

export interface TechnicalComponent {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

export interface SectionProps {
  sectionRef: RefObject<HTMLElement | null>;
  isVisible?: boolean;
  scrollToSection: (sectionId: string) => void;
}
