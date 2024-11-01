// components/trade-history.tsx
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface Trade {
  id: string;
  symbol: string;
  type: "buy" | "sell";
  amount: number;
  price: number;
  value: number;
  timestamp: number;
  pnl?: number;
  pnlPercent?: number;
}

interface TradeHistoryProps {
  trades: Trade[];
}

export function TradeHistory({ trades }: TradeHistoryProps) {
  return (
    <Card className="p-4 bg-slate-900">
      <h3 className="text-lg font-bold text-white mb-4">Trade History</h3>
      <ScrollArea className="h-[300px] pr-4">
        <div className="space-y-2">
          {trades.map((trade) => (
            <div
              key={trade.id}
              className="flex items-center justify-between p-2 bg-slate-800 rounded-lg"
            >
              <div className="flex items-center gap-2">
                {trade.type === "buy" ? (
                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-500" />
                )}
                <div>
                  <p className="font-medium text-white">{trade.symbol}</p>
                  <p className="text-sm text-slate-400">
                    {new Date(trade.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-white">
                  ${trade.value.toFixed(2)}
                </p>
                {trade.pnl !== undefined && (
                  <p
                    className={`text-sm ${
                      trade.pnl >= 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {trade.pnl >= 0 ? "+" : ""}
                    {trade.pnl.toFixed(2)} ({trade.pnlPercent?.toFixed(2)}%)
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
