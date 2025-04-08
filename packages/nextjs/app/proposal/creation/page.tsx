"use client";

import React, { ReactElement } from "react";
import dynamic from "next/dynamic";
import {
  BankFilled,
  BuildFilled,
  CaretRightFilled,
  CloseSquareFilled,
  EditFilled,
  FormOutlined,
  PayCircleFilled,
  RocketFilled,
  ToolFilled,
} from "@ant-design/icons";
import "@mdxeditor/editor/style.css";
import { Button, Card, Divider, Flex, Form, Input, Tag, Typography, message } from "antd";
import { default as FormItem } from "antd/es/form/FormItem";
import { default as FormList } from "antd/es/form/FormList";
import type { NextPage } from "next";
import { ChainSystemChangeForm } from "~~/components/proposal/ChainSystemChangeForm";
import CustomActionForm from "~~/components/proposal/CustomActionForm";
import GovernorSettingsForm from "~~/components/proposal/GovernorSettingsForm";
import TransferTokenForm from "~~/components/proposal/TransferTokenForm";
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
            if (!values.actions || values.actions.length === 0) {
              messageApi.error("Please add at least one action");
              return;
            }
            const targets: string[] = [];
            const valuesArray: bigint[] = [];
            const calldatas: string[] = [];
            for (let i = 0; i < values.actions.length; i++) {
              const action = values.actions[i];
              if (!action.calldata || !action.address || action.value === undefined || action.value === null) {
                messageApi.error("Please fill in all fields for Action#" + (i + 1));
                form.scrollToField(["actions", i]);
                return;
              }
              targets.push(action.address);
              valuesArray.push(action.value);
              calldatas.push(action.calldata);
            }
            await submitter(title, targets, valuesArray, calldatas, description);
            messageApi.open({
              type: "success",
              content: "Proposal created successfully",
              onClose: () => {
                window.location.href = "/";
              },
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
          <Tag color="blue" bordered={false} className="text-lg font-bold content-center mb-4">
            Main Information
          </Tag>
          <FormItem
            name="title"
            label={<h3 className="text-lg font-semibold text-gray-900 mb-2">Title</h3>}
            rules={[
              {
                required: true,
                message: "Please enter the title of your proposal",
              },
            ]}
          >
            <Input placeholder="Enter the title of your proposal"></Input>
          </FormItem>
          <FormItem
            name="description"
            label={<h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>}
            rules={[
              {
                required: true,
                message: "Please enter the description of your proposal",
              },
            ]}
          >
            <MDXEditor markdown={""} />
          </FormItem>
        </Card>

        <FormList
          name="actions"
          rules={[
            {
              validator: async () => {
                const value = form.getFieldValue("actions");
                if (!value || value.length === 0) {
                  return Promise.resolve(new Error("Please add at least one action"));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
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
