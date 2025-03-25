"use client";

import React, { ReactElement, createElement, useReducer, useState } from "react";
import dynamic from "next/dynamic";
import {
  BankFilled,
  BuildFilled,
  CaretRightFilled,
  CloseSquareFilled,
  EditFilled,
  FileMarkdownFilled,
  FormOutlined,
  InboxOutlined,
  InfoCircleFilled,
  PayCircleFilled,
  PlusCircleFilled,
  RocketFilled,
  ToolFilled,
} from "@ant-design/icons";
import "@mdxeditor/editor/style.css";
import { uuidv4 } from "@walletconnect/utils";
import {
  Button,
  Card,
  Col,
  Divider,
  Flex,
  Form,
  FormInstance,
  Input,
  Row,
  Select,
  Switch,
  Tag,
  Typography,
  UploadProps,
  message,
} from "antd";
import { default as FormItem } from "antd/es/form/FormItem";
import { default as FormList } from "antd/es/form/FormList";
import Dragger from "antd/es/upload/Dragger";
import type { NextPage } from "next";
import { erc20Abi } from "viem";
import { ChainSystemChangeForm } from "~~/components/proposal/ChainSystemChangeForm";
import CustomActionForm, { actionSelectOptions } from "~~/components/proposal/CustomActionForm";
import GovernorSettingsForm from "~~/components/proposal/GovernorSettingsForm";
import ProposalTextForm from "~~/components/proposal/ProposalTextForm";
import TransferTokenForm from "~~/components/proposal/TransferTokenForm";
import deployedContracts from "~~/contracts/deployedContracts";
import { useProposeProposal } from "~~/hooks/blockchain/BCOSGovernor";

type ProposalAction = {
  key: string;
  name: string;
  abi: any[];
  address: string;
  method: string;
  calldata: string;
  value: bigint;
};

type ProposalPresentation = {
  key: string;
  icon: ReactElement;
  name: string;
};

// const selectActions: ProposalAction[] = [];
const proposalPresentations: ProposalPresentation[] = [
  {
    key: "1",
    icon: <BankFilled style={{ fontSize: "x-large" }} />,
    name: "Governor Settings",
  },
  {
    key: "2",
    icon: <ToolFilled style={{ fontSize: "x-large" }} />,
    name: "Chain System Change",
  },
  {
    key: "3",
    icon: <PayCircleFilled style={{ fontSize: "x-large" }} />,
    name: "Transfer Token",
  },
  {
    key: "4",
    icon: <BuildFilled style={{ fontSize: "x-large" }} />,
    name: "Custom Action",
  },
];

const findProposalForm = (name: string, args: any) => {
  switch (name) {
    case "Governor Settings":
      return <GovernorSettingsForm {...args} />;
    case "Chain System Change":
      return <ChainSystemChangeForm {...args} />;
    case "Transfer Token":
      return <TransferTokenForm {...args} />;
    case "Custom Action":
      return <CustomActionForm {...args} />;
    default:
      return null;
  }
};

const MDXEditor = dynamic(() => import("~~/components/MarkdownInput"), { ssr: false });

type ProposalStorage = {
  title: string;
  description: string;
  actions: ProposalAction[];
};

