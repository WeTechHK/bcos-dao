import { Dispatch, SetStateAction } from "react";
import dynamic from "next/dynamic";
import { Card, Form, Input } from "antd";
import { default as FormItem } from "antd/es/form/FormItem";

type ProposalTextFormProps = {
  proposalText: {
    title: string;
    description: string;
  };
  onProposalTextChange: (body: any) => void;
};

const MDXEditor = dynamic(() => import("~~/components/MarkdownInput"), { ssr: false });

const ProposalTextForm = ({ proposalText, onProposalTextChange }: ProposalTextFormProps) => {
  return (
    proposalText && (
      <Card>
        <Form
          initialValues={proposalText}
          layout="vertical"
          size="large"
          onValuesChange={e => {
            console.log("onValuesChange", e);
            onProposalTextChange(e);
          }}
        >
          <FormItem name="title" label={<h3 className="text-lg font-semibold text-gray-900 mb-2">Title</h3>}>
            <Input placeholder="Enter the title of your proposal"></Input>
          </FormItem>
          <FormItem
            name="description"
            label={<h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>}
          >
            <div>
              <MDXEditor markdown={proposalText.description} />
            </div>
          </FormItem>
        </Form>
      </Card>
    )
  );
};

export default ProposalTextForm;
