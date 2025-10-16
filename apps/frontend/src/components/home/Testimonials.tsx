"use client";

import React from "react";
import { motion } from "framer-motion";

const Testimonials = () => {
  const testimonials = [
    {
      name: "Marcus Lee",
      text: "Alytics transformed how we understand our users. The insights are crystal clear and actionable.",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face"
    },
    {
      name: "Sarah Bond",
      text: "Finally, a platform that makes analytics accessible to everyone on our team. Game changer!",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face"
    },
    {
      name: "Carter June",
      text: "The AI recommendations helped us increase our retention by 40% in just two months.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
    },
    {
      name: "Emma Wilson",
      text: "Clean interface, powerful features. Our team adopted it instantly without any training.",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face"
    },
    {
      name: "David Chen",
      text: "Real-time tracking gives us the edge we needed to stay ahead of the competition.",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face"
    }
  ];

  return (
    <motion.section 
    className="relative flex flex-col items-center w-full gap-3 pb-[170px] overflow-hidden mt-[15px] md:mt-[15px] lg:mt-[50px] p-2 max-w-[390px] md:max-w-[810px] lg:max-w-[1200px] mx-auto"
    initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.3 }}
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
          <p className="text-[14px] font-medium text-[#126dfb]">Testimonials</p>
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
              Hear What Others Say About Us
            </div>
          </motion.div>
          
          {/* Testimonials Cards */}
          <motion.div 
            className="w-full mt-12"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            <div className="relative overflow-hidden">
              <motion.div 
                className="flex gap-6 pb-4"
                animate={{
                  x: [0, -1000],
                }}
                transition={{
                  repeat: Infinity,
                  repeatType: "loop",
                  duration: 30,
                  ease: "linear",
                }}
              >
                {/* First set of testimonials */}
                {testimonials.map((testimonial, index) => (
                  <div key={`first-${index}`} className="flex-shrink-0 w-80 bg-white rounded-xl p-6 shadow-lg">
                    <div className="flex items-start gap-4">
                      <div className="text-4xl text-gray-300 font-bold">"</div>
                      <div className="flex-1">
                        <div className="text-gray-600 text-sm leading-relaxed mb-4">
                          {testimonial.text}
                        </div>
                        <div className="flex items-center gap-3">
                          <img 
                            src={testimonial.avatar} 
                            alt={testimonial.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{testimonial.name}</div>
                            <div className="flex gap-1">
                              {[...Array(5)].map((_, i) => (
                                <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Duplicate set for seamless loop */}
                {testimonials.map((testimonial, index) => (
                  <div key={`second-${index}`} className="flex-shrink-0 w-80 bg-white rounded-xl p-6 shadow-lg">
                    <div className="flex items-start gap-4">
                      <div className="text-4xl text-gray-300 font-bold">"</div>
                      <div className="flex-1">
                        <div className="text-gray-600 text-sm leading-relaxed mb-4">
                          {testimonial.text}
                        </div>
                        <div className="flex items-center gap-3">
                          <img 
                            src={testimonial.avatar} 
                            alt={testimonial.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{testimonial.name}</div>
                            <div className="flex gap-1">
                              {[...Array(5)].map((_, i) => (
                                <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
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
              See what top teams say after switching to a smarter product analytics platform.
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
};

export default Testimonials;
