"use client";

import React, { useEffect, useState } from "react";
import { InfoCircleFilled } from "@ant-design/icons";
import { Abi, AbiFunction } from "abitype";
import { Card, Form, Input, Select, Switch } from "antd";
import { ABIFunctionForm } from "~~/components/proposal/ABIFunctionForm";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { GenericContract, InheritedFunctions } from "~~/utils/scaffold-eth/contract";

const governorSettings = [
  {
    label: <div>Proposal Threshold</div>,
    value: "setProposalThreshold",
  },
  {
    label: <div>Vote Success Threshold</div>,
    value: "setVoteSuccessThreshold",
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
];

const GovernorSettingsForm = ({
  form,
  field,
  index,
  onChange,
}: {
  form?: any;
  field?: any;
  index?: any;
  onChange: any;
}) => {
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
          <FormItem name="address" label={<div className="text-lg font-bold mb-1">Target Contract Address</div>}>
            <Input className="h-12" disabled></Input>
          </FormItem>
          <FormItem name="method" label={<div className="text-lg font-bold mb-1">Contract Method</div>}>
            <Select options={governorSettings} onSelect={handleChange} className="h-12"></Select>
          </FormItem>

          {method && (
            <FormItem name="args" label={<div className="text-lg font-bold mb-1">Method arguments</div>}>
              <div>
                {deployedContractData && method && (
                  <ABIFunctionForm
                    abi={deployedContractData.abi as Abi}
                    abiFunction={method.fn as AbiFunction}
                    onChange={(encodeData: string) => {
                      console.log(encodeData);
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
              <Switch onChange={() => setValueVisible(!valueVisible)}></Switch>
            </div>
          )}

          {valueVisible && (
            <FormItem name="value" label={<div className="text-lg font-bold mb-1">Value</div>}>
              <div className="mb-3">
                The amount of Balance you wish to send the target address (External Account or Smart Contract)
              </div>
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
