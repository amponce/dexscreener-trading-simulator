import { useState, useEffect } from "react";
import type { DexScreenerPair } from "@/services/dexscreener-service";
import { dexScreenerService } from "@/services/dexscreener-service";

interface TokenDataResult {
  tokenData: DexScreenerPair | null;
  loading: boolean;
  error: string | null;
}

export function useTokenData(address: string): TokenDataResult {
  const [tokenData, setTokenData] = useState<DexScreenerPair | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const handleUpdate = (data: DexScreenerPair) => {
      if (!mounted) return;
      setTokenData(data);
      setLoading(false);
      setError(null);
    };

    // Subscribe to updates
    const unsubscribe = dexScreenerService.subscribe(address, handleUpdate);
    setLoading(true);

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [address]);

  return { tokenData, loading, error };
}
