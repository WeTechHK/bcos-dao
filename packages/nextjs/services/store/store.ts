import { create } from "zustand";
import scaffoldConfig from "~~/scaffold.config";
import { ChainWithAttributes } from "~~/utils/scaffold-eth";

/**
 * Zustand Store
 *
 * You can add global state to the app using this useGlobalState, to get & set
 * values from anywhere in the app.
 *
 * Think about it as a global useState.
 */

export enum ProposalState {
  Pending = 0,
  Active = 1,
  Canceled = 2,
  Defeated = 3,
  Succeeded = 4,
  Queued = 5,
  Expired = 6,
  Executed = 7,
}

export enum VoteType {
  Against = 0,
  VoteFor = 1,
  Abstain = 2,
}

// 根据状态设置颜色

export const stateColorsClassName: { [key: number]: string } = {
  0: "yellow", // Pending
  1: "green", // Active
  2: "gray", // Canceled
  3: "red", // Defeated
  4: "green", // Succeeded
  5: "sky", // Queued
  6: "gray", // Expired
  7: "green", // Executed
};

export const stateColors: { [key: number]: string } = {
  0: "bg-yellow-300 text-yellow-800", // Pending
  1: "bg-green-300 text-green-800", // Active
  2: "bg-gray-300 text-gray-800", // Canceled
  3: "bg-red-300 text-red-800", // Defeated
  4: "bg-green-300 text-green-800", // Succeeded
  5: "bg-sky-300 text-sky-800", // Queued
  6: "bg-gray-300 text-gray-800", // Expired
  7: "bg-green-300 text-green-800", // Executed
};

type GlobalState = {
  nativeCurrency: {
    price: number;
    isFetching: boolean;
  };
  setNativeCurrencyPrice: (newNativeCurrencyPriceState: number) => void;
  setIsNativeCurrencyFetching: (newIsNativeCurrencyFetching: boolean) => void;
  targetNetwork: ChainWithAttributes;
  setTargetNetwork: (newTargetNetwork: ChainWithAttributes) => void;
};

export const useGlobalState = create<GlobalState>(set => ({
  nativeCurrency: {
    price: 0,
    isFetching: true,
  },
  setNativeCurrencyPrice: (newValue: number): void =>
    set(state => ({ nativeCurrency: { ...state.nativeCurrency, price: newValue } })),
  setIsNativeCurrencyFetching: (newValue: boolean): void =>
    set(state => ({ nativeCurrency: { ...state.nativeCurrency, isFetching: newValue } })),
  targetNetwork: scaffoldConfig.targetNetworks[0],
  setTargetNetwork: (newTargetNetwork: ChainWithAttributes) => set(() => ({ targetNetwork: newTargetNetwork })),
}));
