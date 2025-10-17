"use client";

import React from "react";
import { motion } from "framer-motion";

const Benefits = () => {
  return (
    <motion.section 
      id="benefits"
      className="relative flex flex-col items-center w-full gap-3 pb-[170px] pt-[80px] overflow-hidden mt-[15px] md:mt-[15px] lg:mt-[50px] p-2 max-w-[390px] md:max-w-[810px] lg:max-w-[1200px] mx-auto"
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
          <p className="text-[14px] font-medium text-[#126dfb] ml-2">Benefits</p>
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
              Benefits That Truly Matter to You
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
              Monitor metrics as they happen, so you can respond quickly and keep your goals on track.
            </div>
          </motion.div>
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-10">
        <div className="flex flex-col md:flex-row gap-5 w-full">
          <motion.div 
            className="flex flex-col gap-8 bg-white rounded-[20px] py-5 px-4 w-full"
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6, duration: 0.6 }}
            whileHover={{ y: -5 }}
          >
            <div className="bg-[#E1EAF8] shadow-lg w-10 rounded-md p-1">
              <svg className="w-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" focusable="false" color="rgb(18, 109, 251)" style={{userSelect: 'none', display: 'inline-block', fill: 'rgb(18, 109, 251)', color: 'rgb(18, 109, 251)', flexShrink: 0}}>
                <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm56,112H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48a8,8,0,0,1,0,16Z"></path>
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="text-[22px] font-semibold text-black">Real-Time Tracking</div>
              <p className="text-[16px] text-[#575757] font-medium leading-[1.4em] tracking-[-0.03em] font-[Geist,sans-serif] not-italic">Monitor user activity instantly for smarter decision-making.</p>
            </div>
          </motion.div>

          <motion.div 
            className="flex flex-col gap-8 bg-white rounded-[20px] py-5 px-4 w-full"
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8, duration: 0.6 }}
            whileHover={{ y: -5 }}
          >
            <div className="bg-[#E1EAF8] shadow-lg w-10 rounded-md p-1">
              <svg className="w-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" focusable="false" color="rgb(18, 109, 251)" style={{userSelect: 'none', display: 'inline-block', fill: 'rgb(18, 109, 251)', color: 'rgb(18, 109, 251)', flexShrink: 0}}>
                <path d="M192,24H64A24,24,0,0,0,40,48V208a24,24,0,0,0,24,24H192a24,24,0,0,0,24-24V48A24,24,0,0,0,192,24ZM64,40H192a8,8,0,0,1,8,8v8H56V48A8,8,0,0,1,64,40ZM192,216H64a8,8,0,0,1-8-8v-8H200v8A8,8,0,0,1,192,216Z"></path>
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="text-[22px] font-semibold text-black">All-in-One View</div>
              <p className="text-[16px] text-[#575757] font-medium leading-[1.4em] tracking-[-0.03em] font-[Geist,sans-serif] not-italic">Keep all your analytics in one place, without jumping between tools.</p>
            </div>
          </motion.div>

          <motion.div 
            className="flex flex-col gap-8 bg-white rounded-[20px] py-5 px-4 w-full"
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 1, duration: 0.6 }}
            whileHover={{ y: -5 }}
          >
            <div className="bg-[#E1EAF8] shadow-lg w-10 rounded-md p-1">
              <svg className="w-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" focusable="false" color="rgb(18, 109, 251)" style={{userSelect: 'none', display: 'inline-block', fill: 'rgb(18, 109, 251)', color: 'rgb(18, 109, 251)', flexShrink: 0}}>
                <path d="M240,136v32a8,8,0,0,1-8,8,7.61,7.61,0,0,1-1.57-.16L156,161v23.73l17.66,17.65A8,8,0,0,1,176,208v24a8,8,0,0,1-11,7.43l-37-14.81L91,239.43A8,8,0,0,1,80,232V208a8,8,0,0,1,2.34-5.66L100,184.69V161L25.57,175.84A7.61,7.61,0,0,1,24,176a8,8,0,0,1-8-8V136a8,8,0,0,1,4.42-7.16L100,89.06V44a28,28,0,0,1,56,0V89.06l79.58,39.78A8,8,0,0,1,240,136Z"></path>
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="text-[22px] font-semibold text-black">Actionable Insights</div>
              <p className="text-[16px] text-[#575757] font-medium leading-[1.4em] tracking-[-0.03em] font-[Geist,sans-serif] not-italic">Track the metrics that matter most for sustainable business growth.</p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex flex-col md:flex-row gap-5">
          <motion.div 
            className="flex flex-col gap-8 bg-white rounded-[20px] py-5 px-4 w-full"
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 1.2, duration: 0.6 }}
            whileHover={{ y: -5 }}
          >
            <div className="bg-[#E1EAF8] shadow-lg w-10 rounded-md p-1">
              <svg className="w-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" focusable="false" color="rgb(18, 109, 251)" style={{userSelect: 'none', display: 'inline-block', fill: 'rgb(18, 109, 251)', color: 'rgb(18, 109, 251)', flexShrink: 0}}>
                <path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80Zm-80,84a12,12,0,1,1,12-12A12,12,0,0,1,128,164Zm32-84H96V56a32,32,0,0,1,64,0Z"></path>
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="text-[22px] font-semibold text-black">Secure Data</div>
              <p className="text-[16px] text-[#575757] font-medium leading-[1.4em] tracking-[-0.03em] font-[Geist,sans-serif] not-italic">Keep your analytics safe with advanced security and strong encryption.</p>
            </div>
          </motion.div>

          <motion.div 
            className="flex flex-col gap-8 bg-white rounded-[20px] py-5 px-4 w-full"
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 1.4, duration: 0.6 }}
            whileHover={{ y: -5 }}
          >
            <div className="bg-[#E1EAF8] shadow-lg w-10 rounded-md p-1">
              <svg className="w-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" focusable="false" color="rgb(18, 109, 251)" style={{userSelect: 'none', display: 'inline-block', fill: 'rgb(18, 109, 251)', color: 'rgb(18, 109, 251)', flexShrink: 0}}>
                <path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM112,184a8,8,0,0,1-16,0V132.94l-4.42,2.22a8,8,0,0,1-7.16-14.32l16-8A8,8,0,0,1,112,120Zm56-8a8,8,0,0,1,0,16H136a8,8,0,0,1-6.4-12.8l28.78-38.37A8,8,0,1,0,145.07,132a8,8,0,1,1-13.85-8A24,24,0,0,1,176,136a23.76,23.76,0,0,1-4.84,14.45L152,176ZM48,80V48H72v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80Z"></path>
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="text-[22px] font-semibold text-black">Custom Reports</div>
              <p className="text-[16px] text-[#575757] font-medium leading-[1.4em] tracking-[-0.03em] font-[Geist,sans-serif] not-italic">Create tailored reports that fit your needs and highlight key insights.</p>
            </div>
          </motion.div>

          <motion.div 
            className="flex flex-col gap-8 bg-white rounded-[20px] py-5 px-4 w-full"
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 1.6, duration: 0.6 }}
            whileHover={{ y: -5 }}
          >
            <div className="bg-[#E1EAF8] shadow-lg w-10 rounded-md p-1">
              <svg className="w-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" focusable="false" color="rgb(18, 109, 251)" style={{userSelect: 'none', display: 'inline-block', fill: 'rgb(18, 109, 251)', color: 'rgb(18, 109, 251)', flexShrink: 0}}>
                <path d="M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM184,160H72a8,8,0,0,1,0-16H184a8,8,0,0,1,0,16Zm0-48H72a8,8,0,0,1,0-16H184a8,8,0,0,1,0,16Z"></path>
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="text-[22px] font-semibold text-black">Simple to Use</div>
              <div className="text-[16px] text-[#575757]">Navigate easily—no steep learning curve, start making better decisions quickly.</div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
};

export default Benefits;