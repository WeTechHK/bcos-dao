import React, { useState } from "react";
import { InboxOutlined, InfoCircleFilled } from "@ant-design/icons";
import { Card, Form, Input, Select, Switch, Upload, UploadProps, message } from "antd";

const actionSelectOptions = [
  {
    label: <div>ERC-20</div>,
    value: "erc20",
    abi: [],
  },
  {
    label: <div>ERC-721</div>,
    value: "erc721",
    abi: [],
  },
  {
    label: <div>ERC-1155</div>,
    value: "erc1155",
    abi: [],
  },
  {
    label: <div>ERC-5805</div>,
    value: "erc5805",
    abi: [],
  },
  {
    label: <div>OpenZeppelin Governor</div>,
    value: "ozGovernor",
    abi: [],
  },
  {
    label: <div>OpenZeppelin Timelock</div>,
    value: "ozTimelock",
    abi: [],
  },
  {
    label: <div>Upload an ABI</div>,
    value: "uploadABI",
    abi: [],
  },
];

const props: UploadProps = {
  name: "file",
  multiple: true,
  action: "",
  onChange(info) {
    const { status } = info.file;
    if (status !== "uploading") {
      console.log(info.file, info.fileList);
    }
    if (status === "done") {
      message.success(`${info.file.name} file uploaded successfully.`).then();
    } else if (status === "error") {
      message.error(`${info.file.name} file upload failed.`).then();
    }
  },
  onDrop(e) {
    console.log("Dropped files", e.dataTransfer.files);
  },
};

const CustomActionForm = ({}) => {
  const FormItem = Form.Item;
  const { Dragger } = Upload;

  const onChangeSelect = (value: string) => {
    if (value === "uploadABI") {
      setDraggerVisible(true);
    } else {
      setDraggerVisible(false);
    }
  };

  const [valueVisible, setValueVisible] = useState<boolean>(false);
  const [draggerVisible, setDraggerVisible] = useState<boolean>(false);
  return (
    <>
      <Card variant="borderless" type="inner" className="mb-3">
        <Form layout={"vertical"}>
          <FormItem name="targetAddress" label={<div className="text-lg font-bold mb-1">Target Contract Address</div>}>
            <Input className="h-12"></Input>
          </FormItem>
          <FormItem
            name="abi"
            label={<div className="text-lg font-bold mb-1">Use the imported ABI or upload yours</div>}
          >
            <Select
              options={actionSelectOptions}
              className="h-12"
              defaultActiveFirstOption={true}
              placeholder={"Use the imported ABI"}
              onChange={onChangeSelect}
            ></Select>
          </FormItem>
          {draggerVisible && (
            <div className="mb-4">
              <Dragger {...props}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">Click or drag file to this area to upload your ABI file</p>
                <p className="ant-upload-hint">
                  Support for a single or bulk upload. Strictly prohibited from uploading company data or other banned
                  files.
                </p>
              </Dragger>
            </div>
          )}

          <FormItem name="method" label={<div className="text-lg font-bold mb-1">Contract Method</div>}>
            <Select className="h-12"></Select>
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
            <div>Also send Token to the target address? (this is not common)</div>
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

export default CustomActionForm;
