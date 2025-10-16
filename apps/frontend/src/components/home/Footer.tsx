"use client";

import React from "react";
import { motion } from "framer-motion";

const Footer = () => {
  return (
    <motion.footer 
      className="mt-[240px] pt-[50px] pl-[50px] bg-white w-full"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="w-full pb-8 grid grid-cols-1 md:grid-cols-4">
        {/* Logo and description */}
        <div className="w-full col-span-2 pr-[290px]">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-blue-600 text-white flex items-center justify-center rounded-full font-bold text-lg">
              A
            </div>
            <span className="text-xl font-semibold">Alytics</span>
          </div>
          <div className="text-[16px] text-gray-500 mb-4">
            Turn complex data into clear, actionable insights so you can make smarter decisions and drive growth with confidence.
          </div>
        </div>

        {/* Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-[180px]">
          <div>
            <h3 className="text-gray-900 text-[20px] font-semibold mb-3">Sections</h3>
            <ul className="space-y-2 text-[16px] text-gray-500">
              <li><a href="#features" className="hover:text-blue-600">Features</a></li>
              <li><a href="#benefits" className="hover:text-blue-600">Benefits</a></li>
              <li><a href="#integrations" className="hover:text-blue-600">Integrations</a></li>
              <li><a href="#pricing" className="hover:text-blue-600">Pricing</a></li>
              <li><a href="#faq" className="hover:text-blue-600">FAQ</a></li>
            </ul>
          </div>

          {/* Socials */}
          <div>
            <h3 className="text-gray-900 text-[20px] font-semibold mb-3">Socials</h3>
            <ul className="space-y-2 text-[16px] text-gray-500">
              <li><a href="#" className="hover:text-blue-600">Instagram</a></li>
              <li><a href="#" className="hover:text-blue-600">Twitter/X</a></li>
              <li><a href="#" className="hover:text-blue-600">LinkedIn</a></li>
            </ul>
          </div>

          {/* Pages */}
          <div>
            <h3 className="text-gray-900 text-[20px] font-semibold mb-3">Pages</h3>
            <ul className="space-y-2 text-[16px] text-gray-500">
              <li><a href="#" className="hover:text-blue-600">Home</a></li>
              <li><a href="#" className="hover:text-blue-600">Newsletter</a></li>
              <li><a href="#" className="hover:text-blue-600">404</a></li>
            </ul>
          </div>
        </div>

      </div>
      
      {/* Bottom Line */}
      <div className="border-t text-[16px] text-gray-500 py-4 pl-6 pr-[125px] flex flex-col md:flex-row justify-between items-center w-full mx-auto">
        <p className="text-black font-semibold">All Rights Reserved © 2024 Alytics</p>
      </div>
    </motion.footer>
  );
};

export default Footer;