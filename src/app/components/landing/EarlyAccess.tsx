import { Github, Twitter, Mail } from 'lucide-react';
import { SectionProps } from './types';

export const EarlyAccess = ({ sectionRef, isVisible }: SectionProps) => {
  return (
    <section
      ref={sectionRef}
      className="py-24 bg-gradient-to-br from-gray-950 to-indigo-950"
    >
      <div className="max-w-3xl mx-auto px-4 text-center">
        {/* Section heading */}
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
              Join the Early Access List
            </span>
          </h2>
          <p className="text-xl text-gray-300">
            Be among the first to transform your development process.
          </p>
        </div>

        {/* Early access form */}
        <div
          className={`bg-gray-900/70 backdrop-blur-sm border border-gray-800 rounded-xl p-8 transition-all duration-1000 ${
            isVisible
              ? "opacity-100 transform translate-y-0"
              : "opacity-0 transform translate-y-16"
          }`}
        >
          <EarlyAccessForm />
        </div>

        {/* Additional call to action */}
        <div className="mt-12 text-gray-300">
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

const EarlyAccessForm = () => {
  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
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
          rows={4}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Tell us about your development challenges..."
        ></textarea>
      </div>

      <button
        type="submit"
        className="w-full px-6 py-4 bg-purple-700 hover:bg-purple-600 text-white font-medium rounded-lg transition-all shadow-lg shadow-purple-900/40"
      >
        Join Early Access
      </button>

      <div className="mt-6 text-gray-400 text-sm">
        Limited spots available. Early access participants will receive
        special benefits.
      </div>
    </form>
  );
}; 