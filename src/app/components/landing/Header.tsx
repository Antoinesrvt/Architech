import { useState } from 'react';
import { Menu, X, Braces } from 'lucide-react';
import { NavItem } from './types';

interface HeaderProps {
  scrolled: boolean;
  activeSection: string;
  scrollToSection: (sectionId: string) => void;
}

const navItems: NavItem[] = [
  { id: "problem", name: "Problem" },
  { id: "howItWorks", name: "How It Works" },
  { id: "benefits", name: "Benefits" },
  { id: "technical", name: "Technical" },
  { id: "access", name: "Early Access" },
];

export const Header = ({ scrolled, activeSection, scrollToSection }: HeaderProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  
  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-gray-900/90 backdrop-blur-sm shadow-md py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
            <Braces size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            The Architect
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={`text-sm transition-colors ${
                activeSection === item.id
                  ? "text-blue-400 font-medium"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              {item.name}
            </button>
          ))}
        </nav>

        {/* CTA Button */}
        <div className="hidden md:block">
          <button
            onClick={() => scrollToSection("access")}
            className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-all"
          >
            Get Early Access
          </button>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-md text-gray-400 hover:text-white focus:outline-none"
          onClick={toggleMobileMenu}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden ${mobileMenuOpen ? "block" : "hidden"}`}>
        <div className="px-2 pt-2 pb-3 space-y-1 bg-gray-900/90 backdrop-blur">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className="block w-full text-left px-3 py-2 text-base font-medium text-white hover:bg-gray-800 rounded-md"
            >
              {item.name}
            </button>
          ))}
          <div className="px-3 py-2">
            <button
              onClick={() => scrollToSection("access")}
              className="w-full px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-all"
            >
              Get Early Access
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}; 