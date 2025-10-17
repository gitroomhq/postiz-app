"use client";

import React from "react";
import { motion } from "framer-motion";

const Pricing = () => {
  return (
    <motion.section 
      id="pricing"
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
          <p className="text-[14px] font-medium text-[#126dfb]">Our Pricing</p>
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
            Choose the best Plan that suites you
            </div>
          </motion.div>
          
          <motion.div 
            className="w-full"
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <div className="text-[#575757] text-[16px]">
              Flexible pricing built for every stage — from startup to scale, no hidden fees.
            </div>
          </motion.div>
        </div>
      </div>
      
      <motion.div 
        className="bg-[#FFFFFF] flex flex-row gap-7 rounded-lg py-3 px-8"
        initial={{ y: 30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.6, duration: 0.6 }}
      >
        <div className="">
          <div className="text-black">Monthly</div>
        </div>
        <div className="">
          <div className="text-black">Annually</div>
        </div>
      </motion.div>
      
      <div className="flex flex-col lg:flex-row gap-8 mt-[60px] max-w-6xl mx-auto font-size-[16px]">
        {/* STARTER CARD */}
        <motion.div 
          className="flex flex-col flex-1 w-full bg-white rounded-xl p-5 shadow-sm"
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <div className="flex flex-col gap-6">
            <div>
              <div className="text-black text-[24px] font-semibold">Starter</div>
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="text-[60px] font-bold text-black relative inline-flex items-start">
                $139
                <div className="text-[16px] font-medium text-[#6C757D] relative top-3 ml-1">/month</div>
              </h2>
              <div className="">
                <div className="font-medium text-[#575757] text-[16px]">Great for small teams getting started.</div>
              </div>
            </div>
            <div className="flex flex-col gap-4 w-full">
              <h3 className="text-[#575757] text-[18px] font-medium">What's included</h3>
              <div className="flex gap-3">
                <div className="relative bg-[#E9ECEF] rounded-full p-3">
                  <svg className="w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#007BFF">
                    <polyline fill="none" points="3.7 14.3 9.6 19 20.3 5" stroke="#007BFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.088"></polyline>
                  </svg>
                </div>
                <div className="text-[16px] text-[#575757]">5,000 tracked users</div>
              </div>
              <div className="flex gap-3">
                <div className="relative bg-[#E9ECEF] rounded-full p-3">
                  <svg className="w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#007BFF">
                    <polyline fill="none" points="3.7 14.3 9.6 19 20.3 5" stroke="#007BFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.088"></polyline>
                  </svg>
                </div>
                <div className="text-[16px] text-[#575757]">Core analytics</div>
              </div>
              <div className="flex gap-3">
                <div className="relative bg-[#E9ECEF] rounded-full p-3">
                  <svg className="w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#007BFF">
                    <polyline fill="none" points="3.7 14.3 9.6 19 20.3 5" stroke="#007BFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.088"></polyline>
                  </svg>
                </div>
                <div className="text-[16px] text-[#575757]">Simple dashboards</div>
              </div>
              <div className="flex gap-3">
                <div className="relative bg-[#E9ECEF] rounded-full p-3">
                  <svg className="w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#007BFF">
                    <polyline fill="none" points="3.7 14.3 9.6 19 20.3 5" stroke="#007BFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.088"></polyline>
                  </svg>
                </div>
                  <div className="text-[16px] text-[#575757]">Email support</div>
              </div>
              <div className="flex gap-3">
                <div className="relative bg-[#E9ECEF] rounded-full p-3">
                  <svg className="w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#007BFF">
                    <polyline fill="none" points="3.7 14.3 9.6 19 20.3 5" stroke="#007BFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.088"></polyline>
                  </svg>
                </div>
                <div className="text-[16px] text-[#575757]">Weekly reports</div>
              </div>
            </div>
          </div>
          <button className="bg-[#007BFF] w-full rounded-lg py-3 px-3 text-white text-[16px] font-bold mt-8">
            Get Started
          </button>
        </motion.div>

        {/* GROWTH CARD - POPULAR */}
        <motion.div 
          className="flex flex-col flex-1 w-full bg-white rounded-xl p-5 shadow-sm border-2 border-[#007BFF]"
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          <div className="bg-[#007BFF] text-white text-center text-[14px] font-bold py-2 px-4 rounded-lg mb-6 -mt-8">
            Most Popular
          </div>
          <div className="flex flex-col gap-6">
            <div>
              <div className="text-black text-[24px] font-semibold">Growth</div>
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="text-[60px] font-bold text-black relative inline-flex items-start">
                $199
                <div className="text-[16px] font-medium text-[#6C757D] relative top-3 ml-1">/month</div>
              </h2>
              <div className="">
                <div className="font-medium text-[#575757] text-[16px]">For fast-growing teams who are scaling.</div>
              </div>
            </div>
            <div className="flex flex-col gap-4 w-full">
              <h3 className="text-[#575757] text-[18px] font-medium">What's included</h3>
              <div className="flex gap-3">
                <div className="relative bg-[#E9ECEF] rounded-full p-3">
                  <svg className="w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#007BFF">
                    <polyline fill="none" points="3.7 14.3 9.6 19 20.3 5" stroke="#007BFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.088"></polyline>
                  </svg>
                </div>
                <div className="text-[16px] text-[#575757]">Everything in starter</div>
              </div>
              <div className="flex gap-3">
                <div className="relative bg-[#E9ECEF] rounded-full p-3">
                  <svg className="w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#007BFF">
                    <polyline fill="none" points="3.7 14.3 9.6 19 20.3 5" stroke="#007BFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.088"></polyline>
                  </svg>
                </div>
                <div className="text-[16px] text-[#575757]">50,000 tracked users</div>
              </div>
              <div className="flex gap-3">
                <div className="relative bg-[#E9ECEF] rounded-full p-3">
                  <svg className="w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#007BFF">
                    <polyline fill="none" points="3.7 14.3 9.6 19 20.3 5" stroke="#007BFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.088"></polyline>
                  </svg>
                </div>
                <div className="text-[16px] text-[#575757]">Funnel & drop-off analysis</div>
              </div>
              <div className="flex gap-3">
                <div className="relative bg-[#E9ECEF] rounded-full p-3">
                  <svg className="w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#007BFF">
                    <polyline fill="none" points="3.7 14.3 9.6 19 20.3 5" stroke="#007BFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.088"></polyline>
                  </svg>
                </div>
                <div className="text-[16px] text-[#575757]">Custom dashboards</div>
              </div>
              <div className="flex gap-3">
                <div className="relative bg-[#E9ECEF] rounded-full p-3">
                  <svg className="w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#007BFF">
                    <polyline fill="none" points="3.7 14.3 9.6 19 20.3 5" stroke="#007BFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.088"></polyline>
                  </svg>
                </div>
                <div className="text-[16px] text-[#575757]">Team collaboration tools</div>
              </div>
            </div>
          </div>
          <button className="bg-[#007BFF] w-full rounded-lg py-3 px-3 text-white text-[16px] font-bold mt-8">
            Get Started
          </button>
        </motion.div>

        {/* PREMIUM CARD */}
        <motion.div 
          className="flex flex-col flex-1 w-full bg-white rounded-xl p-5 shadow-sm"
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          <div className="flex flex-col gap-6">
            <div>
              <div className="text-black text-[24px] font-semibold">Premium</div>
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="text-[60px] font-bold text-black relative inline-flex items-start">
                $599
                <div className="text-[16px] font-medium text-[#6C757D] relative top-3 ml-1">/month</div>
              </h2>
              <div className="">
                <div className="font-medium text-[#575757] text-[16px]">Great for enterprises to convert more.</div>
              </div>
            </div>
            <div className="flex flex-col gap-4 w-full">
              <h3 className="text-[#575757] text-[18px] font-medium">What's included</h3>
              <div className="flex gap-3">
                <div className="relative bg-[#E9ECEF] rounded-full p-3">
                  <svg className="w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#007BFF">
                    <polyline fill="none" points="3.7 14.3 9.6 19 20.3 5" stroke="#007BFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.088"></polyline>
                  </svg>
                </div>
                <p className="text-[16px] text-[#575757]">All Growth features</p>
              </div>
              <div className="flex gap-3">
                <div className="relative bg-[#E9ECEF] rounded-full p-3">
                  <svg className="w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#007BFF">
                    <polyline fill="none" points="3.7 14.3 9.6 19 20.3 5" stroke="#007BFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.088"></polyline>
                  </svg>
                </div>
                <p className="text-[16px] text-[#575757]">Unlimited tracked users</p>
              </div>
              <div className="flex gap-3">
                <div className="relative bg-[#E9ECEF] rounded-full p-3">
                  <svg className="w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#007BFF">
                    <polyline fill="none" points="3.7 14.3 9.6 19 20.3 5" stroke="#007BFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.088"></polyline>
                  </svg>
                </div>
                <p className="text-[16px] text-[#575757]">Dedicated account manager</p>
              </div>
              <div className="flex gap-3">
                <div className="relative bg-[#E9ECEF] rounded-full p-3">
                  <svg className="w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#007BFF">
                    <polyline fill="none" points="3.7 14.3 9.6 19 20.3 5" stroke="#007BFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.088"></polyline>
                  </svg>
                </div>
                <p className="text-[16px] text-[#575757]">SLA & compliance support</p>
              </div>
              <div className="flex gap-3">
                <div className="relative bg-[#E9ECEF] rounded-full p-3">
                  <svg className="w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#007BFF">
                    <polyline fill="none" points="3.7 14.3 9.6 19 20.3 5" stroke="#007BFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.088"></polyline>
                  </svg>
                </div>
                <p className="text-[16px] text-[#575757]">Advanced integrations</p>
              </div>
            </div>
          </div>
          <button className="bg-[#007BFF] w-full rounded-lg py-3 px-3 text-white text-[16px] font-bold mt-8">
            Get Started
          </button>
        </motion.div>
      </div>
    </motion.section>
  );
};

export default Pricing;