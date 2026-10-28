"use client";

import React from "react";
import { FileCheck2, Download, Eye, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function SampleFDRView() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Sample FDR Generator
          </h1>
          <p className="text-xs font-medium text-slate-500">
            Synthetic Test Records
          </p>
        </div>
        <div className="flex space-x-2">
          <a
            href="/sample_synthetic_fdr.png"
            download
            className="flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
          >
            <span>Download PNG</span>
          </a>
          <a
            href="/sample_synthetic_fdr.pdf"
            download
            className="flex items-center rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 shadow-2xs"
          >
            <span>Download PDF</span>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Document Preview */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-sm font-bold text-slate-900 block mb-2">Live Watermarked Instrument Rendering</span>
          <div className="rounded-xl border border-slate-200 bg-slate-100 p-2 overflow-hidden flex items-center justify-center">
            <img
              src="/sample_synthetic_fdr.png"
              alt="Synthetic AICTE FDR"
              className="max-h-[500px] object-contain rounded-lg shadow-md"
            />
          </div>
        </div>

        {/* Quality Check Metrics Box */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">Computer Vision Quality Assessment</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Laplacian Blur Variance:</span>
              <span className="font-mono font-bold text-emerald-700">142.50 (&gt; 100 Sharp)</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Histogram Contrast:</span>
              <span className="font-mono font-bold text-emerald-700">78.00 (High Contrast)</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Resolution / DPI:</span>
              <span className="font-mono font-bold text-slate-800">300 DPI</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Lien Marking Check:</span>
              <span className="font-semibold text-emerald-700">CONFIRMED (AICTE)</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-slate-500">Overall Vision Status:</span>
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                EXCELLENT
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-[11px] text-blue-900">
            <strong>Multilingual Intelligence Note:</strong> Fixed Deposit Receipts can be uploaded in ANY language (English, Hindi, Tamil, Telugu, Marathi, Bengali, Gujarati, Kannada, Malayalam, etc.). The OCR engine automatically normalizes Indic/regional script numerals, extracts key terms, and translates regulatory parameters into the centralized ledger.
          </div>
        </div>
      </div>
    </div>
  );
}
