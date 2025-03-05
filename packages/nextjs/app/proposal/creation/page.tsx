"use client";

import { SetStateAction, useState } from "react";
import dynamic from "next/dynamic";
import {
  CaretRightFilled,
  EditFilled,
  FileMarkdownFilled,
  FormOutlined,
  PlusCircleFilled,
  RocketFilled,
} from "@ant-design/icons";
import "@mdxeditor/editor/style.css";
import { Button, Card, Col, Divider, Form, Input, Row } from "antd";
import type { NextPage } from "next";
import ProposalActions from "~~/components/proposal/ProposalActions";
import ProposalTextForm from "~~/components/proposal/ProposalTextForm";

const ProposalCreation: NextPage = () => {
  const [selectedValue, setSelectedValue] = useState<string | null>("proposal-text");
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
              icon={<FileMarkdownFilled />}
              color={selectedValue === "proposal-text" ? "primary" : "default"}
              variant={selectedValue === "proposal-text" ? "outlined" : "filled"}
              size="large"
              key={"proposal-text"}
              onClick={() => setSelectedValue("proposal-text")}
            >
              Proposal Text
            </Button>
            <Button
              block
              icon={<PlusCircleFilled />}
              color={selectedValue === "add-action" ? "primary" : "default"}
              variant={selectedValue === "add-action" ? "outlined" : "filled"}
              size="large"
              key={"add-action"}
              onClick={() => setSelectedValue("add-action")}
            >
              Add action
            </Button>
          </div>
        </Col>
        <Col span={18}>
          {selectedValue === "proposal-text" && <ProposalTextForm></ProposalTextForm>}
          {selectedValue === "add-action" && <ProposalActions />}
        </Col>
      </Row>
    </main>
  );
};

export default ProposalCreation;
