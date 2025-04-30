import { Github, Twitter, Mail, ClipboardCheck, Zap, Rocket } from 'lucide-react';
import { SectionProps } from './types';
import { useState } from 'react';
import { Testimonials } from './Testimonials';
import { testimonials } from './testimonialData';

export const EarlyAccess = ({ sectionRef, isVisible }: SectionProps) => {
  const [submissionState, setSubmissionState] = useState<'idle' | 'submitting' | 'success'>('idle');
  
  // Simulate form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionState('submitting');
    
    // Simulate API call delay
    setTimeout(() => {
      setSubmissionState('success');
    }, 1500);
  };
  
  // Select testimonials for this section
  const featuredTestimonials = [testimonials[1], testimonials[4], testimonials[5]];
  
  return (
    <section
      ref={sectionRef}
      className="py-24 bg-gradient-to-br from-gray-950 to-indigo-950"
    >
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left column: Form */}
          <div>
            {/* Section heading */}
            <div className="mb-8">
              <div className="inline-flex items-center px-4 py-1 rounded-full text-xs font-medium bg-purple-800/30 text-purple-300 mb-4 backdrop-blur-sm border border-purple-800/40">
                LIMITED ACCESS
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
                  Be Among The First
                </span>
              </h2>
              <p className="text-xl text-gray-300">
                Join the early access program and transform your development process today.
              </p>
            </div>

            {/* Early access form container */}
            <div
              className={`bg-gray-900/70 backdrop-blur-sm border border-gray-800 rounded-xl p-8 transition-all duration-1000 ${
                isVisible
                  ? "opacity-100 transform translate-y-0"
                  : "opacity-0 transform translate-y-16"
              }`}
            >
              {submissionState === 'success' ? (
                <SuccessMessage />
              ) : (
                <EarlyAccessForm 
                  onSubmit={handleSubmit} 
                  isSubmitting={submissionState === 'submitting'} 
                />
              )}
            </div>
          </div>
          
          {/* Right column: Testimonials and stats */}
          <div className={`space-y-8 transition-all duration-1000 delay-300 ${
            isVisible
              ? "opacity-100 transform translate-y-0"
              : "opacity-0 transform translate-y-16"
          }`}>
            {/* Featured testimonial */}
            <Testimonials 
              testimonials={featuredTestimonials} 
              variant="purple"
            />
            
            {/* Stats cards */}
            <div className="grid grid-cols-2 gap-4">
              <StatCard 
                icon={ClipboardCheck} 
                value="94%" 
                label="Satisfied Beta Users" 
              />
              <StatCard 
                icon={Zap} 
                value="30+" 
                label="Hours Saved Per Project" 
              />
            </div>
            
            {/* Limited spots indicator */}
            <div className="bg-gray-900/70 backdrop-blur-sm border border-purple-900/30 rounded-xl p-6">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                <Rocket className="mr-2 text-purple-400" size={20} />
                Early Access Program
              </h3>
              
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300">Spots Remaining</span>
                  <span className="text-purple-300 font-medium">48 of 250</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2.5">
                  <div className="bg-gradient-to-r from-purple-600 to-blue-500 h-2.5 rounded-full" style={{ width: '81%' }}></div>
                </div>
              </div>
              
              <div className="text-gray-400 text-sm">
                Early access members receive exclusive benefits, including premium support and lifetime discounts on future plans.
              </div>
            </div>
          </div>
        </div>
        
        {/* Additional call to action */}
        <div className="mt-16 text-gray-300 text-center">
          <p>Want to learn more before signing up?</p>
          <div className="mt-4 flex justify-center space-x-4">
            <button className="text-blue-400 hover:text-blue-300 flex items-center transition-colors">
              <Github size={20} className="mr-2" />
              <span>GitHub</span>
            </button>
            <button className="text-blue-400 hover:text-blue-300 flex items-center transition-colors">
              <Twitter size={20} className="mr-2" />
              <span>Twitter</span>
            </button>
            <button className="text-blue-400 hover:text-blue-300 flex items-center transition-colors">
              <Mail size={20} className="mr-2" />
              <span>Contact</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

interface EarlyAccessFormProps {
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

const EarlyAccessForm = ({ onSubmit, isSubmitting }: EarlyAccessFormProps) => {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-400 mb-1 text-left"
          >
            Name
          </label>
          <input
            type="text"
            id="name"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Your name"
            required
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-400 mb-1 text-left"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="you@example.com"
            required
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="projectType"
          className="block text-sm font-medium text-gray-400 mb-1 text-left"
        >
          Primary Project Type
        </label>
        <select
          id="projectType"
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          <option value="">Select project type</option>
          <option value="web">Web Application</option>
          <option value="mobile">Mobile Application</option>
          <option value="api">API / Backend Service</option>
          <option value="fullstack">Full-Stack Application</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="message"
          className="block text-sm font-medium text-gray-400 mb-1 text-left"
        >
          What specific pain points are you looking to solve? (Optional)
        </label>
        <textarea
          id="message"
          rows={3}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Tell us about your development challenges..."
        ></textarea>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full px-6 py-4 bg-gradient-to-r from-purple-700 to-blue-700 hover:from-purple-600 hover:to-blue-600 
          text-white font-medium rounded-lg transition-all shadow-lg shadow-purple-900/40 relative overflow-hidden
          ${isSubmitting ? 'cursor-wait' : ''}`}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </span>
        ) : (
          "Secure Your Early Access Spot"
        )}
      </button>

      <div className="text-gray-400 text-sm flex items-start">
        <div className="mr-2 mt-0.5 text-purple-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          Only <span className="text-purple-300 font-medium">48</span> early access spots remain. Members receive premium support and lifetime benefits.
        </div>
      </div>
    </form>
  );
};

const SuccessMessage = () => {
  return (
    <div className="text-center py-8">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-900/30 text-green-400 mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-2xl font-bold text-white mb-2">You're on the list!</h3>
      <p className="text-gray-300 mb-8">
        We've received your request for early access. You'll be among the first to know when The Architect is ready.
      </p>
      <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
        <p className="text-gray-300 text-sm">
          Watch your inbox for a confirmation email with exclusive early access details.
        </p>
      </div>
    </div>
  );
};

interface StatCardProps {
  icon: React.ElementType;
  value: string;
  label: string;
}

const StatCard = ({ icon: Icon, value, label }: StatCardProps) => {
  return (
    <div className="bg-gray-900/70 backdrop-blur-sm border border-gray-800 rounded-xl p-5 flex items-center">
      <div className="w-10 h-10 rounded-full bg-purple-900/30 flex items-center justify-center mr-4">
        <Icon size={20} className="text-purple-400" />
      </div>
      <div>
        <div className="text-xl font-bold text-white">{value}</div>
        <div className="text-sm text-gray-400">{label}</div>
      </div>
    </div>
  );
}; 