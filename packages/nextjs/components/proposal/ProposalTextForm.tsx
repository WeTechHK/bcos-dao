import dynamic from "next/dynamic";
import { Card, Form, Input } from "antd";
import { default as FormItem } from "antd/es/form/FormItem";

const MDXEditor = dynamic(() => import("~~/components/MarkdownInput"), { ssr: false });

const ProposalTextForm = ({}) => {
  return (
    <Card>
      <Form layout="vertical" size="large">
        <FormItem label={<h3 className="text-lg font-semibold text-gray-900 mb-2">Title</h3>}>
          <Input placeholder="Enter the title of your proposal"></Input>
        </FormItem>
        <FormItem label={<h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>}>
          <div>
            <MDXEditor markdown={"# test"} />
          </div>
        </FormItem>
      </Form>
    </Card>
  );
};

export default ProposalTextForm;
