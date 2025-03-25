import dynamic from "next/dynamic";
import { codeBlockPlugin, headingsPlugin, linkPlugin, listsPlugin, quotePlugin } from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { Popover } from "antd";
import { ProposalState, stateColors } from "~~/services/store/store";
import { shortenAddress } from "~~/utils/scaffold-eth/common";

const MDXEditor = dynamic(() => import("@mdxeditor/editor").then(mod => mod.MDXEditor), { ssr: false });

interface ProposalOverviewProps {
  proposal: {
    title: string;
    state: string | ProposalState;
    proposer: string;
    id: number;
    startBlock: number;
    endBlock: number;
    description: string;
    forVotes: number;
    againstVotes: number;
    abstainVotes: number;
    targets: string[];
    values: (string | bigint)[];
    calldatas: string[];
  };
  isPreview?: boolean;
}

export const ProposalOverview = ({ proposal, isPreview = false }: ProposalOverviewProps) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* General Info */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <Popover content={proposal.title} trigger="hover" placement="topLeft" overlayStyle={{ maxWidth: "50%" }}>
            <h1
              className={`text-2xl font-bold text-gray-800 truncate cursor-pointer ${
                isPreview ? "w-full" : "w-[calc(100%-100px)]"
              }`}
            >
              {proposal.title}
            </h1>
          </Popover>
          {!isPreview && (
            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${stateColors[Number(proposal.state)]}`}>
              {ProposalState[Number(proposal.state)]}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            {isPreview ? (
              <h2 className="text-lg font-semibold mb-4">Proposer</h2>
            ) : (
              <p className="text-sm text-gray-500 mb-1">Proposer</p>
            )}
            <p className="text-md font-medium">{shortenAddress(proposal.proposer)}</p>
          </div>
          {!isPreview && (
            <>
              <div>
                <p className="text-sm text-gray-500 mb-1">Proposal ID</p>
                <p className="text-md font-medium">#{proposal.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Block Range</p>
                <p className="text-md font-medium">
                  {proposal.startBlock} ~ {proposal.endBlock}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Transaction</p>
                <a href="#" className="text-blue-600 hover:text-blue-800">
                  View on Explorer →
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Actions</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Type
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Address
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Value
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Calldata
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {proposal.targets.map((target, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Call</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {shortenAddress(target)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {Number(proposal.values[index])}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {proposal.calldatas[index].slice(0, 10)}...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Description */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Description</h2>
        <div className="prose max-w-none bg-gray-50 p-4 rounded-lg">
          {typeof window !== "undefined" && (
            <MDXEditor
              markdown={proposal.description}
              readOnly
              contentEditableClassName="!bg-transparent"
              plugins={[linkPlugin(), listsPlugin(), quotePlugin(), headingsPlugin(), codeBlockPlugin()]}
            />
          )}
        </div>
      </div>
    </div>
  );
};
