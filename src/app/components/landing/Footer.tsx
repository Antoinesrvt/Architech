import { Braces, Github, Twitter, Mail } from 'lucide-react';

interface FooterProps {
  scrollToSection: (sectionId: string) => void;
}

export const Footer = ({ scrollToSection }: FooterProps) => {
  return (
    <footer className="py-12 bg-gray-950 border-t border-gray-900">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          {/* Logo and tagline */}
          <div className="flex items-center mb-6 md:mb-0">
            <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
              <Braces size={18} className="text-white" />
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

          {/* Links */}
          <div className="flex space-x-8">
            <button
              onClick={() => scrollToSection("problem")}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Problem
            </button>
            <button
              onClick={() => scrollToSection("howItWorks")}
              className="text-gray-400 hover:text-white transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection("benefits")}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Benefits
            </button>
            <button
              onClick={() => scrollToSection("technical")}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Technical
            </button>
            <button
              onClick={() => scrollToSection("access")}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Early Access
            </button>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-900 flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-500 text-sm mb-4 md:mb-0">
            &copy; 2025 The Architect. All rights reserved.
          </div>
          <div className="flex space-x-6">
            <a
              href="#"
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <Github size={20} />
            </a>
            <a
              href="#"
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <Twitter size={20} />
            </a>
            <a
              href="#"
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <Mail size={20} />
            </a>
          </div>
        </div>

        {/* Vision hint */}
        <div className="mt-8 text-center">
          <button className="text-gray-600 hover:text-blue-400 text-sm transition-colors">
            Glimpse the future of creation
          </button>
        </div>
      </div>
    </footer>
  );
}; 