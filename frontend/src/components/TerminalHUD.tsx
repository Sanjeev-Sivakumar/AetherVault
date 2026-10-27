"use client";

import React, { useState, useEffect, useRef } from "react";
import { Terminal, X, Minimize2, Maximize2, Shield, Database, Play, CheckCircle2 } from "lucide-react";

export interface LogEntry {
  id: string;
  timestamp: string;
  command: string;
  output: string;
  status?: "SUCCESS" | "WARN" | "INFO";
}

declare global {
  interface Window {
    logTerminal?: (cmd: string, out: string, status?: "SUCCESS" | "WARN" | "INFO") => void;
    toggleTerminal?: (open?: boolean) => void;
  }
}

export default function TerminalHUD() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: "1",
      timestamp: "12:00:01",
      command: "sqlite3 aethervault.db \"PRAGMA integrity_check; PRAGMA foreign_keys = ON;\"",
      output: "ok\nforeign_keys: 1 (Cryptographic WAL mode enabled)",
      status: "SUCCESS"
    },
    {
      id: "2",
      timestamp: "12:00:02",
      command: "sqlite3 aethervault.db \"SELECT count(*) FROM audit_logs;\"",
      output: "1042 blocks anchored | Merkle Root: 8f434346648f6b96df89dda901c5176b",
      status: "INFO"
    }
  ]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.logTerminal = (cmd: string, out: string, status = "SUCCESS") => {
      const now = new Date();
      const ts = now.toTimeString().split(" ")[0];
      setLogs((prev) => [
        ...prev,
        {
          id: String(Date.now() + Math.random()),
          timestamp: ts,
          command: cmd,
          output: out,
          status
        }
      ]);
    };

    window.toggleTerminal = (open?: boolean) => {
      setIsOpen((prev) => (open !== undefined ? open : !prev));
    };

    return () => {
      delete window.logTerminal;
      delete window.toggleTerminal;
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isOpen]);

  return (
    <>
      {/* Floating Toggle Button */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
        <button
          id="toggle-terminal-btn"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 rounded-full bg-slate-900/90 hover:bg-slate-950 px-4 py-2 text-xs font-mono font-medium text-emerald-400 shadow-xl border border-slate-700/80 backdrop-blur-md transition-all cursor-pointer hover:scale-105"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Terminal className="h-3.5 w-3.5 text-emerald-400" />
          <span>CMD: aethervault.db</span>
        </button>
      </div>

      {/* Terminal Drawer / Window */}
      {isOpen && (
        <div
          id="terminal-hud-window"
          className="fixed bottom-16 right-4 z-50 w-[580px] max-w-[94vw] h-[340px] rounded-2xl bg-slate-950/95 border border-slate-800 shadow-2xl backdrop-blur-xl flex flex-col font-mono text-xs overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 select-none">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80"></span>
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80"></span>
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80"></span>
              </div>
              <span className="text-[11px] text-slate-400 font-semibold ml-2">
                AICTE Terminal Engine — PowerShell (SQLite3 Fabric)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLogs([])}
                className="text-[10px] text-slate-500 hover:text-slate-300 px-2 py-0.5 rounded bg-slate-800/60"
              >
                Clear
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body Log Content */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 text-[11px] leading-relaxed text-slate-300">
            <div className="text-slate-500 text-[10px]">
              Microsoft Windows [Version 10.0.22631.4317]
              <br />
              (c) AICTE Security Deposit Subsystem. All rights reserved.
            </div>

            {logs.map((log) => (
              <div key={log.id} className="space-y-0.5">
                <div className="flex items-start gap-1.5 text-emerald-400">
                  <span className="text-slate-500 text-[10px]">[{log.timestamp}]</span>
                  <span className="text-sky-400 font-bold">PS D:\Projects\SIH&gt;</span>
                  <span className="text-white font-semibold">{log.command}</span>
                </div>
                <div
                  className={`pl-5 font-mono text-[10px] whitespace-pre-wrap ${
                    log.status === "WARN"
                      ? "text-amber-400"
                      : log.status === "INFO"
                      ? "text-sky-300"
                      : "text-emerald-400/90"
                  }`}
                >
                  {log.output}
                </div>
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>

          {/* Footer Info */}
          <div className="px-3.5 py-1.5 bg-slate-900/60 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <div className="flex items-center gap-2">
              <Database className="h-3 w-3 text-emerald-400" />
              <span>aethervault.db (WAL 3.4 MB)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-emerald-400">● 100% Synced</span>
              <span>Port: 8000 | n8n: 5678</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
