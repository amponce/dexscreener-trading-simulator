"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Wallet, AlertCircle } from "lucide-react";

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface TokenData {
  id: string;
  address: string;
  symbol: string;
  name: string;
  priceUsd: string;
  candleHistory: CandleData[];
  holdings: number;
  volume: string;
}

// Custom Candlestick Chart Component
const CandlestickChart = ({ data }: { data: CandleData[] }) => {
  const chartHeight = 120;
  const chartWidth = 280;
  const candleWidth = 8;
  const padding = 20;

  // Calculate price range for scaling
  const minPrice = Math.min(...data.flatMap((d) => [d.low]));
  const maxPrice = Math.max(...data.flatMap((d) => [d.high]));
  const priceRange = maxPrice - minPrice;

  // Scale price to chart height
  const scalePrice = (price: number) => {
    return (
      chartHeight -
      (((price - minPrice) / priceRange) * (chartHeight - padding * 2) +
        padding)
    );
  };

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
    >
      {data.map((candle, i) => {
        const x = i * (candleWidth + 2) + padding;
        const isGreen = candle.close >= candle.open;
        const color = isGreen ? "#22c55e" : "#ef4444";

        const openY = scalePrice(candle.open);
        const closeY = scalePrice(candle.close);
        const highY = scalePrice(candle.high);
        const lowY = scalePrice(candle.low);

        return (
          <g key={i}>
            {/* Wick */}
            <line
              x1={x + candleWidth / 2}
              y1={highY}
              x2={x + candleWidth / 2}
              y2={lowY}
              stroke={color}
              strokeWidth="1"
            />
            {/* Body */}
            <rect
              x={x}
              y={Math.min(openY, closeY)}
              width={candleWidth}
              height={Math.max(1, Math.abs(closeY - openY))}
              fill={color}
            />
          </g>
        );
      })}
    </svg>
  );
};

// Main Trading Simulator Component
export function TradingSimulator() {
  const [balance, setBalance] = useState<number>(1000);
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [error, setError] = useState<string>("");
  const [newAddress, setNewAddress] = useState<string>("");

  // Generate mock candle data for testing
  const generateMockCandle = (basePrice: number) => {
    const variation = basePrice * 0.02; // 2% variation
    const open = basePrice + (Math.random() - 0.5) * variation;
    const close = basePrice + (Math.random() - 0.5) * variation;
    const high = Math.max(open, close) + Math.random() * variation;
    const low = Math.min(open, close) - Math.random() * variation;

    return {
      time: new Date().toLocaleTimeString(),
      open,
      high,
      low,
      close,
    };
  };

  const fetchTokenData = async (address: string) => {
    try {
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${address}`
      );
      const data = await response.json();

      if (data.pairs && data.pairs[0]) {
        const pair = data.pairs[0];
        const basePrice = parseFloat(pair.priceUsd);

        // Generate initial candle history
        const initialCandles = Array.from({ length: 20 }, () =>
          generateMockCandle(basePrice)
        );

        return {
          id: Math.random().toString(36).substr(2, 9),
          address,
          symbol: pair.baseToken.symbol,
          name: pair.baseToken.name,
          priceUsd: pair.priceUsd,
          candleHistory: initialCandles,
          holdings: 0,
          volume: pair.volume?.h24 || "0",
        };
      }
      throw new Error("Token not found");
    } catch (err) {
      throw new Error("Failed to fetch token data");
    }
  };

  const updatePrices = async () => {
    const updatedTokens = await Promise.all(
      tokens.map(async (token) => {
        try {
          const data = await fetchTokenData(token.address);
          const newPrice = parseFloat(data.priceUsd);
          const newCandle = generateMockCandle(newPrice);

          return {
            ...token,
            priceUsd: data.priceUsd,
            candleHistory: [...token.candleHistory.slice(-19), newCandle],
          };
        } catch {
          return token;
        }
      })
    );
    setTokens(updatedTokens);
  };

  const addToken = async () => {
    try {
      setError("");
      if (tokens.length >= 6) {
        setError("Maximum 6 tokens allowed");
        return;
      }
      if (tokens.some((t) => t.address === newAddress)) {
        setError("Token already added");
        return;
      }
      const tokenData = await fetchTokenData(newAddress);
      setTokens((prev) => [...prev, tokenData]);
      setNewAddress("");
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    const interval = setInterval(updatePrices, 10000);
    return () => clearInterval(interval);
  }, [tokens]);

  const handleTrade = (tokenId: string, isBuy: boolean, amount: number) => {
    const token = tokens.find((t) => t.id === tokenId);
    if (!token) return;

    const price = parseFloat(token.priceUsd);
    if (isBuy) {
      if (amount <= balance) {
        const tokenAmount = amount / price;
        setBalance((prev) => prev - amount);
        setTokens((prev) =>
          prev.map((t) =>
            t.id === tokenId ? { ...t, holdings: t.holdings + tokenAmount } : t
          )
        );
      }
    } else {
      const maxSell = token.holdings * price;
      if (amount <= maxSell) {
        const tokenAmount = amount / price;
        setBalance((prev) => prev + amount);
        setTokens((prev) =>
          prev.map((t) =>
            t.id === tokenId ? { ...t, holdings: t.holdings - tokenAmount } : t
          )
        );
      }
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Trading Simulator</h1>
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          <span className="text-lg font-semibold">${balance.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Enter token address"
          value={newAddress}
          onChange={(e) => setNewAddress(e.target.value)}
          className="font-mono"
        />
        <Button onClick={addToken} className="whitespace-nowrap">
          <Plus className="w-4 h-4 mr-2" /> Add Token
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tokens.map((token) => (
          <Card key={token.id} className="p-4 bg-slate-900">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{token.symbol}</h3>
                <p className="text-sm text-slate-400">
                  Vol: ${parseFloat(token.volume).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-white">
                  ${parseFloat(token.priceUsd).toFixed(6)}
                </p>
              </div>
            </div>

            <div className="h-32 mb-4 w-full">
              <CandlestickChart data={token.candleHistory} />
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="bg-green-500 hover:bg-green-600"
                  onClick={() => handleTrade(token.id, true, 100)}
                >
                  Buy $100
                </Button>
                <Button
                  className="bg-red-500 hover:bg-red-600"
                  onClick={() => handleTrade(token.id, false, 100)}
                >
                  Sell $100
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="bg-green-500 hover:bg-green-600"
                  onClick={() => handleTrade(token.id, true, 250)}
                >
                  Buy $250
                </Button>
                <Button
                  className="bg-red-500 hover:bg-red-600"
                  onClick={() => handleTrade(token.id, false, 250)}
                >
                  Sell $250
                </Button>
              </div>
              <div className="text-sm text-slate-400">
                <p>
                  Holdings: {token.holdings.toFixed(6)} {token.symbol}
                </p>
                <p>
                  Value: $
                  {(token.holdings * parseFloat(token.priceUsd)).toFixed(2)}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
