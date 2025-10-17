"use client";

import React from "react";
import { motion } from "framer-motion";

const Integrations = () => {
  const integrations = [
    { 
      name: "Instagram", 
      logo: "https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg",
      description: "Share your content across Instagram feeds"
    },
    { 
      name: "Twitter", 
      logo: "https://upload.wikimedia.org/wikipedia/commons/6/6f/Logo_of_Twitter.svg",
      description: "Connect with your Twitter audience"
    },
    { 
      name: "Facebook", 
      logo: "https://upload.wikimedia.org/wikipedia/commons/0/05/Facebook_Logo_%282019%29.png",
      description: "Reach millions on Facebook platform"
    },
    { 
      name: "LinkedIn", 
      logo: "https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png",
      description: "Professional networking and B2B marketing"
    },
    { 
      name: "YouTube", 
      logo: "https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg",
      description: "Upload and manage your video content"
    },
    { 
      name: "TikTok", 
      logo: "https://upload.wikimedia.org/wikipedia/commons/a/a9/TikTok_logo.svg",
      description: "Create engaging short-form videos"
    },
  ];

  return (
    <motion.section
      id="integrations"
      className="relative flex flex-col items-center w-full gap-3 pb-[170px] overflow-hidden mt-[15px] md:mt-[15px] lg:mt-[50px] p-2 max-w-[390px] md:max-w-[810px] lg:max-w-[1200px] mx-auto"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8 }}
    >
      <div className="bg-white rounded-2xl shadow-sm flex flex-col md:flex-row w-full max-w-6xl overflow-hidden">
        {/* Left Section */}
        <motion.div
          className="flex flex-col justify-center flex-1 px-10 py-12"
          initial={{ x: -50, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Tag */}
          <div className="flex items-center">
            <span className="text-[13px] font-medium text-[#126DFB] border border-[#126DFB] rounded-full py-1 px-3">
              Integrations
            </span>
          </div>

          {/* Heading */}
          <div className="text-black font-semibold text-[32px] md:text-[40px] leading-tight mt-4">
            Seamless Integrations
          </div>

          {/* Description */}
          <div className="text-[#575757] text-[16px] mt-3 mb-6 max-w-md leading-relaxed">
            Connect Alytics with your favorite tools to streamline workflows and
            keep everything running smoothly.
          </div>

          {/* Button */}
          <motion.button
            className="bg-[#126DFB] text-white rounded-lg py-2.5 px-5 text-[15px] font-medium w-max shadow-md"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Get Started Now
          </motion.button>
        </motion.div>

        {/* Right Section */}
        <motion.div
          className="flex-1 flex items-center justify-center bg-[#f7f8fb] rounded-r-[70px] rounded-l-[70px] border-[40px] border-white"
          initial={{ x: 50, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <div className="relative overflow-hidden h-96 w-full max-w-sm">
            <motion.div
              className="flex flex-col gap-4"
              animate={{
                y: [0, -400],
              }}
              transition={{
                repeat: Infinity,
                repeatType: "loop",
                duration: 20,
                ease: "linear",
              }}
            >
              {/* First set of integrations */}
              {integrations.map((integration, index) => (
                <motion.div
                  key={`first-${index}`}
                  className="flex items-center bg-white rounded-xl shadow-sm p-4 h-20 flex-shrink-0"
                  whileHover={{ scale: 1.02 }}
                >
                  {/* Logo */}
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gray-50 flex-shrink-0">
                    <img 
                      src={integration.logo} 
                      alt={`${integration.name} logo`}
                      className="w-8 h-8 object-contain"
                    />
                  </div>

                  {/* Integration info */}
                  <div className="ml-4 flex-1 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-[16px] font-semibold text-gray-900">
                        {integration.name}
                      </div>
                      {/* Checkmark */}
                      <div className="w-5 h-5 bg-[#126DFB] rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-[14px] text-gray-500 leading-relaxed">
                      {integration.description}
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {/* Duplicate set for seamless loop */}
              {integrations.map((integration, index) => (
                <motion.div
                  key={`second-${index}`}
                  className="flex items-center bg-white rounded-xl shadow-sm p-4 h-20 flex-shrink-0"
                  whileHover={{ scale: 1.02 }}
                >
                  {/* Logo */}
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gray-50 flex-shrink-0">
                    <img 
                      src={integration.logo} 
                      alt={`${integration.name} logo`}
                      className="w-8 h-8 object-contain"
                    />
                  </div>

                  {/* Integration info */}
                  <div className="ml-4 flex-1 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-[16px] font-semibold text-gray-900">
                        {integration.name}
                      </div>
                      {/* Checkmark */}
                      <div className="w-5 h-5 bg-[#126DFB] rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-[14px] text-gray-500 leading-relaxed">
                      {integration.description}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
};

export default Integrations;
