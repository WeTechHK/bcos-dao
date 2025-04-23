"use client";

import React, { useState } from "react";
import * as AddressUtils from "@ethersproject/address";
import { BigNumber } from "@ethersproject/bignumber";
import { WeiPerEther } from "@ethersproject/constants";
import { BigIntDecimal } from "@rc-component/mini-decimal";
import { Button, Form, Input, Select } from "antd";
import { erc20Abi } from "viem";
import { Abi, encodeFunctionData } from "viem";
import { useBalance, useReadContract } from "wagmi";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { formatToken } from "~~/utils/TokenFormatter";

const TransferTokenForm = ({ index, onChange }: { parentForm?: any; field?: any; index?: any; onChange: any }) => {
  const FormItem = Form.Item;
  const parentForm = Form.useFormInstance();
  const [transferForm] = Form.useForm();
  const [balance, setBalance] = useState<bigint>();
  const { data: VotePower, isLoading: VotePowerLoading } = useDeployedContractInfo({
    contractName: "ERC20VotePower",
  });
  const { data: Timelock, isLoading: TimelockLoading } = useDeployedContractInfo({
    contractName: "CustomTimelockControllerUpgradeable",
  });
  const timelockBalance = useBalance({ address: Timelock?.address });
  const balanceOfERC20 = useReadContract({
    abi: erc20Abi,
    address: VotePower?.address,
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
      transferForm.setFieldValue("amount", "0");
      setBalance(timelockBalance?.data?.value);
    } else {
      setBalance(balanceOfERC20?.data);
      // set address = value
      transferForm.setFieldValue("address", value);
      transferForm.setFieldValue("amount", "0");
    }
    onChangeForm();
  };

  const handleUseMax = () => {
    if (!balance) return;
    console.log("handleUseMax", balance);
    const amount = BigNumber.from(balance).div(WeiPerEther);
    transferForm.setFieldValue("amount", amount.toBigInt().toString());
    onChangeForm();
  };

  const onChangeForm = () => {
    const values = transferForm.getFieldsValue();
    const { to, amount, currency } = values;

    if (!amount || !to) {
      return;
    }

    const value = BigInt(parseFloat(amount) * 10 ** 18);

    // 计算 calldata
    if (currency === "pot") {
      parentForm.setFieldValue(["actions", index, "calldata"], "0x");
      parentForm.setFieldValue(["actions", index, "address"], to);
      parentForm.setFieldValue(["actions", index, "value"], value.toString());
      return;
    }

    const calldata = encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [to, BigInt(value)],
    });

    parentForm.setFieldValue(["actions", index, "address"], VotePower?.address);
    parentForm.setFieldValue(["actions", index, "value"], "0");
    parentForm.setFieldValue(["actions", index, "calldata"], calldata);
  };

  return (
    <>
      <Form
        layout={"vertical"}
        form={transferForm}
        onValuesChange={() => {
          onChangeForm();
          onChange(transferForm.getFieldsValue());
        }}
        initialValues={{
          currencies: "pot",
        }}
      >
        <FormItem
          name="to"
          label={<div className="text-lg font-bold mb-1">Transfer to</div>}
          rules={[
            {
              required: true,
              message: "Please input valid EIP-55 address!",
              validator: (_, value) => {
                if (value && !AddressUtils.isAddress(value)) {
                  return Promise.reject(new Error("Invalid address!"));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input className="h-12" placeholder="0x..."></Input>
        </FormItem>
        <FormItem label={<div className="text-lg font-bold mb-1">Transfer Amount</div>}>
          <div className="h-32 text-4xl font-bold border-2 border-b-gray-100 border-solid rounded-lg">
            <div className="flex justify-between items-center">
              <FormItem
                name="amount"
                noStyle
                rules={[
                  {
                    required: true,
                    validator: (_, value) => {
                      if (value && !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) {
                        return Promise.reject(new Error("Invalid amount!"));
                      }
                      if (value && balance && BigInt(value * 10 ** 18) > balance) {
                        return Promise.reject(new Error("Amount exceeds balance!"));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input className="h-20 text-4xl font-bold w-2/3" variant="borderless" placeholder="0"></Input>
              </FormItem>
              <FormItem name="currency" className="w-1/6 mr-4 mb-0">
                <Select size="large" options={currencies} onChange={handleSelect}></Select>
              </FormItem>
            </div>
            <div className="flex justify-between h-8 items-center">
              <div className="text-sm text-gray-500 ml-3">Balance: {formatToken(balance).toFixed(4)}</div>
              <Button color="default" type="link" className="mr-1" onClick={handleUseMax}>
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
