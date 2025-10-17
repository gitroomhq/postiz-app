"use client";

import React from "react";
import { motion } from "framer-motion";

const FAQ = () => {
  return (
    <motion.section 
      id="faq"
      className="relative flex flex-col items-center w-full gap-3 pb-[170px] overflow-hidden mt-[15px] md:mt-[15px] lg:mt-[50px] p-2 max-w-[390px] md:max-w-[810px] lg:max-w-[1200px] mx-auto"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8 }}
    >
      <div className="flex flex-col w-full gap-4 items-center">
        <motion.div 
          className="flex bg-[#E1EAF8] w-max border border-[#126dfb] rounded-full py-1 px-2 items-center"
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-[14px] font-medium text-[#126dfb]">FAQ's</p>
        </motion.div>
        
        <div className="flex flex-col gap-2 items-center text-center w-full">
          <motion.div 
            className="w-full"
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <h1 className="text-black text-center text-[28px] leading-[1em] md:text-[38px] w-full lg:text-[48px] font-semibold leading-[50px]">
              Common questions with Clear answers
            </h1>
          </motion.div>
          
          <motion.div 
            className="w-full"
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <div className="text-[#575757] text-[16px]">
              Here are answers to the most common things people ask before getting started.
            </div>
          </motion.div>
        </div>
      </div>
      
      <motion.div 
        className="w-full max-w-[820px] space-y-4 mt-8"
        initial={{ y: 50, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.6, duration: 0.6 }}
      >
        <details className="group border border-black/20 rounded-xl bg-white duration-700 transition-all transition-discrete ease-in-out">
          <summary className="flex items-center justify-between cursor-pointer text-[18px] pl-4 font-medium text-black">
            How does your platform track feature usage?
            <span className="text-2xl p-5 transition-transform duration-300 group-open:rotate-180">
              <span className="group-open:hidden">+</span>
              <span className="hidden group-open:inline">−</span>
            </span>
          </summary>
          <div className="border-t border-[#B0B0B0]"></div>
          <div className="mt-3 text-[#575757] px-3 pb-3 text-[16px]">
            We automatically collect interaction data across your product and visualize which features are being used most — no manual tagging needed.
          </div>
        </details>

        <details className="group border border-black/20 rounded-xl bg-white transition-all">
          <summary className="flex items-center justify-between cursor-pointer text-[18px] pl-4 font-medium text-black">
            Do I need technical skills to use Alytics?
            <span className="text-2xl p-5 transition-transform duration-300 group-open:rotate-180">
              <span className="group-open:hidden">+</span>
              <span className="hidden group-open:inline">−</span>
            </span>
          </summary>
          <div className="border-t border-[#B0B0B0]"></div>
          <div className="mt-3 text-[#575757] px-3 pb-3 text-[16px]">
            Not at all. Alytics is built for teams of all sizes. Whether you're in marketing, product, or operations, the interface is intuitive and requires no coding.
          </div>
        </details>

        <details className="group border border-black/20 rounded-xl bg-white transition-all">
          <summary className="flex items-center justify-between cursor-pointer text-[18px] pl-4 font-medium text-black">
            Can Alytics integrate with tools we already use?
            <span className="text-2xl p-5 transition-transform duration-300 group-open:rotate-180">
              <span className="group-open:hidden">+</span>
              <span className="hidden group-open:inline">−</span>
            </span>
          </summary>
          <div className="border-t border-[#B0B0B0]"></div>
          <div className="mt-3 text-[#575757] px-3 pb-3 text-[16px]">
            Yes. Alytics integrates with major tools like Stripe, Google Analytics, HubSpot, and more. You can also connect via API or no-code platforms.
          </div>
        </details>

        <details className="group border border-black/20 rounded-xl bg-white transition-all">
          <summary className="flex items-center justify-between cursor-pointer text-[18px] pl-4 font-medium text-black">
            Is my data secure on Alytics?
            <span className="text-2xl p-5 transition-transform duration-300 group-open:rotate-180">
              <span className="group-open:hidden">+</span>
              <span className="hidden group-open:inline">−</span>
            </span>
          </summary>
          <div className="border-t border-[#B0B0B0]"></div>
          <div className="mt-3 text-[#575757] px-3 pb-3 text-[16px]">
            Absolutely. We use enterprise-grade encryption and follow best practices in data privacy and compliance.
          </div>
        </details>

        <details className="group border border-black/20 rounded-xl bg-white transition-all">
          <summary className="flex items-center justify-between cursor-pointer text-[18px] pl-4 font-medium text-black">
            Can I try Alytics before committing?
            <span className="text-2xl p-5 transition-transform duration-300 group-open:rotate-180">
              <span className="group-open:hidden">+</span>
              <span className="hidden group-open:inline">−</span>
            </span>
          </summary>
          <div className="border-t border-[#B0B0B0]"></div>
          <div className="mt-3 text-[#575757] px-3 pb-3 text-[16px]">
            Yes, we offer a free trial so you can explore all features before upgrading to a paid plan.
          </div>
        </details>
      </motion.div>
    </motion.section>
  );
};

export default FAQ;