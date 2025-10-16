"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const Hero = () => {
  const sectionRef = useRef(null);
  const imageRef = useRef(null);

  // Track scroll progress within this Hero section
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  // Tilt backward (27°) -> flat (0°)
  const rotateX = useTransform(scrollYProgress, [0, 1], [27, 0]);

  return (
    <motion.section
      ref={sectionRef}
      className="relative flex flex-col items-center w-full gap-3 pb-[170px] pt-[80px] overflow-hidden mt-[15px] md:mt-[15px] lg:mt-[50px] p-2"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {/* Floating social icons (hidden on small screens) */}
      <div className="hidden md:block">
        {[
          {
            src: "https://upload.wikimedia.org/wikipedia/commons/0/05/Facebook_Logo_%282019%29.png",
            alt: "Facebook",
            className: "top-[60px] left-[120px]",
            rotate: "-8deg",
            delay: 0,
          },
          {
            src: "https://upload.wikimedia.org/wikipedia/commons/6/6f/Logo_of_Twitter.svg",
            alt: "Twitter",
            className: "top-[80px] right-[180px]",
            rotate: "6deg",
            delay: 0.8,
          },
          {
            src: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png",
            alt: "Instagram",
            className: "top-[180px] left-[70px]",
            rotate: "-12deg",
            delay: 1.5,
          },
          {
            src: "https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png",
            alt: "LinkedIn",
            className: "top-[200px] right-[80px]",
            rotate: "10deg",
            delay: 2.2,
          },
        ].map((icon, i) => (
          <motion.img
            key={i}
            src={icon.src}
            alt={icon.alt}
            className={`absolute ${icon.className} w-14 h-14 rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.1)] bg-white p-3`}
            style={{ transform: `rotate(${icon.rotate})` }}
            animate={{
              y: [0, -15, 0],
              transition: {
                duration: 3,
                ease: [0.42, 0, 0.58, 1],
                repeat: Infinity,
                delay: icon.delay,
              },
            }}
          />
        ))}
      </div>

      {/* Header content */}
      <motion.div
        className="flex bg-[#E1EAF8] w-max border border-[#126dfb] rounded-full py-1 px-2 items-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        {["XreXVnshxtY9J8ZoG3rjAuTzW8E", "IvVTxoC9vqr4NcKyfF6JMWEc", "UrClpHTqxXZbq1FAa6sJ9BzS1uk"].map((id, i) => (
          <div key={i} className={`w-[22px] h-[22px] ${i > 0 ? "-ml-[4px]" : ""} rounded-full overflow-hidden`}>
            <img
              src={`https://framerusercontent.com/images/${id}.png`}
              className="w-full h-full object-cover"
              alt={`Profile ${i + 1}`}
            />
          </div>
        ))}
        <p className="text-[12px] font-medium text-[#126dfb] ml-2">Trusted by 1M+ users</p>
      </motion.div>

      {/* Title */}
      <motion.div
        className="w-3/5"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.8 }}
      >
        <div
          className="
            text-black
            text-center
            font-bold
            capitalize
            [letter-spacing:-0.03em]
            leading-[1em]
            text-[34px]
            md:text-[56px]
            xl:text-[60px]
            font-['Geist',sans-serif]
          "
        >
          Turn Scattered Data Into Smart Decisions
        </div>
      </motion.div>

      {/* Subtitle */}
      <motion.div
        className="max-[809.98px]:max-w-[300px]"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
      >
        <div
          className="text-center w-full text-[#575757] text-[16px] font-medium leading-[1.4em] tracking-[-0.03em] font-[Geist,sans-serif] not-italic"
        >
          One simple dashboard to track your SaaS growth, MRR, churn and user behavior—without the chaos.
        </div>

      </motion.div>

      {/* CTA Button */}
      <motion.div
        className="bg-[#126DFB] rounded-lg px-4 py-3 cursor-pointer"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <p className="text-white text-[14px]">Get Started For Free</p>
      </motion.div>

      {/* Credit note */}
      <motion.div
        className="flex relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
      >
        <svg className="w-5 text-[#126DFB]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor">
          <path d="M224 48H32a16 16 0 0 0-16 16v128a16 16 0 0 0 16 16h192a16 16 0 0 0 16-16V64a16 16 0 0 0-16-16Zm-88 128h-16a8 8 0 0 1 0-16h16a8 8 0 0 1 0 16Zm64 0h-32a8 8 0 0 1 0-16h32a8 8 0 0 1 0 16ZM32 88V64h192V88Z" />
        </svg>
        <p className="text-black text-[12px]">No credit card required</p>
      </motion.div>

      {/* ✅ Scroll-animated 3D Image */}
      <div
        ref={imageRef}
        className="relative w-full flex justify-center"
        style={{
          perspective: "1000px", // perspective only on parent
        }}
      >
        <motion.img
          decoding="auto"
          width="2043"
          height="1328"
          src="https://framerusercontent.com/images/ZQIj3Thxxza6gmZ33yEqfh0ew.png?width=2043&height=1328"
          alt="Business dashboard showing revenue, deals, customer list, growth chart, and new activity."
          className="block w-4/5 h-auto rounded-2xl"
          style={{
            transformStyle: "preserve-3d",
            transformOrigin: "center bottom",
            rotateX,
            boxShadow: "0 30px 50px rgba(0, 0, 0, 0.35)",
            willChange: "transform",
          }}
        />
      </div>

      {/* Brand slider */}
      <motion.div
        className="flex flex-col items-center w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
      >
        <h5 className="text-black text-[16px] font-semibold tracking-tight text-center w-full mt-5">
          Blindly trusted by
        </h5>

        <div
          className="relative w-full flex justify-center overflow-hidden mt-3 md:max-w-[50%]"
          style={{ minHeight: 78 }}
        >
          <motion.div
            className="flex gap-10 items-center"
            style={{ width: "max-content" }}
            initial={{ x: 0 }}
            animate={{ x: ["0%", "-50%"] }}
            transition={{
              repeat: Infinity,
              repeatType: "loop",
              duration: 18,
              ease: "linear",
            }}
          >
            {(() => {
              const logos = [
                {
                  key: "google",
                  src: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg",
                  alt: "Google",
                },
                {
                  key: "meta",
                  src: "https://upload.wikimedia.org/wikipedia/commons/0/05/Facebook_Logo_%282019%29.png",
                  alt: "Meta",
                },
                {
                  key: "amazon",
                  src: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
                  alt: "Amazon",
                },
                {
                  key: "stripe",
                  src: "https://upload.wikimedia.org/wikipedia/commons/4/4e/Stripe_Logo%2C_revised_2016.svg",
                  alt: "Stripe",
                },
                {
                  key: "shopify",
                  src: "https://upload.wikimedia.org/wikipedia/commons/3/3c/Shopify_logo_2018.svg",
                  alt: "Shopify",
                },
              ];
              const partners = [...logos, ...logos];
              return (
                <>
                  {partners.map((logo, idx) => (
                    <img
                      key={`${logo.key}-${idx}`}
                      src={logo.src}
                      alt={logo.alt}
                      className="h-8 grayscale opacity-80 select-none transition-opacity duration-700"
                      style={{ objectFit: "contain", minWidth: 80 }}
                      draggable={false}
                    />
                  ))}
                </>
              );
            })()}
          </motion.div>
        </div>
      </motion.div>
    </motion.section>
  );
};

export default Hero;
