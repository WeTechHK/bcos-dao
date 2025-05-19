import * as dotenv from "dotenv";
import * as chains from "viem/chains";

dotenv.config();

export type ScaffoldConfig = {
  targetNetworks: readonly chains.Chain[];
  pollingInterval: number;
  alchemyApiKey: string;
  walletConnectProjectId: string;
  onlyLocalBurnerWallet: boolean;
};

export const DEFAULT_ALCHEMY_API_KEY = "oKxs-03sij-U_N0iOlrSsZFr29-IqbuF";

const chain_rpc = process.env.NEXT_PUBLIC_CHAIN_RPC_URL || "https://140.210.218.31:8555";
const chain_explorer = process.env.NEXT_PUBLIC_BLOCK_EXPLORERS_URL || "http://140.210.218.31";
const scaffoldConfig = {
  // The networks on which your DApp is live
  targetNetworks: [
    {
      id: 30303,
      name: "BCOS Testnet",
      nativeCurrency: {
        decimals: 18,
        name: "BCOS Token",
        symbol: "UBT",
      },
      rpcUrls: {
        default: { http: [chain_rpc] },
      },
      blockExplorers: {
        default: {
          name: "POTOS Testnet Explorer",
          url: chain_explorer,
        },
      },
    },
  ],

  // The interval at which your front-end polls the RPC servers for new data
  // it has no effect if you only target the local network (default is 4000)
  pollingInterval: 30000,

  // This is ours Alchemy's default API key.
  // You can get your own at https://dashboard.alchemyapi.io
  // It's recommended to store it in an env variable:
  // .env.local for local testing, and in the Vercel/system env config for live apps.
  alchemyApiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || DEFAULT_ALCHEMY_API_KEY,

  // This is ours WalletConnect's default project ID.
  // You can get your own at https://cloud.walletconnect.com
  // It's recommended to store it in an env variable:
  // .env.local for local testing, and in the Vercel/system env config for live apps.
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "3a8170812b534d0ff9d794f19a901d64",

  // Only show the Burner Wallet when running on hardhat network
  onlyLocalBurnerWallet: true,
} as const satisfies ScaffoldConfig;

export default scaffoldConfig;