const ProposalCreation: NextPage = () => {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const submitter = useProposeProposal();

  return (
    <main className="container mx-auto w-full px-4 py-6">
      <div className="flex justify-between">
        <div className="inline-grid grid-cols-2 gap-4">
          <Button icon={<EditFilled />} size="large" color="default" variant="filled">
            Edit
          </Button>
          <Button icon={<CaretRightFilled />} size="large" color="default" variant="filled">
            Preview
          </Button>
        </div>
        <div className="inline-grid grid-cols-2 gap-4">
          <Button icon={<FormOutlined />} size="large" color="default" variant="filled">
            Save Draft
          </Button>
          <Button
            icon={<RocketFilled />}
            size="large"
            color="primary"
            variant="filled"
            ghost
            htmlType={"submit"}
            onClick={() => {
              form.submit();
            }}
          >
            Submit
          </Button>
        </div>
      </div>
      <Divider />
      <div>{contextHolder}</div>
      <Form
        form={form}
        layout="vertical"
        size="large"
        onFinish={async (values: ProposalStorage) => {
          try {
            console.log("onFinish", values);
            const title = values.title;
            const description = values.description;
            const targets = values.actions?.map(action => action.address);
            const valuesArray = values.actions?.map(action => action.value);
            const calldatas = values.actions?.map(action => action.calldata);
            await submitter(
              title,
              targets ? targets : [],
              valuesArray ? valuesArray : [],
              calldatas ? calldatas : [],
              description,
            );
            messageApi.open({
              type: "success",
              content: "Proposal created successfully",
            });
          } catch (error) {
            messageApi.open({
              type: "error",
              content: "Failed to create proposal",
            });
          }
        }}
      >
        <Card>
          <FormItem name="title" label={<h3 className="text-lg font-semibold text-gray-900 mb-2">Title</h3>}>
            <Input placeholder="Enter the title of your proposal"></Input>
          </FormItem>
          <FormItem
            name="description"
            label={<h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>}
          >
            <MDXEditor markdown={""} />
          </FormItem>
        </Card>

        <FormList name="actions">
          {(fields: any, { add, remove }) => (
            <>
              {fields.map((field: any, index: number) => {
                console.log(field);
                return (
                  <Card key={field.key} className="mb-3 mt-3">
                    {/*actions and remove*/}
                    <div className="flex justify-between mb-4">
                      <div className="inline-grid grid-cols-1 gap-4">
                        <Tag color="blue" bordered={false} className="text-lg font-bold content-center">
                          {"Action #" + (index + 1).toString() + ": " + form.getFieldValue(["actions", index, "name"])}
                        </Tag>
                      </div>
                      <div className="inline-grid grid-cols-1 gap-4">
                        <Button
                          size="large"
                          icon={<CloseSquareFilled />}
                          color="default"
                          variant="filled"
                          onClick={() => {
                            remove(field.name);
                          }}
                        >
                          Remove action
                        </Button>
                      </div>
                    </div>
                    <FormItem noStyle shouldUpdate>
                      {({ getFieldValue }) => {
                        const actionName = getFieldValue(["actions", index, "name"]);
                        const action = proposalPresentations.find(action => action.name === actionName);
                        if (!action) return null;
                        const onChange = (value: any) => {
                          console.log("onChange", value);
                          const actions = form.getFieldValue(["actions", index]);
                          form.setFieldValue(["actions", index], { ...actions, ...value });
                        };
                        return findProposalForm(actionName, {
                          parentForm: form,
                          field,
                          index,
                          onChange,
                        });
                      }}
                    </FormItem>
                  </Card>
                );
              })}

              {/*add actions*/}
              <FormItem noStyle>
                <Card variant="borderless" type="inner" className="mb-3 mt-3">
                  <Flex gap="large">
                    {proposalPresentations.map(action => (
                      <Button
                        key={action.key}
                        icon={action.icon}
                        color="default"
                        style={{
                          fontWeight: "bold",
                          fontSize: "medium",
                          width: "400px",
                          height: "60px",
                          justifyContent: "left",
                        }}
                        size="large"
                        onClick={() => {
                          add({ name: action.name, value: 0, calldata: "" });
                        }}
                      >
                        {action.name}
                      </Button>
                    ))}
                  </Flex>
                </Card>
              </FormItem>
            </>
          )}
        </FormList>
        <Form.Item noStyle shouldUpdate>
          {() => (
            <Typography>
              <pre>{JSON.stringify(form.getFieldsValue(), null, 2)}</pre>
            </Typography>
          )}
        </Form.Item>
      </Form>
    </main>
  );
};

export default ProposalCreation;
