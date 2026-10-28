"use client";

import React, { useState, useEffect } from "react";
import { BellRing, Mail, MessageSquare, PhoneCall, CheckCircle2, Send, Save } from "lucide-react";
import { api } from "@/lib/api";

export default function RemindersView() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [testEmail, setTestEmail] = useState("sanjeevkumaredu8@gmail.com");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    api.getReminderConfigs().then((data) => setConfigs(data)).catch(console.error);
  }, []);

  const handleTestSmtp = async () => {
    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res = await api.testSMTP(testEmail);
      setTestResult(res);
    } catch (e: any) {
      alert("SMTP test failed: " + e.message);
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleToggleChannel = (index: number, channel: string) => {
    const updated = [...configs];
    updated[index][channel] = !updated[index][channel];
    setConfigs(updated);
  };

  const handleSaveConfigs = async () => {
    try {
      await api.updateReminderConfigs(configs);
      alert("Reminder alert schedule configuration saved successfully.");
    } catch (e: any) {
      alert("Failed to save configuration: " + e.message);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Alert Schedules
        </h1>
        <p className="text-xs font-medium text-slate-500">
          Automated Dispatch Rules
        </p>
      </div>

      {/* SMTP Live Test Box */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Live Transactional SMTP Dispatch</h2>
          <p className="text-[11px] text-slate-500 font-medium">Host: smtp.gmail.com:465</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="Enter recipient email..."
            className="w-full sm:w-80 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-blue-500"
          />
          <button
            onClick={handleTestSmtp}
            disabled={isSendingTest}
            className="flex items-center space-x-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-800 cursor-pointer disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{isSendingTest ? "Sending Live Email..." : "Send Test Alert Email"}</span>
          </button>
        </div>

        {testResult && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              Live SMTP test email dispatched successfully to <strong>{testResult.recipient}</strong> via {testResult.relay}.
            </span>
          </div>
        )}
      </div>

      {/* Advance Schedules Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Configurable Notification Schedule (Days Before Maturity)</h2>
            <p className="text-[11px] text-slate-500 font-medium">Enable or disable specific channels per reminder threshold</p>
          </div>
          <button
            onClick={handleSaveConfigs}
            className="flex items-center space-x-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-800 cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save & Apply Schedules</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-medium">
            <thead className="bg-slate-50 font-bold text-slate-700 text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Interval (Days Before)</th>
                <th className="py-2.5 px-3">SMTP Email</th>
                <th className="py-2.5 px-3">Meta WhatsApp Cloud</th>
                <th className="py-2.5 px-3">Twilio IVR Voice Call</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {configs.map((c, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-bold text-slate-900">
                    {c.days_before === 0 ? "Maturity Day (0 Days)" : `${c.days_before} Days in Advance`}
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="checkbox"
                      checked={c.channel_smtp}
                      onChange={() => handleToggleChannel(i, "channel_smtp")}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="ml-2 text-[11px]">Email Alert</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="checkbox"
                      checked={c.channel_whatsapp}
                      onChange={() => handleToggleChannel(i, "channel_whatsapp")}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="ml-2 text-[11px]">WhatsApp Notice</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="checkbox"
                      checked={c.channel_ivr}
                      onChange={() => handleToggleChannel(i, "channel_ivr")}
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                    <span className="ml-2 text-[11px]">IVR Voice Call</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      ACTIVE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
