import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { LinkOutlined } from "@ant-design/icons";
import { codeBlockPlugin, headingsPlugin, linkPlugin, listsPlugin, quotePlugin } from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { Popover } from "antd";
import { message } from "antd";
import classNames from "classnames";
import { ClipboardIcon } from "@heroicons/react/24/outline";
import { type ProposalAllInfo } from "~~/hooks/blockchain/BCOSGovernor";
import { useTransactionsByAddress } from "~~/hooks/blockchain/useTransactionByAddress";
import { useDeployedContractInfo, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { ProposalState, stateColorsClassName } from "~~/services/store/store";
import { formatUTCDate } from "~~/utils/TimeFormatter";
import { shortenAddress } from "~~/utils/scaffold-eth/common";

const MDXEditor = dynamic(() => import("@mdxeditor/editor").then(mod => mod.MDXEditor), { ssr: false });

interface ProposalOverviewProps {
  proposal: ProposalAllInfo;
  isPreview?: boolean;
}

export const ProposalOverview = ({ proposal, isPreview = false }: ProposalOverviewProps) => {
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success("Copied to clipboard");
    } catch (err) {
      message.error("Failed to copy");
    }
  };
  const bcosGovernor = useDeployedContractInfo({
    contractName: "BCOSGovernor",
  });
  const stateColor = stateColorsClassName[Number(proposal.state)];
  const [timeRange, setTimeRange] = useState<string>();
  const [etaTime, setEtaTime] = useState<string>();
  const [timeSuffix, setTimeSuffix] = useState<string>("");
  const [txHash, setTxHash] = useState<string>();
  const txsByProposer = useTransactionsByAddress(proposal.createBlock, proposal.proposer);
  useEffect(() => {
    if (proposal.startTime && proposal.endTime) {
      const startTimeString = formatUTCDate(proposal.startTime * 1000);
      const endTimeString = formatUTCDate(proposal.endTime * 1000);
      setTimeRange(`${startTimeString} - ${endTimeString}`);
    }
  }, [proposal.startTime, proposal.endTime]);

  useEffect(() => {
    if (proposal.eta && proposal.eta !== 0) {
      const etaString = formatUTCDate(proposal.eta * 1000);
      const eta = new Date(proposal.eta * 1000);
      const now = new Date();
      let timeSuffix = "";
      let diffDate;
      if (now < eta) {
        diffDate = new Date(eta.getTime() - now.getTime());
        console.log("diffDate", diffDate);
        /// FIXME)): this diff date will be error in 1 day
        timeSuffix = " (ends in " + diffDate.getDate() + " days " + diffDate.getHours() + " hours)";
      } else {
        // eta <= now
        timeSuffix = " (Ready to go!)";
      }
      setEtaTime(etaString);
      setTimeSuffix(timeSuffix);
    }
  }, [proposal.eta]);

  useEffect(() => {
    if (txsByProposer && bcosGovernor) {
      console.log("txsByProposer", txsByProposer);
      const txhash = txsByProposer.filter(tx => {
        return tx.to === bcosGovernor.data?.address && tx.input.startsWith("0xb7fb511b");
      });
      if (txhash.length === 1) {
        setTxHash(txhash[0].hash);
      }
    }
  }, [txsByProposer]);

  const { targetNetwork } = useTargetNetwork();
  const blockExplorerBaseURL = targetNetwork.blockExplorers?.default?.url;

  return (
    <div className="bg-base-100 rounded-xl shadow-lg">
      {/*Header*/}
      {!isPreview && (
        <div
          className={classNames(
            "flex rounded-t-xl justify-between items-center p-4",
            `bg-${stateColor}-300`,
            `text-${stateColor}-800`,
          )}
        >
          <span className={`px-3 py-1 text-sm font-semibold rounded-full bg-white`}>
            {ProposalState[Number(proposal.state)]}
          </span>
          <span className="text-lg font-bold text-white">No. {proposal.id}</span>
        </div>
      )}
      {/*Body*/}
      <div className="p-6">
        {/* General Info */}
        <div className="mb-8">
          <Popover content={proposal.title} trigger="hover" placement="topLeft" overlayStyle={{ maxWidth: "50%" }}>
            <h1
              className={`text-2xl font-bold text-base-content truncate cursor-pointer ${
                isPreview ? "w-full" : "w-[calc(100%-100px)]"
              }`}
            >
              {proposal.title}
            </h1>
          </Popover>

          <div className="grid grid-cols-2 gap-6 mt-6">
            {etaTime !== undefined ? (
              <div>
                <h2 className="text-xl font-bold text-neutral">Executable Time</h2>
                <div className="flex justify-start">
                  <p className="text-md font-medium text-neutral">{etaTime}</p>
                  <p className="text-md text-emerald-500">{timeSuffix}</p>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-bold text-neutral">Voting Period</h2>
                <p className="text-md font-medium text-neutral">{timeRange}</p>
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-neutral">Proposer</h2>
              <Link
                href={`${blockExplorerBaseURL}/address/${proposal.proposer}`}
                className="text-md font-medium text-blue-500"
                target="_blank"
              >
                <LinkOutlined />
                {shortenAddress(proposal.proposer)}
              </Link>
            </div>

            {txHash && (
              <div>
                <h2 className="text-xl font-bold text-neutral">Transaction</h2>
                <Link
                  href={`${blockExplorerBaseURL}/tx/${txHash}`}
                  className="text-md font-medium text-blue-500"
                  target={`_blank`}
                >
                  <LinkOutlined />
                  View on Explorer →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-neutral mb-4">Actions</h2>
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-base-300">
                <tr>
                  <th
                    scope="col"
                    className="w-[10%] px-6 py-3 text-left text-xs font-medium text-neutral uppercase tracking-wider"
                  >
                    Type
                  </th>
                  <th
                    scope="col"
                    className="w-[20%] px-6 py-3 text-left text-xs font-medium text-neutral uppercase tracking-wider"
                  >
                    Address
                  </th>
                  <th
                    scope="col"
                    className="w-[10%] px-6 py-3 text-left text-xs font-medium text-neutral uppercase tracking-wider"
                  >
                    Value
                  </th>
                  <th
                    scope="col"
                    className="w-[60%] px-6 py-3 text-left text-xs font-medium text-neutral uppercase tracking-wider"
                  >
                    CallData
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {proposal.targets.map((target, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 text-sm text-gray-500 overflow-hidden">{""}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 overflow-hidden">
                      {shortenAddress(target)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 overflow-hidden">
                      {Number(proposal.values[index])}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                      <div className="flex items-center">
                        <span className="truncate" title={proposal.calldatas[index]}>
                          {proposal.calldatas[index]}
                        </span>
                        <button
                          onClick={() => copyToClipboard(proposal.calldatas[index])}
                          className="ml-2 p-1 hover:bg-gray-100 rounded-md flex-shrink-0"
                          title="Copy calldata"
                        >
                          <ClipboardIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Description */}
        <div>
          <h2 className="text-xl font-bold text-neutral mb-4">Description</h2>
          <div className="prose max-w-none bg-base-200 p-4 rounded-lg text-neutral">
            {typeof window !== "undefined" && (
              <MDXEditor
                markdown={proposal.description}
                readOnly
                contentEditableClassName="!bg-transparent text-neutral"
                plugins={[linkPlugin(), listsPlugin(), quotePlugin(), headingsPlugin(), codeBlockPlugin()]}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
