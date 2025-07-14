import { Braces, Menu, X } from "lucide-react";
import { useState } from "react";
import { type NavItem, SectionProps } from "./types";

interface HeaderProps {
  scrolled: boolean;
  activeSection: string | null;
  scrollToSection: (section: string) => void;
}

const navItems: NavItem[] = [
  { id: "problem", name: "Problem" },
  { id: "howItWorks", name: "How It Works" },
  { id: "benefits", name: "Benefits" },
  { id: "technical", name: "Technical" },
  { id: "access", name: "Early Access" },
];

export const Header = ({
  scrolled,
  activeSection,
  scrollToSection,
}: HeaderProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => { setMobileMenuOpen(!mobileMenuOpen); };

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "bg-gray-900/90 backdrop-blur-md py-4 shadow-lg"
          : "bg-transparent py-6"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
        {/* Logo */}
        <button
          type="button"
          onClick={() => { scrollToSection("hero"); }}
          className={
            "text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600 transition-all duration-300 transform hover:scale-105"
          }
        >
          The Architect
        </button>

        {/* Nav items - hidden on mobile */}
        <nav className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { scrollToSection(item.id); }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 relative group ${
                activeSection === item.id
                  ? "text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {item.name}
              <span
                className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-600 transform origin-left transition-transform duration-300 rounded-full ${
                  activeSection === item.id
                    ? "scale-x-100"
                    : "scale-x-0 group-hover:scale-x-100"
                }`}
              />
            </button>
          ))}
        </nav>

        {/* CTA button */}
        <button
          type="button"
          onClick={() => { scrollToSection("access"); }}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-700 to-indigo-700 text-white text-sm font-medium transition-all duration-300 transform hover:translate-y-[-2px] hover:shadow-lg hover:shadow-purple-900/30 hover:from-purple-600 hover:to-indigo-600 active:translate-y-0 active:shadow-none"
        >
          Early Access
        </button>

        {/* Mobile menu button */}
        <button
          type="button"
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
              type="button"
              onClick={() => { scrollToSection(item.id); }}
              className="block w-full text-left px-3 py-2 text-base font-medium text-white hover:bg-gray-800 rounded-md"
            >
              {item.name}
            </button>
          ))}
          <div className="px-3 py-2">
            <button
              type="button"
              onClick={() => { scrollToSection("access"); }}
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
