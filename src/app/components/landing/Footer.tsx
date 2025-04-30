import { Braces, Github, Twitter, Mail } from 'lucide-react';

interface FooterProps {
  scrollToSection: (sectionId: string) => void;
}

export const Footer = ({ scrollToSection }: FooterProps) => {
  return (
    <footer className="py-12 bg-gray-950 border-t border-gray-900" role="contentinfo" aria-label="Site footer">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          {/* Logo and tagline */}
          <div className="flex items-center mb-6 md:mb-0">
            <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
              <Braces size={18} className="text-white" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-white">
                The Architect
              </div>
              <div className="text-sm text-gray-400">
                Creation Without Configuration
              </div>
            </div>
          </div>

          {/* Navigation links */}
          <nav aria-label="Footer navigation">
            <ul className="flex space-x-8">
              {[
                { id: "problem", label: "Problem" },
                { id: "howItWorks", label: "How It Works" },
                { id: "benefits", label: "Benefits" },
                { id: "technical", label: "Technical" },
                { id: "access", label: "Early Access" }
              ].map(link => (
                <li key={link.id}>
                  <button
                    onClick={() => scrollToSection(link.id)}
                    className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-950 rounded-md px-2 py-1"
                    aria-label={`Go to ${link.label} section`}
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-900 flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-500 text-sm mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} The Architect. All rights reserved.
          </div>
          <div className="flex space-x-6">
            <a
              href="#"
              className="text-gray-500 hover:text-gray-300 transition-colors p-2 hover:bg-gray-800 rounded-full"
              aria-label="GitHub"
              rel="noopener noreferrer"
            >
              <Github size={20} aria-hidden="true" />
            </a>
            <a
              href="#"
              className="text-gray-500 hover:text-gray-300 transition-colors p-2 hover:bg-gray-800 rounded-full"
              aria-label="Twitter"
              rel="noopener noreferrer"
            >
              <Twitter size={20} aria-hidden="true" />
            </a>
            <a
              href="#"
              className="text-gray-500 hover:text-gray-300 transition-colors p-2 hover:bg-gray-800 rounded-full"
              aria-label="Email"
              rel="noopener noreferrer"
            >
              <Mail size={20} aria-hidden="true" />
            </a>
          </div>
        </div>

        {/* Vision hint */}
        <div className="mt-8 text-center">
          <button 
            className="text-gray-600 hover:text-blue-400 text-sm transition-colors py-2 px-4 rounded-full hover:bg-gray-900/50"
            aria-label="View future vision"
          >
            Glimpse the future of creation
          </button>
        </div>
      </div>
    </footer>
  );
}; 