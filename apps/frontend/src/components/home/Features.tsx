"use client";

import React from "react";
import { motion } from "framer-motion";

const Features = () => {
  return (
    <motion.section 
      id="features"
      className="relative flex flex-col items-center w-full gap-3  overflow-hidden mt-[15px] md:mt-[15px] lg:mt-[50px] p-2 max-w-[390px] md:max-w-[810px] lg:max-w-[1200px] mx-auto"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8 }}
    >
      <motion.div 
        className="flex bg-[#E1EAF8] w-max border border-[#126dfb] rounded-full py-1 px-2 items-center"
        initial={{ y: 30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <p className="text-[14px] font-medium text-[#126dfb] ml-2">Unique Features</p>
      </motion.div>

      <motion.div 
        className="w-full"
        initial={{ y: 30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <div className="text-black text-center text-[28px] leading-[1em] md:text-[38px] w-full lg:text-[48px] font-semibold leading-[50px]">
          Make Your Platform Work Harder For You
        </div>
      </motion.div>

      <motion.div 
        className="w-full max-[809.98px]:max-w-[300px]"
        initial={{ y: 30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        <div className="text-center text-[#575757] text-[16px] font-medium leading-[1.4em] tracking-[-0.03em] font-[Geist,sans-serif] not-italic">
          Streamline your business with unified metrics and AI-powered analytics—all in one place.
        </div>
      </motion.div>
      <div className="flex flex-col lg:flex-row gap-4 w-full">
        <motion.div 
          className="flex flex-col gap-4 bg-white rounded-3xl p-4 w-full"
          initial={{ x: -50, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.6 }}
          whileHover={{ y: -5 }}
        >
          <div className="flex flex-col bg-[#F7F7F7] rounded-lg">
            <img 
              decoding="auto" 
              loading="lazy" 
              width="4000" 
              height="2216"
              sizes="calc(max((min(min(100vw, 810px) - 64px, 810px) - 20px) / 2, 1px) - 32px)"
              srcSet="https://framerusercontent.com/images/UasGKBRyLZHeUJr1HL5mRgukJU.png?scale-down-to=512&width=4000&height=2216 512w,https://framerusercontent.com/images/UasGKBRyLZHeUJr1HL5mRgukJU.png?scale-down-to=1024&width=4000&height=2216 1024w,https://framerusercontent.com/images/UasGKBRyLZHeUJr1HL5mRgukJU.png?scale-down-to=2048&width=4000&height=2216 2048w,https://framerusercontent.com/images/UasGKBRyLZHeUJr1HL5mRgukJU.png?width=4000&height=2216 4000w"
              src="https://framerusercontent.com/images/UasGKBRyLZHeUJr1HL5mRgukJU.png?width=4000&height=2216"
              alt="Dashboard showing MRR of $69,897 and 1206 active users with an upward trend graph."
              style={{display: 'block', width: '100%', height: '100%', borderRadius: 'inherit', objectPosition: 'center center', objectFit: 'cover'}}
            />
          </div>
          <div className="flex flex-col w-5/6 pl-2">
            <div className="text-[22px] font-semibold text-black">Unified Metrics</div>
            <div className="text-[16px] text-[#575757] font-medium leading-[1.4em] tracking-[-0.03em] font-[Geist,sans-serif] not-italic">See your MRR and active users in one clean, unified view — no more switching tabs.</div>
          </div>
        </motion.div>

        <motion.div 
          className="flex flex-col gap-4 bg-white rounded-3xl p-4 w-full lg:block hidden"
          initial={{ x: 50, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8, duration: 0.6 }}
          whileHover={{ y: -5 }}
        >
          <div className="flex flex-col bg-[#F7F7F7] rounded-lg">
            <img 
              decoding="auto" 
              loading="lazy" 
              width="4000" 
              height="2216"
              sizes="calc(max((min(min(100vw, 810px) - 64px, 810px) - 20px) / 2, 1px) - 32px)"
              srcSet="https://framerusercontent.com/images/eUVqpWJ3R7uJaOJnHDYhRMM4WPE.png?scale-down-to=512&width=4000&height=2216 512w,https://framerusercontent.com/images/eUVqpWJ3R7uJaOJnHDYhRMM4WPE.png?scale-down-to=1024&width=4000&height=2216 1024w,https://framerusercontent.com/images/eUVqpWJ3R7uJaOJnHDYhRMM4WPE.png?scale-down-to=2048&width=4000&height=2216 2048w,https://framerusercontent.com/images/eUVqpWJ3R7uJaOJnHDYhRMM4WPE.png?width=4000&height=2216 4000w"
              src="https://framerusercontent.com/images/eUVqpWJ3R7uJaOJnHDYhRMM4WPE.png?width=4000&height=2216"
              alt="AI suggesting actions like Optimize onboarding flow and Raise pricing tier based on user data."
              style={{display: 'block', width: '100%', height: '100%', borderRadius: 'inherit', objectPosition: 'center center', objectFit: 'cover'}}
            />
          </div>
          <div className="flex flex-col w-4/5 pl-2">
            <div className="text-[22px] font-semibold text-black">AI Growth Insights</div>
            <div className="text-[16px] text-[#575757] font-medium leading-[1.4em] tracking-[-0.03em] font-[Geist,sans-serif] not-italic">Actionable suggestions from your data, without digging into spreadsheets or dashboards.</div>
          </div>
        </motion.div>
      </div>

      {/* Second box shown on md/sm only */}
      <motion.div 
        className="flex flex-col gap-4 bg-white rounded-3xl p-4 w-full mt-4 lg:hidden"
        initial={{ x: 50, opacity: 0 }}
        whileInView={{ x: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.8, duration: 0.6 }}
        whileHover={{ y: -5 }}
      >
        <div className="flex flex-col bg-[#F7F7F7] rounded-lg">
          <img 
            decoding="auto" 
            loading="lazy" 
            width="4000" 
            height="2216"
            sizes="calc(max((min(min(100vw, 810px) - 64px, 810px) - 20px) / 2, 1px) - 32px)"
            srcSet="https://framerusercontent.com/images/eUVqpWJ3R7uJaOJnHDYhRMM4WPE.png?scale-down-to=512&width=4000&height=2216 512w,https://framerusercontent.com/images/eUVqpWJ3R7uJaOJnHDYhRMM4WPE.png?scale-down-to=1024&width=4000&height=2216 1024w,https://framerusercontent.com/images/eUVqpWJ3R7uJaOJnHDYhRMM4WPE.png?scale-down-to=2048&width=4000&height=2216 2048w,https://framerusercontent.com/images/eUVqpWJ3R7uJaOJnHDYhRMM4WPE.png?width=4000&height=2216 4000w"
            src="https://framerusercontent.com/images/eUVqpWJ3R7uJaOJnHDYhRMM4WPE.png?width=4000&height=2216"
            alt="AI suggesting actions like Optimize onboarding flow and Raise pricing tier based on user data."
            style={{display: 'block', width: '100%', height: '100%', borderRadius: 'inherit', objectPosition: 'center center', objectFit: 'cover'}}
          />
        </div>
        <div className="flex flex-col w-4/5 pl-2">
          <div className="text-[22px] font-semibold text-black">AI Growth Insights</div>
          <div className="text-[16px] text-[#575757] font-medium leading-[1.4em] tracking-[-0.03em] font-[Geist,sans-serif] not-italic">Actionable suggestions from your data, without digging into spreadsheets or dashboards.</div>
        </div>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-4 w-full">
        <motion.div 
          className="flex flex-col gap-4 bg-white rounded-3xl p-4 w-full"
          initial={{ x: -50, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1, duration: 0.6 }}
          whileHover={{ y: -5 }}
        >
          <div className="flex flex-col bg-[#F7F7F7] rounded-lg">
            <img 
              decoding="auto" 
              loading="lazy" 
              width="4000" 
              height="2216"
              sizes="calc(max((min(min(100vw, 810px) - 64px, 810px) - 20px) / 2, 1px) - 32px)"
              srcSet="https://framerusercontent.com/images/HCkEwVWHcO0voDYrtskCSdReI.png?scale-down-to=512&width=4000&height=2216 512w,https://framerusercontent.com/images/HCkEwVWHcO0voDYrtskCSdReI.png?scale-down-to=1024&width=4000&height=2216 1024w,https://framerusercontent.com/images/HCkEwVWHcO0voDYrtskCSdReI.png?scale-down-to=2048&width=4000&height=2216 2048w,https://framerusercontent.com/images/HCkEwVWHcO0voDYrtskCSdReI.png?width=4000&height=2216 4000w"
              src="https://framerusercontent.com/images/HCkEwVWHcO0voDYrtskCSdReI.png?width=4000&height=2216"
              alt="Integration performance stats for Nuvio, Klyra, and Veltix with percentage changes."
              style={{display: 'block', width: '100%', height: '100%', borderRadius: 'inherit', objectPosition: 'center center', objectFit: 'cover'}}
            />
          </div>
          <div className="flex flex-col w-5/6 pl-2">
            <div className="text-[22px] font-semibold text-black">Product Usage Tracking</div>
            <div className="text-[16px] text-[#575757] font-medium leading-[1.4em] tracking-[-0.03em] font-[Geist,sans-serif] not-italic">Track how users engage with your app live to uncover patterns and optimize features.</div>
          </div>
        </motion.div>

        <motion.div 
          className="flex flex-col gap-4 bg-white rounded-3xl p-4 w-full"
          initial={{ x: 50, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1.2, duration: 0.6 }}
          whileHover={{ y: -5 }}
        >
          <div className="flex flex-col bg-[#F7F7F7] rounded-lg">
            <img 
              decoding="auto" 
              loading="lazy" 
              width="6000" 
              height="3325"
              sizes="calc(max((min(min(100vw, 810px) - 64px, 810px) - 20px) / 2, 1px) - 32px)"
              srcSet="https://framerusercontent.com/images/ukxSF4evyjJNRAA1AxD2RgCC4ds.png?scale-down-to=512&width=6000&height=3325 512w,https://framerusercontent.com/images/ukxSF4evyjJNRAA1AxD2RgCC4ds.png?scale-down-to=1024&width=6000&height=3325 1024w,https://framerusercontent.com/images/ukxSF4evyjJNRAA1AxD2RgCC4ds.png?scale-down-to=2048&width=6000&height=3325 2048w,https://framerusercontent.com/images/ukxSF4evyjJNRAA1AxD2RgCC4ds.png?scale-down-to=4096&width=6000&height=3325 4096w,https://framerusercontent.com/images/ukxSF4evyjJNRAA1AxD2RgCC4ds.png?width=6000&height=3325 6000w"
              src="https://framerusercontent.com/images/ukxSF4evyjJNRAA1AxD2RgCC4ds.png?width=6000&height=3325"
              alt="Retention graph with user return notifications for analyzing feature effectiveness."
              style={{display: 'block', width: '100%', height: '100%', borderRadius: 'inherit', objectPosition: 'center center', objectFit: 'cover'}}
            />
          </div>
          <div className="flex flex-col pl-2">
            <div className="text-[22px] font-semibold text-black">Feature Impact Analysis</div>
            <div className="text-[16px] text-[#575757] w-4/5 font-medium leading-[1.4em] tracking-[-0.03em] font-[Geist,sans-serif] not-italic">Know exactly which features drive long-term retention—and which ones don't contribute.</div>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
};

export default Features;