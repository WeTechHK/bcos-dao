"use client";

import React, { useState } from "react";
import { Abi, AbiFunction } from "abitype";
import { Card, Form, Input, Select, Switch } from "antd";
import { ABIFunctionForm } from "~~/components/proposal/ABIFunctionForm";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { GenericContract, InheritedFunctions } from "~~/utils/scaffold-eth/contract";

const governorSettings = [
  {
    label: <div>DAO Settings</div>,
    title: "DAO Settings",
    options: [
      {
        label: <div>Proposal Threshold</div>,
        value: "setProposalThreshold",
      },
      {
        label: <div>Vote Success Threshold</div>,
        value: "setVoteSuccessThreshold",
      },
      {
        label: <div>Proposal Approval Threshold</div>,
        value: "setApproveThreshold",
      },
      {
        label: <div>Quorum Numerator</div>,
        value: "updateQuorumNumerator",
      },
      {
        label: <div>Voting Delay</div>,
        value: "setVotingDelay",
      },
      {
        label: <div>Voting Period</div>,
        value: "setVotingPeriod",
      },
      {
        label: <div>Timelock</div>,
        value: "updateTimelock",
      },
      {
        label: <div>Voting Success Logic</div>,
        value: "updateVoteSuccessLogic",
      },
      {
        label: <div>Upgrade DAO Contract</div>,
        value: "upgradeToAndCall",
      },
      {
        label: <div>Change Timestamp Unit</div>,
        value: "resetUint",
      },
    ],
  },
  {
    label: <div>DAO Role Changing</div>,
    title: "DAO Role Changing",
    options: [
      {
        label: <div>Grant Maintainer</div>,
        value: "grantMaintainer",
      },
      {
        label: <div>Revoke Maintainer</div>,
        value: "revokeMaintainer",
      },
    ],
  },
  {
    label: <div>EVP Token Changing</div>,
    title: "EVP Token Changing",
    options: [
      {
        label: <div>Mint EVP Token</div>,
        value: "mintToken",
      },
      {
        label: <div>Burn EVP Token</div>,
        value: "burnToken",
      },
      {
        label: <div>Pause EVP Token</div>,
        value: "pauseToken",
      },
      {
        label: <div>Unpause EVP Token</div>,
        value: "unpauseToken",
      },
    ],
  },
];

const GovernorSettingsForm = ({ field, index, onChange }: { field?: any; index?: any; onChange: any }) => {
  const parentForm = Form.useFormInstance();
  const FormItem = Form.Item;
  const [valueVisible, setValueVisible] = useState<boolean>(false);
  const [method, setMethod] = useState<{ fn: AbiFunction; inherited: string }>();
  const { data: deployedContractData, isLoading: deployedContractLoading } = useDeployedContractInfo({
    contractName: "BCOSGovernor",
  });

  const [govForm] = Form.useForm();

  if (deployedContractLoading) {
    return (
      <div className="mt-14">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }
  if (!deployedContractData) {
    return <p className="text-3xl mt-14">No contract found!</p>;
  }

  const handleChange = (value: string) => {
    const functionsToDisplay = (
      (deployedContractData.abi as Abi).filter(part => part.type === "function") as AbiFunction[]
    )
      .filter(fn => {
        return fn.stateMutability !== "view" && fn.stateMutability !== "pure" && fn.name === value;
      })
      .map(fn => {
        return {
          fn,
          inheritedFrom: ((deployedContractData as GenericContract)?.inheritedFunctions as InheritedFunctions)?.[
            fn.name
          ],
        };
      })
      .sort((a, b) => (b.inheritedFrom ? b.inheritedFrom.localeCompare(a.inheritedFrom) : 1));

    if (!functionsToDisplay.length) {
      return <>No write methods</>;
    }
    if (functionsToDisplay.length > 0) {
      setMethod({ fn: functionsToDisplay[0].fn, inherited: functionsToDisplay[0].inheritedFrom });
    }
  };
  return (
    <>
      <div className="mb-3">
        <Form
          layout={"vertical"}
          initialValues={{ address: deployedContractData.address }}
          form={govForm}
          onValuesChange={(e: any) => {
            console.log("onChange", e);
            onChange(govForm.getFieldsValue());
          }}
        >
          <FormItem
            name="address"
            label={<div className="text-lg font-bold mb-1">Target Contract Address</div>}
            rules={[{ required: true, message: "Please input the target contract address" }]}
          >
            <Input className="h-12" disabled></Input>
          </FormItem>
          <FormItem
            name="method"
            label={<div className="text-lg font-bold mb-1">Contract Method</div>}
            rules={[{ required: true, message: "Please input the method address" }]}
          >
            <Select options={governorSettings} onSelect={handleChange} className="h-12"></Select>
          </FormItem>

          {method && (
            <FormItem label={<div className="text-lg font-bold mb-1">Method arguments</div>}>
              <div>
                {deployedContractData && method && (
                  <ABIFunctionForm
                    abi={deployedContractData.abi as Abi}
                    abiFunction={method.fn as AbiFunction}
                    onChange={(encodeData: string) => {
                      console.log(encodeData);
                      parentForm.setFieldValue(["actions", index, "calldata"], encodeData);
                    }}
                    inheritedFrom={method.inherited}
                  />
                )}
              </div>
            </FormItem>
          )}

          {method && (
            <div className="mb-4 inline-flex gap-2">
              <div>Also send TOKEN to the target address? (this is not common)</div>
              <Switch
                onChange={() => {
                  setValueVisible(!valueVisible);
                  govForm.setFieldValue("value", "0");
                  parentForm.setFieldValue(["actions", index, "value"], "0");
                }}
              ></Switch>
            </div>
          )}

          {valueVisible && (
            <FormItem name="value" label={<div className="text-lg font-bold mb-1">Value</div>}>
              <Input
                className="h-12"
                placeholder={
                  "The amount of Balance you wish to send the target address (External Account or Smart Contract)"
                }
              ></Input>
            </FormItem>
          )}
        </Form>
      </div>
    </>
  );
};

export default GovernorSettingsForm;
