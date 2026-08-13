import { useState } from 'react';
import { Link } from 'react-router-dom';

const NAV_LINKS = [
  { label: 'Platform', href: '#platform' },
  { label: 'Modules', href: '#modules' },
  { label: 'AI', href: '#ai' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Pricing', href: '#pricing' },
];

const HeropageNavbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="w-full bg-[#1a1a1a] px-4 py-3">
      <nav
        className="max-w-7xl mx-auto bg-[#f5f4f0] rounded-2xl px-6 py-3 flex items-center justify-between"
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="SmartERP home">
          <span className="w-8 h-8 bg-[#1a1a1a] rounded-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="5.5" height="5.5" rx="1" fill="white" />
              <rect x="9.5" y="1" width="5.5" height="5.5" rx="1" fill="white" />
              <rect x="1" y="9.5" width="5.5" height="5.5" rx="1" fill="white" />
              <rect x="9.5" y="9.5" width="5.5" height="5.5" rx="1" fill="white" />
            </svg>
          </span>
          <span className="text-[#1a1a1a] font-semibold text-base tracking-tight">
            SmartERP
            <span className="text-[10px] font-normal text-[#666] ml-0.5 align-super">AI</span>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <ul className="hidden md:flex items-center gap-7" role="list">
          {NAV_LINKS.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                className="text-[#444] text-sm font-normal hover:text-[#1a1a1a] transition-colors duration-150"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            to="/login"
            className="text-[#444] text-sm font-normal hover:text-[#1a1a1a] transition-colors duration-150"
          >
            Sign In
          </Link>
          <Link
            to="/request-demo"
            className="bg-[#1a1a1a] text-white text-sm font-medium px-5 py-2 rounded-xl hover:bg-[#333] transition-colors duration-150 whitespace-nowrap"
          >
            Request Demo →
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-1"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
        >
          <span className={`block w-5 h-0.5 bg-[#1a1a1a] transition-transform duration-200 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-5 h-0.5 bg-[#1a1a1a] transition-opacity duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-0.5 bg-[#1a1a1a] transition-transform duration-200 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div
          id="mobile-menu"
          className="max-w-7xl mx-auto bg-[#f5f4f0] rounded-2xl mt-2 px-6 py-4 flex flex-col gap-4 md:hidden"
        >
          <ul className="flex flex-col gap-3" role="list">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="text-[#444] text-sm font-normal hover:text-[#1a1a1a] transition-colors duration-150"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-3 pt-2 border-t border-[#e0e0d8]">
            <Link
              to="/login"
              className="text-[#444] text-sm font-normal hover:text-[#1a1a1a] transition-colors duration-150"
              onClick={() => setMenuOpen(false)}
            >
              Sign In
            </Link>
            <Link
              to="/request-demo"
              className="bg-[#1a1a1a] text-white text-sm font-medium px-5 py-2 rounded-xl hover:bg-[#333] transition-colors duration-150 text-center"
              onClick={() => setMenuOpen(false)}
            >
              Request Demo →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeropageNavbar;
