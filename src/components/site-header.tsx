"use client";

import Link from "next/link";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/magazines", label: "Magazines" },
  { href: "/skaters", label: "Skaters" },
  { href: "/spots", label: "Spots" },
  { href: "/photographers", label: "Photographers" },
  { href: "/brands", label: "Brands" },
  { href: "/map", label: "Map" },
];

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="border-b border-[#ebebeb] bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity"
            onClick={() => setIsMenuOpen(false)}
          >
            <img
              src="/logo.jpg"
              alt="Skate Mag Archive"
              className="h-8 w-auto"
            />
            <span className="text-xl font-semibold tracking-tight text-[#3a3a3a]">Archive</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-[#666] hover:text-[#3a3a3a] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 -mr-2 text-[#3a3a3a]"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <nav className="md:hidden border-t border-[#ebebeb] bg-white">
          <div className="container mx-auto px-4 py-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="block py-3 text-[#3a3a3a] border-b border-[#ebebeb] last:border-b-0 hover:text-[#666] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
