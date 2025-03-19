"use client";

import React, { ReactElement, useState } from "react";
import {
  BankFilled,
  BuildFilled,
  CaretRightFilled,
  CloseSquareFilled,
  EditFilled,
  FileMarkdownFilled,
  FormOutlined,
  PayCircleFilled,
  PlusCircleFilled,
  RocketFilled,
  ToolFilled,
} from "@ant-design/icons";
import "@mdxeditor/editor/style.css";
import { uuidv4 } from "@walletconnect/utils";
import { Button, Card, Col, Divider, Flex, Row, Tag, message } from "antd";
import type { NextPage } from "next";
import CustomActionForm from "~~/components/proposal/CustomActionForm";
import GovernorSettingsForm from "~~/components/proposal/GovernorSettingsForm";
import ProposalTextForm from "~~/components/proposal/ProposalTextForm";
import TransferTokenForm from "~~/components/proposal/TransferTokenForm";

type ProposalAction = {
  key: string;
  icon: ReactElement;
  name: string;
  form: ReactElement;
};
// const selectActions: ProposalAction[] = [];
const proposalActions: ProposalAction[] = [
  {
    key: "1",
    icon: <BankFilled style={{ fontSize: "x-large" }} />,
    name: "Governor Settings",
    form: <GovernorSettingsForm />,
  },
  {
    key: "2",
    icon: <ToolFilled style={{ fontSize: "x-large" }} />,
    name: "Chain System Change",
    form: <GovernorSettingsForm />,
  },
  {
    key: "3",
    icon: <PayCircleFilled style={{ fontSize: "x-large" }} />,
    name: "Transfer Token",
    form: <TransferTokenForm />,
  },
  {
    key: "4",
    icon: <BuildFilled style={{ fontSize: "x-large" }} />,
    name: "Custom Action",
    form: <CustomActionForm />,
  },
];

const buttonStyle: React.CSSProperties = {
  fontWeight: "bold",
  fontSize: "medium",
  width: "400px",
  height: "60px",
  justifyContent: "left",
};

const ProposalCreation: NextPage = () => {
  const [messageApi, contextHolder] = message.useMessage();

  const [selectedValue, setSelectedValue] = useState<{ page: string; key: string }>({ page: "proposal-text", key: "" });
  const [selectActions, setSelectActions] = useState<ProposalAction[]>([]);
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
          <Button icon={<RocketFilled />} size="large" color="primary" variant="filled" ghost>
            Submit
          </Button>
        </div>
      </div>
      <Divider />
      <Row>
        <Col span={6}>
          <div className="w-11/12 grid grid-cols-1 gap-4">
            <Button
              block
              icon={<FileMarkdownFilled style={{ fontSize: "x-large" }} />}
              color={selectedValue.page === "proposal-text" ? "primary" : "default"}
              variant={selectedValue.page === "proposal-text" ? "outlined" : "filled"}
              style={{
                justifyContent: "flex-start",
                fontWeight: "bold",
                fontSize: "medium",
                height: "60px",
              }}
              size="large"
              key={"proposal-text"}
              onClick={() => setSelectedValue({ page: "proposal-text", key: "" })}
            >
              Proposal Text
            </Button>
            {/*Select Actions Buttons*/}
            {selectActions.map(action => (
              <Button
                key={action.key}
                block
                icon={action.icon}
                color={selectedValue.page === action.name && selectedValue.key === action.key ? "primary" : "default"}
                variant={selectedValue.page === action.name && selectedValue.key === action.key ? "outlined" : "filled"}
                size="large"
                style={{
                  justifyContent: "flex-start",
                  fontWeight: "bold",
                  fontSize: "medium",
                  height: "60px",
                }}
                onClick={() => setSelectedValue({ page: action.name, key: action.key })}
              >
                {action.name}
              </Button>
            ))}
            <Button
              block
              icon={<PlusCircleFilled />}
              color={selectedValue.page === "add-action" ? "primary" : "default"}
              variant={selectedValue.page === "add-action" ? "outlined" : "filled"}
              size="large"
              key={"add-action"}
              style={{
                fontWeight: "bold",
                fontSize: "medium",
                height: "60px",
              }}
              onClick={() => setSelectedValue({ page: "add-action", key: "" })}
            >
              Add action
            </Button>
          </div>
        </Col>
        {/*Forms Section*/}
        <Col span={18}>
          {selectedValue.page === "proposal-text" && <ProposalTextForm></ProposalTextForm>}
          {selectedValue.page === "add-action" && (
            <>
              <div className="flex justify-between mb-4">
                <div className="inline-grid grid-cols-1 gap-4">
                  <Tag color="blue" bordered={false} className="text-lg font-bold content-center">
                    Action #{selectActions.length + 1}
                  </Tag>
                </div>
                <div className="inline-grid grid-cols-1 gap-4">
                  <Button
                    size="large"
                    icon={<CloseSquareFilled />}
                    color="default"
                    variant="filled"
                    onClick={() => {
                      setSelectedValue({ page: "proposal-text", key: "" });
                    }}
                  >
                    Remove action
                  </Button>
                </div>
              </div>
              <div className="">
                <Card variant="borderless" type="inner" className="mb-3">
                  <Flex vertical gap="large">
                    {proposalActions.map(action => (
                      <Button
                        key={action.key}
                        icon={action.icon}
                        color="default"
                        style={buttonStyle}
                        size="large"
                        onClick={() => {
                          if (selectActions.length >= 10) {
                            messageApi.warning("You can only add up to 10 actions");
                            return;
                          }
                          const newAction = {
                            ...action,
                            key: uuidv4(),
                          };
                          setSelectActions([...selectActions, newAction]);
                        }}
                      >
                        {action.name}
                      </Button>
                    ))}
                  </Flex>
                </Card>
              </div>
            </>
          )}
          {contextHolder}
          {selectActions.map((action, index) => {
            if (selectedValue.page === action.name && selectedValue.key === action.key) {
              return (
                <div key={selectedValue.key}>
                  <div className="flex justify-between mb-4">
                    <div className="inline-grid grid-cols-1 gap-4">
                      <Tag color="blue" bordered={false} className="text-lg font-bold content-center">
                        Action #{index + 1}
                      </Tag>
                    </div>
                    <div className="inline-grid grid-cols-1 gap-4">
                      <Button
                        size="large"
                        icon={<CloseSquareFilled />}
                        color="default"
                        variant="filled"
                        onClick={() => {
                          const newActions = selectActions.filter(a => a.key !== action.key);
                          setSelectActions(newActions);
                          if (index === 0) {
                            setSelectedValue({ page: "proposal-text", key: "" });
                          } else {
                            setSelectedValue({
                              page: selectActions[index - 1].name,
                              key: selectActions[index - 1].key,
                            });
                          }
                        }}
                      >
                        Remove action
                      </Button>
                    </div>
                  </div>
                  {action.form}
                </div>
              );
            }
          })}
        </Col>
      </Row>
    </main>
  );
};

export default ProposalCreation;
