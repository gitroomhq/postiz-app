// app/page.tsx
"use client";

import React from "react";
import Head from "next/head";
import Header from "../../../components/home/Header";
import Hero from "../../../components/home/Hero";
import Features from "../../../components/home/Features";
import Benefits from "../../../components/home/Benefits";
import HowItWorks from "../../../components/home/HowItWorks";
import Integrations from "../../../components/home/Integrations";
import Testimonials from "../../../components/home/Testimonials";
import Pricing from "../../../components/home/Pricing";
import FAQ from "../../../components/home/FAQ";
import Subscribe from "../../../components/home/Subscribe";
import Footer from "../../../components/home/Footer";

export default function Page() {
  return (
    <>

      
      <div className="home-page-isolation bg-[#F8F8F8] flex flex-col items-center ">
        <Header />

        <main className="flex flex-col items-center w-full h-full  bg-[#F8F8F8] max-w-[1200px] ">
          <Hero />
          <Features />
          <Benefits />
          <HowItWorks />
          <Integrations />
          <Testimonials />
          <Pricing />
          <FAQ />
          <Subscribe />
        </main>

        <Footer />
      </div>
    </>
  )
}