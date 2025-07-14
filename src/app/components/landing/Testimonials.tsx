import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { useState } from "react";

export interface Testimonial {
  id: number;
  name: string;
  role: string;
  company: string;
  image: string;
  quote: string;
}

interface TestimonialsProps {
  title?: string;
  subtitle?: string;
  testimonials: Testimonial[];
  variant?: "dark" | "light" | "purple";
  compact?: boolean;
}

export const Testimonials = ({
  title,
  subtitle,
  testimonials,
  variant = "dark",
  compact = false,
}: TestimonialsProps) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const activeTestimonial = testimonials[activeIndex] ?? testimonials[0];

  const nextTestimonial = () => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setActiveIndex(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length,
    );
  };

  const variantStyles = {
    dark: {
      wrapper: "bg-gray-900/60 border-gray-800",
      title: "text-white",
      subtitle: "text-gray-400",
      quoteBg: "bg-gray-800",
      quoteBorder: "border-gray-700",
      quote: "text-gray-300",
      name: "text-white",
      role: "text-gray-400",
      indicatorActive: "bg-purple-500",
      indicatorInactive: "bg-gray-700",
      navButton: "text-gray-500 hover:text-white",
    },
    light: {
      wrapper: "bg-white/5 border-gray-800/50",
      title: "text-white",
      subtitle: "text-gray-300",
      quoteBg: "bg-white/10",
      quoteBorder: "border-gray-700/50",
      quote: "text-gray-200",
      name: "text-white",
      role: "text-gray-300",
      indicatorActive: "bg-blue-500",
      indicatorInactive: "bg-gray-700/50",
      navButton: "text-gray-400 hover:text-white",
    },
    purple: {
      wrapper: "bg-purple-900/10 border-purple-900/30",
      title: "text-white",
      subtitle: "text-purple-200",
      quoteBg: "bg-purple-900/20",
      quoteBorder: "border-purple-800/30",
      quote: "text-gray-200",
      name: "text-white",
      role: "text-purple-200",
      indicatorActive: "bg-purple-500",
      indicatorInactive: "bg-purple-900/40",
      navButton: "text-purple-400 hover:text-purple-300",
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className={`rounded-xl border ${styles.wrapper} p-6 md:p-8`}>
      {(title ?? subtitle) && (
        <div className="text-center mb-8">
          {title && (
            <h3 className={`text-xl md:text-2xl font-bold ${styles.title}`}>
              {title}
            </h3>
          )}
          {subtitle && <p className={`mt-2 ${styles.subtitle}`}>{subtitle}</p>}
        </div>
      )}

      <div
        className={`${styles.quoteBg} rounded-xl p-6 md:p-8 border ${styles.quoteBorder} relative`}
      >
        {/* Quote icon */}
        <Quote
          size={24}
          className="absolute text-purple-400 opacity-30 -top-3 -left-3 transform rotate-180"
          aria-label="Quote icon"
        />

        {/* Testimonial content */}
        <div className="mb-6">
          <p className={`text-lg ${styles.quote} mb-6`}>
            &quot;{activeTestimonial.quote}&quot;
          </p>

          <div className="flex items-center">
            <div className="mr-4">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 p-0.5">
                <div className="w-full h-full rounded-full overflow-hidden bg-gray-800">
                  {activeTestimonial.image ? (
                    <img
                      src={activeTestimonial.image}
                      alt={activeTestimonial.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-medium">
                      {activeTestimonial.name.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div>
              <div className={`font-medium ${styles.name}`}>
                {activeTestimonial.name}
              </div>
              <div className={`text-sm ${styles.role}`}>
                {activeTestimonial.role}, {activeTestimonial.company}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation controls */}
        {!compact && testimonials.length > 1 && (
          <div className="flex justify-between items-center pt-4 border-t border-gray-800">
            <div className="flex space-x-1">
              {testimonials.map((testimonial, i) => (
                <button
                  key={`testimonial-btn-${testimonial.name}`}
                  type="button"
                  onClick={() => {
                    setActiveIndex(i);
                  }}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === activeIndex
                      ? styles.indicatorActive
                      : styles.indicatorInactive
                  }`}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={prevTestimonial}
                className={`p-2 rounded-full ${styles.navButton} transition-colors`}
                aria-label="Previous testimonial"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={nextTestimonial}
                className={`p-2 rounded-full ${styles.navButton} transition-colors`}
                aria-label="Next testimonial"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
