"use client";

import React, { useState } from "react";
import { InfoCircleFilled } from "@ant-design/icons";
import { Card, Form, Input, Select, Switch } from "antd";

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

const GovernorSettingsForm = ({}) => {
  const FormItem = Form.Item;
  const [valueVisible, setValueVisible] = useState<boolean>(false);
  return (
    <>
      <Card variant="borderless" type="inner" className="mb-3">
        <Form layout={"vertical"}>
          <FormItem name="targetAddress" label={<div className="text-lg font-bold mb-1">Target Contract Address</div>}>
            <Input className="h-12"></Input>
          </FormItem>
          <FormItem name="method" label={<div className="text-lg font-bold mb-1">Contract Method</div>}>
            <Select options={governorSettings} className="h-12"></Select>
            <div className="inline-flex gap-2">
              <InfoCircleFilled style={{ color: "orange" }}></InfoCircleFilled>
              <div> This ABI is a standard. Please, be sure the smart contract implements the method you selected.</div>
            </div>
          </FormItem>
          <FormItem name="calldata" label={<div className="text-lg font-bold mb-1">Calldatas</div>}>
            <div className="mb-3">The data for the function arguments you wish to send when the action executes</div>
            <Input className="h-12"></Input>
          </FormItem>
          <div className="mb-4 inline-flex gap-2">
            <div>Also send Ether to the target address? (this is not common)</div>
            <Switch onChange={() => setValueVisible(!valueVisible)}></Switch>
          </div>
          {valueVisible && (
            <FormItem name="value" label={<div className="text-lg font-bold mb-1">Value</div>}>
              <div className="mb-3">
                The amount of Balance you wish to send the target address (External Account or Smart Contract)
              </div>
              <Input prefix="ETH" className="h-12"></Input>
            </FormItem>
          )}
        </Form>
      </Card>
    </>
  );
};

export default GovernorSettingsForm;
