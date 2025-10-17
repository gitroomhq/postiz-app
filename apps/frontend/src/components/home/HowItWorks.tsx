"use client";

import React from "react";
import { motion } from "framer-motion";

const HowItWorks = () => {
  return (
    <motion.section 
    className="relative flex flex-col items-center w-full gap-3  pt-[80px] overflow-hidden mt-[15px] md:mt-[15px] lg:mt-[50px] p-2 max-w-[390px] md:max-w-[810px] lg:max-w-[1200px] mx-auto"
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
          <p className="text-[14px] font-medium text-[#126dfb]">How It Works</p>
        </motion.div>
        
        <div className="flex flex-col gap-2 items-center text-center w-full">
          <motion.div 
            className="w-full"
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <div className="text-black text-center text-[28px] leading-[1em] md:text-[38px] w-full lg:text-[48px] font-semibold leading-[50px]">
              Get clear answers in 3 simple steps
            </div>
          </motion.div>
          
          <motion.div 
            className="w-full"
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <div className="text-[#575757] text-[16px] font-medium leading-[1.4em] tracking-[-0.03em] font-[Geist,sans-serif] not-italic w-full">
              From data to clarity—uncover insights, take action, and grow smarter in three simple steps.
            </div>
          </motion.div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-10 w-full">
        <motion.div 
          className="grid grid-cols overflow-hidden bg-white rounded-3xl w-full h-full max-h-[350px]"
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.6 }}
          whileHover={{ y: -5 }}
        >
          <div className="p-5">
            <div className="text-[22px] font-semibold text-black">Connect your product</div>
            <div className="text-[16px] text-[#575757] mt-2">
              Integrate in minutes with your existing stack—no engineering lift required.
            </div>
          </div>
          <img 
            className="mt-4 object-contain"
            src="https://framerusercontent.com/images/eZxPRr9DFJ1LBw2C6XgbmteUwk.png?width=6000&height=3673"
            alt="Integration illustration"
          />
        </motion.div>

        <motion.div 
          className="grid grid-cols overflow-hidden bg-white rounded-3xl w-full h-full max-h-[350px]"
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8, duration: 0.6 }}
          whileHover={{ y: -5 }}
        >
          <div className="p-5">
            <div className="text-[22px] font-semibold text-black">Track User Behavior</div>
            <div className="text-[16px] text-[#575757] mt-2">
              See what's used, what's dropped, and what keeps users engaged.
            </div>
          </div>
          <img 
            className="mt-7 object-contain"
            src="https://framerusercontent.com/images/MTi16xQQXh1uLFK6rlUiLRrhNc4.png?width=6000&height=3528"
            alt="User behavior tracking graphic"
          />
        </motion.div>

        <motion.div 
          className="grid grid-cols overflow-hidden bg-white rounded-3xl w-full h-full max-h-[350px]"
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1, duration: 0.6 }}
          whileHover={{ y: -5 }}
        >
          <div className="p-5">
            <div className="text-[22px] font-semibold text-black">Turn Insights Into Action</div>
              <div className="text-[16px] text-[#575757] mt-2">
              Get clear, actionable recommendations to boost retention and grow MRR.
            </div>
          </div>
          <img 
            className="object-contain"
            src="https://framerusercontent.com/images/WVfMImGvfZB1ZvVOi4f8QpGgcQ.png?width=6000&height=3615"
            alt="Actionable insights illustration"
          />
        </motion.div>
      </div>
    </motion.section>
  );
};

export default HowItWorks;
