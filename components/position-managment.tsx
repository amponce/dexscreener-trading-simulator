// components/position-management.tsx
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";

interface Position {
  symbol: string;
  amount: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
}

interface PositionManagementProps {
  position: Position;
  onUpdateStopLoss: (price: number) => void;
  onUpdateTakeProfit: (price: number) => void;
}

export function PositionManagement({
  position,
  onUpdateStopLoss,
  onUpdateTakeProfit,
}: PositionManagementProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [stopLossPercent, setStopLossPercent] = useState("");
  const [takeProfitPercent, setTakeProfitPercent] = useState("");

  const handleStopLossChange = (percent: string) => {
    setStopLossPercent(percent);
    const price = position.entryPrice * (1 - parseFloat(percent) / 100);
    onUpdateStopLoss(price);
  };

  const handleTakeProfitChange = (percent: string) => {
    setTakeProfitPercent(percent);
    const price = position.entryPrice * (1 + parseFloat(percent) / 100);
    onUpdateTakeProfit(price);
  };

  return (
    <Card className="p-4 bg-slate-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-white">Position Settings</h3>
        <Switch checked={showAdvanced} onCheckedChange={setShowAdvanced} />
      </div>

      {showAdvanced && (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400">Stop Loss (%)</label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={stopLossPercent}
                onChange={(e) => handleStopLossChange(e.target.value)}
                placeholder="e.g. 5"
              />
              <Button
                variant="secondary"
                onClick={() => handleStopLossChange("5")}
              >
                5%
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleStopLossChange("10")}
              >
                10%
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-400">Take Profit (%)</label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={takeProfitPercent}
                onChange={(e) => handleTakeProfitChange(e.target.value)}
                placeholder="e.g. 20"
              />
              <Button
                variant="secondary"
                onClick={() => handleTakeProfitChange("20")}
              >
                20%
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleTakeProfitChange("50")}
              >
                50%
              </Button>
            </div>
          </div>

          {position.stopLoss && (
            <Alert>Stop Loss set at ${position.stopLoss.toFixed(6)}</Alert>
          )}

          {position.takeProfit && (
            <Alert>Take Profit set at ${position.takeProfit.toFixed(6)}</Alert>
          )}
        </div>
      )}
    </Card>
  );
}
