import { Abi, decodeFunctionData } from "viem";
import { formatAbiItem } from "viem/utils";
import CommitteeManagerABI from "~~/contracts/abi/CommitteeManager.json";
import deployedContracts from "~~/contracts/deployedContracts";

const abiCache: Record<string, Abi> = {
  ...Object.fromEntries(
    Object.values(deployedContracts)
      .map(chain => Object.values(chain).map(contract => [contract.address, contract.abi]))
      .flat(),
  ),
  "0x0000000000000000000000000000000000010001": CommitteeManagerABI.abi,
};
export const tryToDecodeData = (data: `0x${string}`, address: string) => {
  const abi = abiCache[address];
  if (!abi) {
    console.warn(`Cannot find ${address} abi in cache`);
    return undefined;
  }
  return decodeData(data, abi);
};

export const decodeData = (data: `0x${string}`, abi: Abi) => {
  try {
    const decodedData = decodeFunctionData({ abi, data });
    abi.find(func => {
      if (func.type === "function" && func.name === decodedData.functionName) {
        decodedData.functionName = formatAbiItem(func);
      }
    });
    console.log("方法名:", decodedData.functionName);
    console.log("参数:", decodedData.args);
    return decodedData;
  } catch (e) {
    console.error("解析失败:", e);
    return undefined;
  }
};
