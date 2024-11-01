// services/dexscreener-service.ts
export interface DexScreenerPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceUsd: string;
  priceNative: string;
  priceChange: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  volume: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  txns: {
    h24: {
      buys: number;
      sells: number;
    };
    h6: {
      buys: number;
      sells: number;
    };
    h1: {
      buys: number;
      sells: number;
    };
    m5: {
      buys: number;
      sells: number;
    };
  };
  marketCap: number;
  fdv: number;
  pairCreatedAt: number;
}

// Create a type for market stats to better handle the data
interface MarketStats {
  price: number;
  priceChange24h: number;
  marketCap: number;
  volume24h: number;
  liquidity: number;
}

class RateLimiter {
  private requests: number = 0;
  private lastReset: number = Date.now();
  private readonly resetInterval = 60000; // 1 minute in milliseconds
  private readonly limit: number;

  constructor(limitPerMinute: number) {
    this.limit = limitPerMinute;
  }

  async waitForAvailability(): Promise<void> {
    const now = Date.now();
    if (now - this.lastReset >= this.resetInterval) {
      this.requests = 0;
      this.lastReset = now;
    }

    if (this.requests >= this.limit) {
      const waitTime = this.resetInterval - (now - this.lastReset);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return this.waitForAvailability();
    }

    this.requests++;
  }
}

class DexScreenerService {
  private static instance: DexScreenerService;
  private subscribers: Map<string, Set<(data: DexScreenerPair) => void>> =
    new Map();
  private tokenData: Map<string, DexScreenerPair> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  private lastUpdateTime: Map<string, number> = new Map();
  private rateLimiter: RateLimiter;

  private readonly UPDATE_INTERVAL = 3000; // 3 seconds
  private readonly BASE_URL = "https://api.dexscreener.com/latest/dex";
  private readonly RATE_LIMIT = 300; // requests per minute
  private readonly BATCH_SIZE = 10; // tokens per request
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;

  private constructor() {
    this.rateLimiter = new RateLimiter(this.RATE_LIMIT);
    this.startUpdates();
  }

  static getInstance(): DexScreenerService {
    if (!DexScreenerService.instance) {
      DexScreenerService.instance = new DexScreenerService();
    }
    return DexScreenerService.instance;
  }

  private async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;

    this.isProcessingQueue = true;
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        await this.rateLimiter.waitForAvailability();
        try {
          await request();
        } catch (error) {
          console.error("Error processing queued request:", error);
        }
      }
    }
    this.isProcessingQueue = false;
  }

  private queueRequest(request: () => Promise<void>) {
    this.requestQueue.push(request);
    this.processQueue();
  }

  async fetchTokenData(address: string): Promise<DexScreenerPair | null> {
    try {
      await this.rateLimiter.waitForAvailability();

      const response = await fetch(`${this.BASE_URL}/tokens/${address}`);

      if (!response.ok) {
        throw new Error("Failed to fetch token data");
      }

      const data = await response.json();

      if (data.pairs && data.pairs.length > 0) {
        const sortedPairs = data.pairs.sort(
          (a: DexScreenerPair, b: DexScreenerPair) =>
            (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
        );

        const pair = sortedPairs[0];
        const normalizedAddress = address.toLowerCase();
        this.tokenData.set(normalizedAddress, pair);
        this.lastUpdateTime.set(normalizedAddress, Date.now());

        const subscribers = this.subscribers.get(normalizedAddress);
        if (subscribers) {
          subscribers.forEach((callback) => callback(pair));
        }

        return pair;
      }
      return null;
    } catch (error) {
      console.error("Error fetching token data:", error);
      return null;
    }
  }

  private async updateBatch(addresses: string[]) {
    if (addresses.length === 0) return;

    const fetchBatch = async () => {
      try {
        await this.rateLimiter.waitForAvailability();

        const addressString = addresses.join(",");
        const response = await fetch(
          `${this.BASE_URL}/tokens/${addressString}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch token data");
        }

        const data = await response.json();

        if (data.pairs) {
          const pairsByAddress = new Map<string, DexScreenerPair>();

          for (const pair of data.pairs) {
            const address = pair.baseToken.address.toLowerCase();
            if (
              !pairsByAddress.has(address) ||
              (pair.liquidity?.usd || 0) >
                (pairsByAddress.get(address)?.liquidity?.usd || 0)
            ) {
              pairsByAddress.set(address, pair);
            }
          }

          const now = Date.now();
          for (const [address, pair] of pairsByAddress.entries()) {
            this.tokenData.set(address, pair);
            this.lastUpdateTime.set(address, now);

            const subscribers = this.subscribers.get(address);
            if (subscribers) {
              subscribers.forEach((callback) => callback(pair));
            }
          }
        }
      } catch (error) {
        console.error("Error updating batch:", error);
      }
    };

    this.queueRequest(fetchBatch);
  }

  private startUpdates() {
    if (this.updateInterval) return;

    this.updateInterval = setInterval(() => {
      const now = Date.now();
      const addresses = Array.from(this.subscribers.keys()).filter(
        (addr) =>
          now - (this.lastUpdateTime.get(addr) || 0) >= this.UPDATE_INTERVAL
      );

      // Split addresses into batches
      for (let i = 0; i < addresses.length; i += this.BATCH_SIZE) {
        const batch = addresses.slice(i, i + this.BATCH_SIZE);
        this.updateBatch(batch);
      }
    }, this.UPDATE_INTERVAL);
  }

  subscribe(
    address: string,
    callback: (data: DexScreenerPair) => void
  ): () => void {
    const normalizedAddress = address.toLowerCase();

    if (!this.subscribers.has(normalizedAddress)) {
      this.subscribers.set(normalizedAddress, new Set());
    }
    this.subscribers.get(normalizedAddress)?.add(callback);

    // Queue initial data fetch
    this.queueRequest(async () => {
      const data = await this.fetchTokenData(normalizedAddress);
      if (data) {
        callback(data);
      }
    });

    return () => this.unsubscribe(normalizedAddress, callback);
  }

  unsubscribe(address: string, callback: (data: DexScreenerPair) => void) {
    const normalizedAddress = address.toLowerCase();
    this.subscribers.get(normalizedAddress)?.delete(callback);
    if (this.subscribers.get(normalizedAddress)?.size === 0) {
      this.subscribers.delete(normalizedAddress);
      this.tokenData.delete(normalizedAddress);
      this.lastUpdateTime.delete(normalizedAddress);
    }
  }

  getTokenData(address: string): DexScreenerPair | null {
    return this.tokenData.get(address.toLowerCase()) || null;
  }

  stopUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

export const dexScreenerService = DexScreenerService.getInstance();
