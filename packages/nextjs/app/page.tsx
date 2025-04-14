"use client";

import React from "react";
import Link from "next/link";
import { ContainerOutlined, FileDoneOutlined, PlusCircleOutlined } from "@ant-design/icons";
import { Button, Spin } from "antd";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { ProposalCard } from "~~/components/ProposalCard";
import { useIsMaintainer, useProposalThreshold, useVotingPeriod } from "~~/hooks/blockchain/BCOSGovernor";
import { useLatestProposalId, useProposalList } from "~~/hooks/blockchain/BCOSGovernor";
import { useVotePower, useVotePowerDecimal } from "~~/hooks/blockchain/ERC20VotePower";

const Home: NextPage = () => {
  const { address } = useAccount();
  const isMaintainer = useIsMaintainer(address || "");
  console.log("isMaintainer: ", isMaintainer);
  const pageSize = 9;
  const latestProposal = useLatestProposalId();
  console.log("latestProposal: ", latestProposal);
  const votingPower = useVotePower(address || "");
  const decimals = useVotePowerDecimal();
  const proposalThreshold = useProposalThreshold();
  const votingPeriod = useVotingPeriod();
  console.log("votingPower: ", votingPower);
  const { data: proposalList, loadMore, hasMoreProposals, loading } = useProposalList(pageSize, latestProposal || 0);
  if (
    latestProposal === undefined ||
    votingPower === undefined ||
    proposalThreshold === undefined ||
    decimals === undefined ||
    votingPeriod === undefined
  ) {
    return <Spin spinning={true} size="large" tip="Loading" fullscreen></Spin>;
  }
  console.log("proposalList: ", proposalList);
  return (
    <>
      <div className="container mx-auto px-4 py-6">
        {/*Stats Section*/}
        {/*<div className="grid grid-cols-4 gap-6 mb-6">*/}
        {/*  <div className="contents">*/}
        {/*    <div className="bg-white rounded-xl p-4 shadow-lg">*/}
        {/*      <h3 className="text-gray-600 text-sm">Proposals</h3>*/}
        {/*      <p className="text-2xl font-bold text-blue-900 mt-2">12</p>*/}
        {/*      <p className="text-sm mt-1">No active proposals</p>*/}
        {/*    </div>*/}
        {/*    <div className="bg-white rounded-xl p-6 shadow-lg">*/}
        {/*      <h3 className="text-gray-600 text-sm">Delegates</h3>*/}
        {/*      <p className="text-2xl font-bold text-blue-900 mt-2">1,458</p>*/}
        {/*      <p className="text-sm mt-1">361.02K token holders</p>*/}
        {/*    </div>*/}
        {/*    <div className="bg-white rounded-xl p-6 shadow-lg">*/}
        {/*      <h3 className="text-gray-600 text-sm">Total Supply</h3>*/}
        {/*      <p className="text-2xl font-bold text-blue-900 mt-2">123,567</p>*/}
        {/*      <p className="text-green-600 text-sm mt-1">+5.2% this month</p>*/}
        {/*    </div>*/}
        {/*    <div className="bg-white rounded-xl p-6 shadow-lg">*/}
        {/*      <h3 className="text-gray-600 text-sm">Executed Proposals</h3>*/}
        {/*      <p className="text-2xl font-bold text-blue-900 mt-2">89</p>*/}
        {/*      <p className="text-green-600 text-sm mt-1">+3 this week</p>*/}
        {/*    </div>*/}
        {/*  </div>*/}
        {/*</div>*/}

        {/*Proposal Section*/}
        <div>
          {!loading && proposalList.length === 0 ? (
            <div className="w-full min-h-[80vh] flex flex-col items-center justify-center from-blue-50 to-indigo-50 p-6">
              <div className="max-w-2xl w-full bg-white/80 backdrop-blur-sm rounded-xl border border-blue-100 shadow-md p-8 flex flex-col items-center">
                {/* Empty state illustration */}
                <div className="relative w-40 h-40 mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ContainerOutlined
                      style={{ fontSize: "120px", fontWeight: "bolder" }}
                      className="w-20 h-20 text-blue-500 opacity-80"
                    />
                  </div>
                  <div className="absolute -right-3 -bottom-3 bg-indigo-500 rounded-full p-2 shadow-lg">
                    <PlusCircleOutlined style={{ fontSize: "xx-large" }} className="w-8 h-8 text-white" />
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                  No Proposals Yet
                </h1>

                {/* Description */}
                <p className="text-slate-600 text-center max-w-md mb-8">
                  Be the first to create a proposal for your DAO community. Proposals help drive collective decisions
                  and shape the future of our organization.
                </p>

                {/* Action Button */}
                <Button
                  type="primary"
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-6 h-auto rounded-xl font-medium text-lg shadow-md transition-all duration-200 flex items-center gap-2 mb-6"
                  href="/proposal/creation"
                >
                  <PlusCircleOutlined style={{ fontSize: "xx-large" }} className="w-10 h-10" />
                  Create First Proposal
                </Button>

                {/* Info Box */}
                <div className="w-full bg-blue-50 rounded-lg p-2 border border-blue-100 mt-2">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <FileDoneOutlined style={{ fontSize: "large" }} className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm text-slate-700">How proposals work</h3>
                      <div className="text-xs text-slate-600 mt-1">
                        Proposals require a minimum of {proposalThreshold / 10 ** decimals} tokens to create and will be
                        open for voting for {votingPeriod / (24 * 60 * 60)} days. Members with governance tokens can
                        cast their votes to approve or reject each proposal.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            !loading &&
            proposalList.length > 0 && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-neutral">Proposals</h2>
                  <Link
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition duration-300"
                    href="/proposal/creation"
                  >
                    Create Proposal
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {proposalList.map(proposal => (
                    <ProposalCard key={proposal.id} {...proposal} />
                  ))}
                </div>
              </>
            )
          )}

          {loading && (
            <div className="col-span-full flex justify-center items-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {hasMoreProposals && !loading && (
            <div className="text-center mt-8 col-span-full">
              <button
                onClick={loadMore}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition duration-300"
              >
                Load More Proposals
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Home;
