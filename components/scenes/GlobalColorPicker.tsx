"use client";

import { useState } from "react";
import { HexColorPicker } from "react-colorful";
import { Palette, X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDevices, useLampCommand } from "@/hooks/useHomeapp";
import { useToast } from "@/components/ui/Toast";
import { hexToRgb } from "@/lib/utils";

export function GlobalColorPicker() {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState("#ff8800");
  const { data: devices = [] } = useDevices();
  const { mutate: sendCommand } = useLampCommand();
  const { success } = useToast();

  const apply = () => {
    const { r, g, b } = hexToRgb(hex);
    devices.forEach((d) => sendCommand({ id: d.id, cmd: { r, g, b, on: true } }));
    success("Kleur toegepast op alle lampen");
    setOpen(false);
  };

  return (
    <div className="relative">
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-slate-300 text-xs font-medium hover:bg-white/10 transition-colors"
      >
        <Palette size={13} />
        <span className="hidden sm:inline">Alles dezelfde kleur</span>
        <div
          className="w-3 h-3 rounded-full border border-white/20"
          style={{ background: hex }}
        />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50 glass rounded-2xl p-4 shadow-2xl w-56"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-300">Alles dezelfde kleur</p>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X size={13} />
              </button>
            </div>
            <HexColorPicker color={hex} onChange={setHex} style={{ width: "100%", height: 130 }} />
            <div
              className="w-full h-6 rounded-lg mt-2 border border-white/10"
              style={{ background: hex, transition: "background 0.1s" }}
            />
            <p className="text-center text-[10px] font-mono text-slate-500 mt-1">{hex.toUpperCase()}</p>
            <button
              onClick={apply}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-medium hover:bg-amber-500/25 transition-colors"
            >
              <Send size={12} />
              Toepassen op {devices.length} lampen
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
