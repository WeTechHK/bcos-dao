import React, { useState } from "react";
import { Abi, AbiFunction } from "abitype";
import { Form, Input, Select, Switch } from "antd";
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
        <div className="text-neutral font-medium">CommitteeManager</div>
        <div className="text-neutral">0x0000000000000000000000000000000000010001</div>
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
          <FormItem name="address" label={<div className="text-lg font-bold mb-1">Target Contract Address</div>}>
            <Select options={contractNameSelector} onSelect={handleContractChange} className="h-12"></Select>
          </FormItem>
          <FormItem name="method" label={<div className="text-lg font-bold mb-1">Contract Method</div>}>
            <Select options={contract?.selector} onSelect={handleMethodChange} className="h-12"></Select>
          </FormItem>

          {method && (
            <FormItem name="args" label={<div className="text-lg font-bold mb-1">Method arguments</div>}>
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
            <div className="mb-4 inline-flex gap-2">
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
