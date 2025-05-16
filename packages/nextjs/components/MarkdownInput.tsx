"use client";

import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  CreateLink,
  DiffSourceToggleWrapper,
  InsertImage,
  InsertTable,
  ListsToggle,
  MDXEditor,
  Separator,
  UndoRedo,
  diffSourcePlugin,
  frontmatterPlugin,
  headingsPlugin,
  imagePlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  toolbarPlugin,
} from "@mdxeditor/editor";

const allPlugins = () => [
  toolbarPlugin({
    toolbarContents: () => (
      <>
        <UndoRedo />
        <BoldItalicUnderlineToggles />
        <BlockTypeSelect />
        <ListsToggle />
        <Separator />
        <CreateLink />
        <CodeToggle />
        <InsertImage />
        <InsertTable />
        <Separator />
        <DiffSourceToggleWrapper options={["rich-text", "source"]}> </DiffSourceToggleWrapper>
      </>
    ),
  }),
  diffSourcePlugin(),
  listsPlugin(),
  quotePlugin(),
  headingsPlugin(),
  linkPlugin(),
  linkDialogPlugin(),
  // eslint-disable-next-line @typescript-eslint/require-await
  imagePlugin({ imageUploadHandler: async () => "/sample-image.png" }),
  tablePlugin(),
  frontmatterPlugin(),
  markdownShortcutPlugin(),
];

const MarkdownInput = ({
  markdown,
  onChange,
}: {
  markdown: string;
  onChange?: (markdown: string, initialMarkdownNormalize: boolean) => void;
}) => {
  return (
    <MDXEditor
      markdown={markdown}
      className="bg-base-100 full-demo-mdxeditor border-l-2 border-r-2 border-t-2 border-b-2 border-base-300 rounded-lg focus:border-primary"
      contentEditableClassName="!text-base-content prose max-w-full font-sans"
      plugins={allPlugins()}
      onChange={onChange}
    />
  );
};

export default MarkdownInput;
