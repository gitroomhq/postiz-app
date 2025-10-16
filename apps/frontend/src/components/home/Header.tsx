"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react"; // ✅ for hamburger + close icons

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.header
      className="flex bg-white pt-[13px] pb-[13px] px-[30px] md:px-[60px] lg:px-[120px] fixed w-full z-10 items-center shadow-sm "
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="flex justify-between max-w-[1200px] w-full mx-auto">
        {/* Logo Section */}
        <div className="flex gap-2 items-center justify-center">
          <div className="relative w-[32px] h-[32px] md:w-[36px] md:h-[36px] lg:w-[40px] lg:h-[40px] rounded-lg overflow-hidden">
            <Image
              src="/newlogo2.png"
              alt="Ku Ku Social Logo"
              className="object-contain"
              priority
              fill
            />
          </div>
          <h4 className="font-bold text-[16px] md:text-[17px] lg:text-[18px] tracking-tight text-black">
            Ku Ku Social
          </h4>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8 text-[15px] font-medium text-[#575757] tracking-tight">
          <a href="#features" className="hover:text-[#126DFB] transition-colors">Features</a>
          <a href="#benefits" className="hover:text-[#126DFB] transition-colors">Benefits</a>
          <a href="#integrations" className="hover:text-[#126DFB] transition-colors">Integrations</a>
          <a href="#pricing" className="hover:text-[#126DFB] transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-[#126DFB] transition-colors">FAQ</a>
        </div>

        {/* Mobile Menu Icon */}
        <button
          className="md:hidden text-black focus:outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <motion.div
          className="absolute top-[65px] left-0 w-full bg-white border-t border-gray-200 flex flex-col items-center gap-5 py-5 text-[#575757] text-[15px] font-medium shadow-md md:hidden"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <a href="#features" onClick={() => setMenuOpen(false)} className="hover:text-[#126DFB] transition-colors">Features</a>
          <a href="#benefits" onClick={() => setMenuOpen(false)} className="hover:text-[#126DFB] transition-colors">Benefits</a>
          <a href="#integrations" onClick={() => setMenuOpen(false)} className="hover:text-[#126DFB] transition-colors">Integrations</a>
          <a href="#pricing" onClick={() => setMenuOpen(false)} className="hover:text-[#126DFB] transition-colors">Pricing</a>
          <a href="#faq" onClick={() => setMenuOpen(false)} className="hover:text-[#126DFB] transition-colors">FAQ</a>
        </motion.div>
      )}
    </motion.header>
  );
};

export default Header;
