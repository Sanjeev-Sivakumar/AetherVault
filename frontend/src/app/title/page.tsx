"use client";

import React from "react";

export default function TitleSlidePage() {
  return (
    <div className="min-h-screen w-screen bg-white flex flex-col items-center justify-center p-8 select-none font-sans text-slate-900 antialiased overflow-hidden">
      <div className="max-w-5xl w-full flex flex-col items-center text-center space-y-7 animate-in fade-in duration-500">
        
        {/* Top Centered Coral / Orange Dot */}
        <div className="flex items-center justify-center mb-1">
          <span className="h-4 w-4 rounded-full bg-[#ff5722] shadow-md shadow-[#ff5722]/50 animate-pulse" />
        </div>

        {/* Editorial Serif Main Title & Italic Subtitle */}
        <div className="space-y-1">
          <h1
            className="text-6xl md:text-7xl tracking-tight text-slate-950 font-semibold"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            AetherVault Ledger
          </h1>
          <h2
            className="text-5xl md:text-6xl text-emerald-950 tracking-tight italic font-medium"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            The Autonomous AICTE Escrow & Deposit Oracle
          </h2>
        </div>

        {/* Concise Mission Subtitle */}
        <p className="max-w-3xl text-base md:text-lg text-slate-700 font-normal leading-relaxed">
          Eliminating regulatory collateral fraud by anchoring immutable cryptographic trust directly into technical institute banking infrastructure.
        </p>

        {/* Horizontal Feature Pill Tags */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-xs md:text-sm font-medium text-slate-800 shadow-xs">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
            <span>Zero-Touch OCR Forensics</span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-xs md:text-sm font-medium text-slate-800 shadow-xs">
            <span className="h-2.5 w-2.5 rounded-full bg-teal-600" />
            <span>10-Yr Regulatory Lock-in Guard</span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-xs md:text-sm font-medium text-slate-800 shadow-xs">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-600" />
            <span>3-Way SFMS & CBS Bridge</span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-xs md:text-sm font-medium text-slate-800 shadow-xs">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-600" />
            <span>Self-Healing SHA-256 Ledger</span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-xs md:text-sm font-medium text-slate-800 shadow-xs">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span>Port 5678 n8n Orchestrator</span>
          </div>
        </div>

        {/* Footer Regulatory Micro Badge */}
        <div className="pt-6 text-xs uppercase tracking-widest text-slate-500 font-semibold">
          All India Council for Technical Education • Smart India Hackathon 2026
        </div>
      </div>
    </div>
  );
}
