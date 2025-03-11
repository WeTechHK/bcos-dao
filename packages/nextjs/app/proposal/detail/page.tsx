"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { NextPage } from "next";
import { mockProposals } from "~~/mock";
import { useGlobalState } from "~~/services/store/store";
import { UserRole } from "~~/services/store/store";

interface ProposalDetail {
  id: number;
  proposer: string;
  startBlock: number;
  endBlock: number;
  eta: number;
  state: string;
  targets: string[];
  values: string[] | bigint[];
  calldatas: string[];
  description: string;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
}

const ProposalDetail: NextPage = () => {
  const searchParams = useSearchParams();
  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const { userRole } = useGlobalState(state => state);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      // 模拟从合约获取数据
      const proposalData = mockProposals.find(p => p.id === Number(id));
      setProposal(proposalData || null);
    }
  }, [searchParams]);

  if (!proposal) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
  const forPercentage = totalVotes > 0 ? (proposal.forVotes / totalVotes) * 100 : 0;
  const participationRate = 68.2; // 这里可以从合约获取实际参与率

  const renderActionButtons = () => {
    if (proposal?.state === "Pending" && userRole === UserRole.MAINTAINER) {
      return (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Proposal Actions</h2>
          <div className="space-y-4">
            <button className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition duration-300">
              Approve
            </button>
            <button className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition duration-300">
              Reject
            </button>
          </div>
        </div>
      );
    }

    if (proposal?.state === "Active" && userRole === UserRole.VOTER) {
      return (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Cast Your Vote</h2>
          <div className="space-y-4">
            <button className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition duration-300">
              Vote For
            </button>
            <button className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition duration-300">
              Vote Against
            </button>
            <button className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition duration-300">
              Abstain
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex gap-8">
        {/*Left Column*/}
        <div className="w-2/3">
          {/*Proposal Overview*/}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold text-gray-800">Proposal #{proposal.id}</h1>
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStateColor(proposal.state)}`}>
                {proposal.state}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500">Proposer</p>
                <p className="text-md font-medium">{shortenAddress(proposal.proposer)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">State</p>
                <p className="text-md font-medium">{proposal.state}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Block Range</p>
                <p className="text-md font-medium">
                  {proposal.startBlock} ~ {proposal.endBlock}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Transaction</p>
                <a href="#" className="text-blue-600 hover:text-blue-800">
                  View on Explorer
                </a>
              </div>
            </div>

            {/*Proposal Description*/}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <div className="prose whitespace-pre-line">{proposal.description}</div>
            </div>
          </div>

          {/* Voting Overview */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Voting Overview</h2>

            {/* Progress Bars */}
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Vote Weight Approval</span>
                  <span className="text-sm font-medium text-gray-900">{forPercentage.toFixed(1)}% / 51%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${forPercentage}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Participation Rate</span>
                  <span className="text-sm font-medium text-gray-900">{participationRate}% / 40%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${participationRate}%` }}></div>
                </div>
              </div>
            </div>

            {/* Vote Statistics */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">For</p>
                <p className="text-xl font-bold text-green-700">{proposal.forVotes} votes</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Against</p>
                <p className="text-xl font-bold text-red-700">{proposal.againstVotes} votes</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Abstain</p>
                <p className="text-xl font-bold text-gray-700">{proposal.abstainVotes} votes</p>
              </div>
            </div>
          </div>

          {/* Voting Details */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Voting Details</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Voter</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vote</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weight</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">0x1234...5678</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        For
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">1,000</div>
                    </td>
                    <td className="px-6 py-4">
                      <a href="#" className="text-blue-600 hover:text-blue-900">
                        View
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">0x9876...4321</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Against
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">500</div>
                    </td>
                    <td className="px-6 py-4">
                      <a href="#" className="text-blue-600 hover:text-blue-900">
                        View
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="w-1/3">
          {/* Action Buttons */}
          {renderActionButtons()}

          {/* Contract Information */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Contract Information</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">DAO Contract</p>
                <a href="#" className="text-blue-600 hover:text-blue-800 text-sm break-all">
                  0x1234567890abcdef1234567890abcdef12345678
                </a>
              </div>
              <div>
                <p className="text-sm text-gray-500">Explorer</p>
                <a href="#" className="text-blue-600 hover:text-blue-800 text-sm">
                  View on Block Explorer
                </a>
              </div>
            </div>
          </div>

          {/* Governance Token */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Governance Token</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Token Contract</p>
                <a href="#" className="text-blue-600 hover:text-blue-800 text-sm break-all">
                  0xabcdef1234567890abcdef1234567890abcdef12
                </a>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Locked Value</p>
                <p className="text-lg font-bold text-gray-900">1,234,567 BCOS</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

// Helper functions
const getStateColor = (state: string) => {
  const colors = {
    Pending: "bg-yellow-100 text-yellow-800",
    Active: "bg-green-100 text-green-800",
    Canceled: "bg-gray-100 text-gray-800",
    Defeated: "bg-red-100 text-red-800",
    Succeeded: "bg-blue-100 text-blue-800",
    Queued: "bg-purple-100 text-purple-800",
    Expired: "bg-orange-100 text-orange-800",
    Executed: "bg-green-100 text-green-800",
  };
  return colors[state as keyof typeof colors] || colors.Pending;
};

const shortenAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default ProposalDetail;
