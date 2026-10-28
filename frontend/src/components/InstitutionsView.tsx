"use client";

import React, { useState } from "react";
import {
  Building2,
  Search,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Layers,
  ShieldCheck,
  Building
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from "recharts";

interface InstitutionsViewProps {
  institutions: any[];
  userRole?: string;
}

export default function InstitutionsView({ institutions }: InstitutionsViewProps) {
  const [search, setSearch] = useState("");

  const filtered = institutions.filter(
    (inst) =>
      inst.name.toLowerCase().includes(search.toLowerCase()) ||
      inst.aicte_permanent_id.toLowerCase().includes(search.toLowerCase()) ||
      inst.state.toLowerCase().includes(search.toLowerCase())
  );

  // Dynamic Category Analytics
  const categoryMap: Record<string, number> = {};
  const stateMap: Record<string, number> = {};

  institutions.forEach((inst) => {
    const cat = inst.institution_type || "Engineering & Tech";
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;

    const st = inst.state || "Delhi";
    stateMap[st] = (stateMap[st] || 0) + 1;
  });

  const shortenCategory = (cat: string) => {
    if (cat.includes("Engineering") && cat.includes("Technology")) return "Engg & AI";
    if (cat.includes("Management")) return "MBA & Engg";
    if (cat.includes("Pharmacy")) return "Pharmacy";
    if (cat.includes("Polytechnic") || cat.includes("Diploma")) return "Polytechnic";
    if (cat.includes("Architecture")) return "Architecture";
    return cat.length > 12 ? cat.slice(0, 10) + "…" : cat;
  };

  const categoryChartData = Object.entries(categoryMap).map(([fullName, count]) => ({
    fullName,
    name: shortenCategory(fullName),
    count
  }));

  const stateChartData = Object.entries(stateMap).map(([name, count]) => ({
    name,
    count
  })).slice(0, 5);

  return (
    <div className="space-y-6 font-['Roboto',sans-serif]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Institutions Directory
          </h2>
          <p className="text-xs font-light text-slate-400 mt-0.5">
            {institutions.length} Accredited Campuses
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search AICTE ID, name, or state..."
            className="w-full rounded-full border border-slate-200/80 bg-white px-4 py-2 text-xs font-light text-slate-800 placeholder-slate-400 outline-none focus:border-slate-400 shadow-2xs transition-all"
          />
        </div>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Breakdown */}
        <div className="rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-slate-900">
              Category Distribution
            </h3>
            <p className="text-[11px] font-light text-slate-400">
              Approved faculties
            </p>
          </div>

          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" interval={0} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: "rgba(241, 245, 249, 0.7)" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 shadow-md text-xs font-normal">
                          <p className="text-[11px] font-medium text-slate-500 mb-1">{d.fullName || d.name}</p>
                          <div className="flex items-center space-x-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
                            <span className="text-xs text-slate-700">Institutions:</span>
                            <span className="font-mono text-xs font-semibold text-slate-900">{d.count}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* State Breakdown */}
        <div className="rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Geographic Presence & State Concentration
              </h3>
              <p className="text-[11px] font-light text-slate-400">
                Regional distribution of technical institutions across states
              </p>
            </div>
            <MapPin className="h-4 w-4 text-slate-400" />
          </div>

          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stateChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" interval={0} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: "rgba(241, 245, 249, 0.7)" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 shadow-md text-xs font-normal">
                          <p className="text-[11px] font-medium text-slate-500 mb-1">{d.name}</p>
                          <div className="flex items-center space-x-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-purple-500"></span>
                            <span className="text-xs text-slate-700">Campuses:</span>
                            <span className="font-mono text-xs font-semibold text-slate-900">{d.count}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Institution Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((inst) => (
          <div
            key={inst.id}
            className="flex flex-col justify-between rounded-[28px] border border-slate-100 bg-white p-5 shadow-xs hover:border-slate-300 transition-all group"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-normal text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/60">
                  {inst.aicte_permanent_id}
                </span>
                <span className="text-[10px] font-semibold text-slate-500">{inst.institution_type}</span>
              </div>
              <h3 className="mt-2 text-sm font-bold text-slate-900 leading-snug">{inst.name}</h3>
              <div className="mt-3 space-y-1.5 text-[11px] text-slate-500 font-light">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{inst.address || `${inst.district}, ${inst.state}`}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{inst.contact_email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>{inst.contact_phone}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-2.5 text-[10px] text-slate-400 flex justify-between font-light">
              <span>Nodal Officer:</span>
              <span className="font-normal text-slate-700">{inst.nodal_officer}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
