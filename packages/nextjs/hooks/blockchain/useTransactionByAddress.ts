import { useBlock } from "wagmi";

export const useTransactionsByAddress = (blockNumber: number, sender: string) => {
  const block = useBlock({
    blockNumber: BigInt(blockNumber),
    includeTransactions: true,
  });
  console.log("useTransactionsByAddress", block);
  return block.data?.transactions.filter(transaction => transaction.from === sender);
};

export const useTransactionsFilterByTo = (blockNumber: number, to: string | undefined) => {
  const block = useBlock({
    blockNumber: BigInt(blockNumber),
    includeTransactions: true,
  });
  console.log("useTransactionsFilterByTo", block);
  return block.data?.transactions.filter(transaction => transaction.to === to);
};
