"use client";

import React, { ReactElement, useState } from "react";
import { InfoCircleFilled } from "@ant-design/icons";
import { Button, Card, Form, Input, Select, Switch } from "antd";
import { erc20Abi } from "viem";
import { useBalance, useDeployContract, useReadContract } from "wagmi";
import { Balance } from "~~/components/scaffold-eth";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";

const TransferTokenForm = ({ index, onChange }: { parentForm?: any; field?: any; index?: any; onChange: any }) => {
  const FormItem = Form.Item;
  const parentForm = Form.useFormInstance();
  const [transferForm] = Form.useForm();
  const [balance, setBalance] = useState<bigint>();
  const [erc20Address, setErc20Address] = useState<string>();
  const { data: VotePower, isLoading: VotePowerLoading } = useDeployedContractInfo({
    contractName: "ERC20VotePower",
  });
  const { data: Timelock, isLoading: TimelockLoading } = useDeployedContractInfo({
    contractName: "CustomTimelockControllerUpgradeable",
  });
  const timelockBalance = useBalance({ address: Timelock?.address });
  const balanceOfERC20 = useReadContract({
    abi: erc20Abi,
    address: erc20Address,
    functionName: "balanceOf",
    args: [Timelock ? Timelock.address : "0x0000000000000000000000000000000000000000"],
  });
  if (VotePowerLoading || TimelockLoading) {
    return (
      <div className="mt-14">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }
  if (!Timelock || !VotePower) {
    return <p className="text-3xl mt-14">No contract found!</p>;
  }

  const currencies = [
    {
      label: "POT",
      value: "pot",
    },
    {
      label: "Vote Power",
      value: VotePower.address,
    },
  ];

  const handleSelect = (value: string) => {
    if (value === "pot") {
      const address = transferForm.getFieldValue("to");
      transferForm.setFieldValue("address", address);
      setBalance(timelockBalance?.data?.value);
    } else {
      setErc20Address(value);
      setBalance(balanceOfERC20?.data);
      // set address = value
      transferForm.setFieldValue("address", value);
    }
  };
  return (
    <>
      <Form
        layout={"vertical"}
        form={transferForm}
        onValuesChange={() => {
          onChange(transferForm.getFieldsValue());
        }}
      >
        <FormItem name="to" label={<div className="text-lg font-bold mb-1">Transfer to</div>}>
          <Input className="h-12" placeholder="0x..."></Input>
        </FormItem>
        <FormItem name="amount" label={<div className="text-lg font-bold mb-1">Transfer Amount</div>}>
          <div className="h-32 text-4xl font-bold border-2 border-b-gray-100 border-solid rounded-lg">
            <div className="flex justify-between items-center">
              <Input className="h-20 text-4xl font-bold w-2/3" variant="borderless" placeholder="0"></Input>
              <FormItem name="currency" className="w-1/6 mr-4 mb-0">
                <Select size="large" options={currencies} onChange={handleSelect}></Select>
              </FormItem>
            </div>
            <div className="flex justify-between h-8 items-center">
              <div className="text-sm text-gray-500 ml-3">Balance: {balance ? balance.toString() : 0}</div>
              <Button color="default" type="link" className="mr-1">
                Use Max
              </Button>
            </div>
          </div>
        </FormItem>
      </Form>
    </>
  );
};

export default TransferTokenForm;
