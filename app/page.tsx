// app/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { TradingCard } from "@/components/trading-card";
import { TradeHistory } from "@/components/trade-history";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Plus,
  Wallet,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  dexScreenerService,
  type DexScreenerPair,
} from "@/services/dexscreener-service";
import { formatCurrency } from "@/lib/utils";

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

interface TokenPosition {
  address: string;
  symbol: string;
  holdings: number;
  trades: Trade[];
  pnl: number;
  averageCost: number;
  currentPrice: number;
}

export default function TradingSimulator() {
  // State
  const [balance, setBalance] = useState<number>(1000);
  const [initialBalance] = useState<number>(1000);
  const [tokens, setTokens] = useState<TokenPosition[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [newAddress, setNewAddress] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [overallPnL, setOverallPnL] = useState<number>(0);

  // PnL Calculation
  const calculatePositionPnL = useCallback(
    (trades: Trade[], currentPrice: number) => {
      let totalCost = 0;
      let totalTokens = 0;
      let realizedPnL = 0;

      trades.forEach((trade) => {
        if (trade.type === "buy") {
          totalCost += trade.value;
          totalTokens += trade.amount;
        } else {
          const avgCost = totalCost / totalTokens;
          const saleValue = trade.amount * trade.price;
          const costBasis = trade.amount * avgCost;
          realizedPnL += saleValue - costBasis;

          const remainingRatio = (totalTokens - trade.amount) / totalTokens;
          totalCost *= remainingRatio;
          totalTokens -= trade.amount;
        }
      });

      const currentValue = totalTokens * currentPrice;
      const unrealizedPnL = totalTokens > 0 ? currentValue - totalCost : 0;

      return {
        realizedPnL,
        unrealizedPnL,
        totalPnL: realizedPnL + unrealizedPnL,
        totalTokens,
        averageCost: totalTokens > 0 ? totalCost / totalTokens : 0,
      };
    },
    []
  );

  // Token Management
  const addToken = async () => {
    try {
      setError("");
      setIsLoading(true);

      if (tokens.length >= 6) {
        setError("Maximum 6 tokens allowed");
        return;
      }

      const normalizedAddress = newAddress.toLowerCase();
      if (tokens.some((t) => t.address.toLowerCase() === normalizedAddress)) {
        setError("Token already added");
        return;
      }

      const tokenData = await dexScreenerService.fetchTokenData(
        normalizedAddress
      );
      if (!tokenData) {
        setError("Invalid token address");
        return;
      }

      const currentPrice = parseFloat(tokenData.priceUsd);
      setTokens((prev) => [
        ...prev,
        {
          address: normalizedAddress,
          symbol: tokenData.baseToken.symbol,
          holdings: 0,
          trades: [],
          pnl: 0,
          averageCost: 0,
          currentPrice,
        },
      ]);
      setNewAddress("");
    } catch (err) {
      setError("Failed to add token");
    } finally {
      setIsLoading(false);
    }
  };

  // Trading Logic
  const handleTrade = useCallback(
    async (tokenAddress: string, isBuy: boolean, amount: number) => {
      try {
        setError("");
        const tokenData = dexScreenerService.getTokenData(tokenAddress);
        if (!tokenData) {
          setError("Token data not available");
          return;
        }

        const currentPrice = parseFloat(tokenData.priceUsd);
        if (isNaN(currentPrice) || currentPrice <= 0) {
          setError("Invalid price data");
          return;
        }

        const tokenAmount = amount / currentPrice;

        if (isBuy) {
          if (amount > balance) {
            setError("Insufficient balance");
            return;
          }

          const trade: Trade = {
            id: Math.random().toString(36).substring(7),
            symbol: tokenData.baseToken.symbol,
            type: "buy",
            amount: tokenAmount,
            price: currentPrice,
            value: amount,
            timestamp: Date.now(),
          };

          setBalance((prev) => prev - amount);
          setTokens((prev) =>
            prev.map((t) => {
              if (t.address === tokenAddress) {
                const updatedTrades = [...t.trades, trade];
                const pnlData = calculatePositionPnL(
                  updatedTrades,
                  currentPrice
                );
                return {
                  ...t,
                  holdings: pnlData.totalTokens,
                  trades: updatedTrades,
                  pnl: pnlData.totalPnL,
                  averageCost: pnlData.averageCost,
                  currentPrice,
                };
              }
              return t;
            })
          );
          setTrades((prev) => [trade, ...prev]);
        } else {
          const token = tokens.find((t) => t.address === tokenAddress);
          if (!token) return;

          if (tokenAmount > token.holdings) {
            setError("Insufficient tokens");
            return;
          }

          const trade: Trade = {
            id: Math.random().toString(36).substring(7),
            symbol: token.symbol,
            type: "sell",
            amount: tokenAmount,
            price: currentPrice,
            value: amount,
            timestamp: Date.now(),
          };

          const pnlData = calculatePositionPnL(
            [...token.trades, trade],
            currentPrice
          );
          trade.pnl = pnlData.realizedPnL;
          trade.pnlPercent = (pnlData.realizedPnL / amount) * 100;

          setBalance((prev) => prev + amount);
          setTokens((prev) =>
            prev.map((t) => {
              if (t.address === tokenAddress) {
                return {
                  ...t,
                  holdings: pnlData.totalTokens,
                  trades: [...t.trades, trade],
                  pnl: pnlData.totalPnL,
                  averageCost: pnlData.averageCost,
                  currentPrice,
                };
              }
              return t;
            })
          );
          setTrades((prev) => [trade, ...prev]);
        }
      } catch (err) {
        setError("Trade failed");
      }
    },
    [balance, tokens, calculatePositionPnL]
  );

  // Price Updates
  const handlePriceUpdate = useCallback(
    (address: string, price: number) => {
      setTokens((prev) => {
        const token = prev.find(
          (t) => t.address.toLowerCase() === address.toLowerCase()
        );
        if (!token || token.currentPrice === price) {
          return prev;
        }

        return prev.map((t) => {
          if (t.address.toLowerCase() === address.toLowerCase()) {
            const pnlData = calculatePositionPnL(t.trades, price);
            return {
              ...t,
              currentPrice: price,
              pnl: pnlData.totalPnL,
            };
          }
          return t;
        });
      });
    },
    [calculatePositionPnL]
  );

  // Update overall PnL
  useEffect(() => {
    const totalPnL = tokens.reduce((sum, token) => sum + token.pnl, 0);
    setOverallPnL(totalPnL);
  }, [tokens]);

  return (
    <div className="min-h-screen bg-slate-950 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">
            Solana Trading Simulator
          </h1>
          <div className="flex items-center gap-4">
            <div
              className={`flex items-center gap-2 ${
                overallPnL >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {overallPnL >= 0 ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
              <span className="text-lg font-semibold">
                {formatCurrency(overallPnL)} (
                {((overallPnL / initialBalance) * 100).toFixed(2)}%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-white" />
              <span className="text-lg font-semibold text-white">
                {formatCurrency(balance)}
              </span>
            </div>
          </div>
        </div>

        {/* Token Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter token address (e.g., JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN)"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            className="font-mono text-white"
            disabled={isLoading}
          />
          <Button
            onClick={addToken}
            className="whitespace-nowrap"
            disabled={isLoading}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Token
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Trading Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tokens.map((token) => (
            <TradingCard
              key={token.address}
              address={token.address}
              onBuy={(amount) => handleTrade(token.address, true, amount)}
              onSell={(amount) => handleTrade(token.address, false, amount)}
              holdings={token.holdings}
              pnl={token.pnl}
              onPriceUpdate={(price) => handlePriceUpdate(token.address, price)}
            />
          ))}
        </div>

        {/* Trade History */}
        <TradeHistory trades={trades} />
      </div>
    </div>
  );
}
