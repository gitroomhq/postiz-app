"use client";

import React from "react";
import { motion } from "framer-motion";

const Subscribe = () => {
  return (
    <motion.section 
      className="relative flex flex-col items-center w-full gap-3 pb-[170px] overflow-hidden mt-[15px] md:mt-[15px] lg:mt-[50px] p-2 max-w-[390px] md:max-w-[810px] lg:max-w-[1200px] mx-auto"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8 }}
    >
      <motion.div 
        className="relative flex bg-white rounded-md w-full"
        initial={{ y: 50, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <div className="w-full">
          <img 
            className="rotate-180" 
            decoding="auto" 
            loading="lazy" 
            width="608" 
            height="386" 
            sizes="442px"
            srcSet="https://framerusercontent.com/images/OmGZB6Q2bVw2OL3RXRH55t39LWg.png?scale-down-to=512&width=558&height=386 512w,https://framerusercontent.com/images/OmGZB6Q2bVw2OL3RXRH55t39LWg.png?width=558&height=386 558w"
            src="https://framerusercontent.com/images/OmGZB6Q2bVw2OL3RXRH55t39LWg.png?width=558&height=386"
            alt=""
            style={{display: 'block', width: '100%', height: '100%', borderRadius: 'inherit', objectPosition: 'center', objectFit: 'cover'}}
          />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-black text-center w-full mt-[90px]">
          Subscribe To The Alytics Newsletter!
        </h2>
        <div className="absolute right-0 bottom-[1px] w-full">
          <img 
            className="rotate" 
            decoding="auto" 
            loading="lazy" 
            width="608" 
            height="386" 
            sizes="442px"
            srcSet="https://framerusercontent.com/images/OmGZB6Q2bVw2OL3RXRH55t39LWg.png?scale-down-to=512&width=558&height=386 512w,https://framerusercontent.com/images/OmGZB6Q2bVw2OL3RXRH55t39LWg.png?width=558&height=386 558w"
            src="https://framerusercontent.com/images/OmGZB6Q2bVw2OL3RXRH55t39LWg.png?width=558&height=386"
            alt=""
            style={{display: 'block', width: '100%', height: '100%', borderRadius: 'inherit', objectPosition: 'center', objectFit: 'cover'}}
          />
        </div>
      </motion.div>
    </motion.section>
  );
};

export default Subscribe;
