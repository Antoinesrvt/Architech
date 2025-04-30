import { ReactNode } from 'react';
import { SectionProps } from './types';

export interface SectionWrapperProps extends SectionProps {
  className?: string;
  children: ReactNode;
  id?: string;
  heading?: {
    title: string;
    titleClasses?: string;
    subtitle?: string;
  };
}

export const SectionWrapper = ({
  sectionRef,
  isVisible,
  className = '',
  children,
  id,
  heading
}: SectionWrapperProps) => {
  return (
    <section
      ref={sectionRef}
      id={id}
      className={className}
    >
      <div className="max-w-6xl mx-auto px-4">
        {heading && (
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              {heading.titleClasses ? (
                <span className={heading.titleClasses}>
                  {heading.title}
                </span>
              ) : (
                heading.title
              )}
            </h2>
            {heading.subtitle && (
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                {heading.subtitle}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}; 