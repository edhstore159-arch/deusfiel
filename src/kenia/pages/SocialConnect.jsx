import React from "react";
import SocialConnections from "@/kenia/components/SocialConnections";
import { Share2 } from "lucide-react";

export default function SocialConnect() {
  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-6">
        <h1 className="text-2xl font-serif font-bold text-gold-100 flex items-center gap-2">
          <Share2 className="w-6 h-6 text-gold-400" />
          Conectar Redes Sociais
        </h1>
        <p className="text-sm text-nude-400 mt-1">
          Conecte cada conta para liberar o agendamento automático dos posts (fusão e criativos).
        </p>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto">
          <SocialConnections />
        </div>
      </div>
    </div>
  );
}
