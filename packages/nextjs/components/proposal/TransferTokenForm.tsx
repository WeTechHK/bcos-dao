"use client";

import React, { useState } from "react";
import { InfoCircleFilled } from "@ant-design/icons";
import {Button, Card, Form, Input, Select, Switch} from "antd";

const TransferTokenForm = ({}) => {
  const FormItem = Form.Item;
  return (
    <>
      <Card>
        <Form layout={"vertical"}>
          <FormItem name="to" label={<div className="text-lg font-bold mb-1">Transfer to</div>}>
            <Input className="h-12" placeholder="0x..."></Input>
          </FormItem>
          <FormItem name="amount" label={<div className="text-lg font-bold mb-1">Transfer Amount</div>}>
            <Input className="h-20 text-4xl font-bold" placeholder="0"></Input>
          </FormItem>
        </Form>
      </Card>
    </>
  );
};

export default TransferTokenForm;
