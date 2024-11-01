// components/trading-card.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTokenData } from "@/hooks/use-token-data";
import { formatCurrency } from "@/lib/utils";
import { LineChart, Line, YAxis, ResponsiveContainer } from "recharts";
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown } from "lucide-react";
import type { DexScreenerPair } from "@/services/dexscreener-service";

interface PricePoint {
  timestamp: number;
  price: number;
}

interface TradingCardProps {
  address: string;
  onBuy: (amount: number) => void;
  onSell: (amount: number) => void;
  holdings: number;
  pnl: number;
  onPriceUpdate: (price: number) => void;
}

interface MarketStats {
  price: number;
  priceChange24h: number;
  marketCap: number;
  volume24h: number;
  liquidity: number;
}

export function TradingCard({
  address,
  onBuy,
  onSell,
  holdings,
  pnl,
  onPriceUpdate,
}: TradingCardProps) {
  const { tokenData, loading, error } = useTokenData(address);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [marketStats, setMarketStats] = useState<MarketStats>({
    price: 0,
    priceChange24h: 0,
    marketCap: 0,
    volume24h: 0,
    liquidity: 0,
  });

  const lastPrice = useRef<number>(0);
  const priceChangeDirection = useRef<"up" | "down" | null>(null);
  const lastUpdateTime = useRef<number>(0);

  const updateMarketStats = useCallback((data: DexScreenerPair) => {
    const newPrice = parseFloat(data.priceUsd);
    return {
      price: newPrice,
      priceChange24h: data.priceChange?.h24 ?? 0,
      marketCap: data.marketCap ?? 0,
      volume24h: data.volume?.h24 ?? 0,
      liquidity: data.liquidity?.usd ?? 0,
    };
  }, []);

  const handlePriceUpdate = useCallback(
    (newPrice: number) => {
      const now = Date.now();
      if (
        now - lastUpdateTime.current > 1000 &&
        newPrice !== lastPrice.current
      ) {
        lastUpdateTime.current = now;
        onPriceUpdate(newPrice);
      }
    },
    [onPriceUpdate]
  );

  useEffect(() => {
    if (tokenData && !loading) {
      const newPrice = parseFloat(tokenData.priceUsd);
      const newStats = updateMarketStats(tokenData);

      setMarketStats((prev) => {
        if (
          prev.price === newStats.price &&
          prev.priceChange24h === newStats.priceChange24h &&
          prev.marketCap === newStats.marketCap &&
          prev.volume24h === newStats.volume24h &&
          prev.liquidity === newStats.liquidity
        ) {
          return prev;
        }

        if (newPrice > lastPrice.current) {
          priceChangeDirection.current = "up";
        } else if (newPrice < lastPrice.current) {
          priceChangeDirection.current = "down";
        }
        lastPrice.current = newPrice;

        return newStats;
      });

      setPriceHistory((prev) => {
        const lastPoint = prev[prev.length - 1];
        if (lastPoint && lastPoint.price === newPrice) {
          return prev;
        }
        return [...prev, { timestamp: Date.now(), price: newPrice }].slice(-50);
      });

      handlePriceUpdate(newPrice);
    }
  }, [tokenData, loading, handlePriceUpdate, updateMarketStats]);

  if (loading) {
    return (
      <Card className="p-4 bg-slate-900">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-800 rounded w-3/4" />
          <div className="h-4 bg-slate-800 rounded w-1/2" />
        </div>
      </Card>
    );
  }

  if (error || !tokenData) {
    return (
      <Card className="p-4 bg-slate-900">
        <div className="text-red-500">Error loading token data</div>
      </Card>
    );
  }

  const currentValue = holdings * marketStats.price;
  const pnlPercent = currentValue > 0 ? (pnl / (currentValue - pnl)) * 100 : 0;

  return (
    <Card className="p-4 bg-slate-900">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">
            {tokenData.baseToken.symbol}
          </h3>
          <p className="text-sm text-slate-400">
            Vol: {formatCurrency(marketStats.volume24h)}
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1">
            {priceChangeDirection.current === "up" && (
              <TrendingUp className="w-4 h-4 text-green-500" />
            )}
            {priceChangeDirection.current === "down" && (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
            <p className="text-lg font-bold text-white">
              {formatCurrency(marketStats.price, 6)}
            </p>
          </div>
          <p
            className={`text-sm ${
              marketStats.priceChange24h >= 0
                ? "text-green-500"
                : "text-red-500"
            }`}
          >
            {marketStats.priceChange24h >= 0 ? "+" : ""}
            {marketStats.priceChange24h.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="h-24 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={priceHistory}>
            <Line
              type="monotone"
              dataKey="price"
              stroke={marketStats.priceChange24h >= 0 ? "#22c55e" : "#ef4444"}
              dot={false}
              strokeWidth={1.5}
            />
            <YAxis domain={["auto", "auto"]} hide />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <p className="text-slate-400">Liquidity</p>
          <p className="text-white font-medium">
            {formatCurrency(marketStats.liquidity)}
          </p>
        </div>
        <div>
          <p className="text-slate-400">Market Cap</p>
          <p className="text-white font-medium">
            {formatCurrency(marketStats.marketCap)}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Button
            className="bg-green-500 hover:bg-green-600"
            onClick={() => onBuy(100)}
            disabled={loading}
          >
            <ArrowUp className="w-4 h-4 mr-1" /> Buy $100
          </Button>
          <Button
            className="bg-red-500 hover:bg-red-600"
            onClick={() => onSell(100)}
            disabled={loading || holdings === 0}
          >
            <ArrowDown className="w-4 h-4 mr-1" /> Sell $100
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            className="bg-green-500 hover:bg-green-600"
            onClick={() => onBuy(250)}
            disabled={loading}
          >
            <ArrowUp className="w-4 h-4 mr-1" /> Buy $250
          </Button>
          <Button
            className="bg-red-500 hover:bg-red-600"
            onClick={() => onSell(250)}
            disabled={loading || holdings === 0}
          >
            <ArrowDown className="w-4 h-4 mr-1" /> Sell $250
          </Button>
        </div>

        <div className="mt-4 space-y-2 bg-slate-800 p-3 rounded-lg">
          <div className="flex justify-between">
            <span className="text-slate-400">Holdings:</span>
            <span className="text-white">
              {holdings.toFixed(6)} {tokenData.baseToken.symbol}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Current Value:</span>
            <span className="text-white">{formatCurrency(currentValue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Total P/L:</span>
            <span
              className={`font-semibold ${
                pnl >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {formatCurrency(pnl)} ({pnl > 0 ? "+" : ""}
              {pnlPercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-500 text-right mt-2">
          Last update: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </Card>
  );
}
