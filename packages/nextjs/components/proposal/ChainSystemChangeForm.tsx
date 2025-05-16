import React, { useState } from "react";
import { Abi, AbiFunction } from "abitype";
import { ConfigProvider, Form, Input, Select, Switch } from "antd";
import { ABIFunctionForm } from "~~/components/proposal/ABIFunctionForm";
import CommitteeManagerABI from "~~/contracts/abi/CommitteeManager.json";

const committeeSettings = [
  {
    label: <div>Change Chain System Config</div>,
    value: "createSetSysConfigProposal",
  },
  {
    label: <div>Change Consensus Config</div>,
    value: "createSetConsensusWeightProposal",
  },
  {
    label: <div>Remove Node</div>,
    value: "createRmNodeProposal",
  },
  {
    label: <div>Change ACL for Contract Deployment</div>,
    value: "createSetDeployAuthTypeProposal",
  },
  {
    label: <div>Change Deployment Permission of a Specific EOA</div>,
    value: "createModifyDeployAuthProposal",
  },
  {
    label: <div>Reset Admin of a Specific Contract</div>,
    value: "createResetAdminProposal",
  },
];

const contractNameSelector = [
  {
    label: (
      <div className="flex justify-between">
        <div className="font-medium">CommitteeManager</div>
        <div className="">0x0000000000000000000000000000000000010001</div>
      </div>
    ),
    value: "0x0000000000000000000000000000000000010001",
    abi: CommitteeManagerABI.abi,
    selector: committeeSettings,
  },
];

export const ChainSystemChangeForm = ({
  index,
  onChange,
}: {
  parentForm?: any;
  field?: any;
  index?: any;
  onChange: any;
}) => {
  const parentForm = Form.useFormInstance();
  const FormItem = Form.Item;
  const [valueVisible, setValueVisible] = useState<boolean>(false);
  const [contract, setContract] = useState<{ address: string; abi: any[]; selector: any[] }>();
  const [method, setMethod] = useState<{ fn: AbiFunction }>();
  const [sysForm] = Form.useForm();

  const handleContractChange = (value: string) => {
    const selectedContract = contractNameSelector.find(contract => contract.value === value);
    if (selectedContract) {
      setContract({
        address: selectedContract.value,
        abi: selectedContract.abi,
        selector: selectedContract.selector,
      });
      sysForm.setFieldValue("address", selectedContract.value);
      parentForm.setFieldValue(["actions", index, "address"], selectedContract.value);
    }
  };

  const handleMethodChange = (value: string) => {
    if (!contract) {
      return;
    }
    const functionsToDisplay = ((contract.abi as Abi).filter(part => part.type === "function") as AbiFunction[])
      .filter(fn => {
        return fn.stateMutability !== "view" && fn.stateMutability !== "pure" && fn.name === value;
      })
      .map(fn => {
        return { fn };
      });

    if (!functionsToDisplay.length) {
      return <>No write methods</>;
    }
    if (functionsToDisplay.length > 0) {
      setMethod({ fn: functionsToDisplay[0].fn });
    }
  };

  return (
    <>
      <div className="mb-3">
        <Form
          layout={"vertical"}
          form={sysForm}
          onValuesChange={() => {
            onChange(sysForm.getFieldsValue());
          }}
        >
          <ConfigProvider
            theme={{
              components: {
                Select: {
                  colorText: "var(--fallback-bc,oklch(var(--bc)/var(--tw-text-opacity, 1)))",
                  colorBgElevated: "var(--fallback-bc,oklch(var(--bc)/var(--tw-text-opacity, 1)))",
                  colorTextPlaceholder: "var(--fallback-bc,oklch(var(--bc)/var(--tw-text-opacity, 1)))",
                  colorBorder: "var(--fallback-b3,oklch(var(--b3)/var(--tw-border-opacity, 1)))",
                  selectorBg: "var(--fallback-b1,oklch(var(--b1)/var(--tw-bg-opacity, 1)))",
                  optionActiveBg: "var(--fallback-b1,oklch(var(--b1)/var(--tw-bg-opacity, 1)))",
                  optionSelectedBg: "var(--fallback-b3,oklch(var(--b3)/var(--tw-border-opacity, 1)))",
                },
              },
            }}
          >
            <FormItem
              name="address"
              label={<div className="text-lg font-bold mb-1 text-base-content">Target Contract Address</div>}
            >
              <Select
                dropdownStyle={{ backgroundColor: "var(--fallback-b1,oklch(var(--b1)/var(--tw-bg-opacity, 1)))" }}
                options={contractNameSelector}
                onSelect={handleContractChange}
                className="h-12"
              ></Select>
            </FormItem>
            <FormItem
              name="method"
              label={<div className="text-lg font-bold mb-1 text-base-content">Contract Method</div>}
            >
              <Select
                dropdownStyle={{ backgroundColor: "var(--fallback-b1,oklch(var(--b1)/var(--tw-bg-opacity, 1)))" }}
                options={contract?.selector}
                onSelect={handleMethodChange}
                className="h-12"
              ></Select>
            </FormItem>
          </ConfigProvider>

          {method && (
            <FormItem
              name="args"
              label={<div className="text-lg font-bold mb-1 text-base-content">Method arguments</div>}
            >
              <div>
                {contract && method && (
                  <ABIFunctionForm
                    abi={contract.abi as Abi}
                    abiFunction={method.fn as AbiFunction}
                    onChange={(encodeData: string) => {
                      console.log(encodeData);
                      parentForm.setFieldValue(["actions", index, "calldata"], encodeData);
                    }}
                    inheritedFrom={""}
                  />
                )}
              </div>
            </FormItem>
          )}

          {method && (
            <div className="mb-4 inline-flex gap-2 text-base-content">
              <div>Also send TOKEN to the target address? (this is not common)</div>
              <Switch
                onChange={() => {
                  setValueVisible(!valueVisible);
                  sysForm.setFieldValue("value", "0");
                  parentForm.setFieldValue(["actions", index, "value"], "0");
                }}
              ></Switch>
            </div>
          )}

          {valueVisible && (
            <FormItem name="value" label={<div className="text-lg font-bold mb-1 text-base-content">Value</div>}>
              <input
                className="text-base w-full h-12 rounded-xl bg-base-100 text-base-content/70 p-4 border-2 border-base-300 focus:border-primary focus:outline-none"
                placeholder={
                  "The amount of Balance you wish to send the target address (External Account or Smart Contract)"
                }
              ></input>
            </FormItem>
          )}
        </Form>
      </div>
    </>
  );
};
