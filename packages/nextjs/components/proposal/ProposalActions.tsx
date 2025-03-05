import { CloseSquareFilled } from "@ant-design/icons";
import {Button, Card, Tag} from "antd";

const ProposalActions = () => {
  return (
    <>
      <div className="flex justify-between mb-4">
        <div className="inline-grid grid-cols-1 gap-4">
          <Tag color="blue" bordered={false} className="text-lg font-bold content-center">
            Action #1
          </Tag>
        </div>
        <div className="inline-grid grid-cols-1 gap-4">
          <Button size="large" icon={<CloseSquareFilled />} color="default" variant="filled">
            Remove action
          </Button>
        </div>
      </div>
      <div className="">
        <Card>

        </Card>
      </div>
    </>
  );
};

export default ProposalActions;
