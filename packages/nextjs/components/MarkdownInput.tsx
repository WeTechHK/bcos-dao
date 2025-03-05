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

const MarkdownInput = ({ markdown }: { markdown: string }) => {
  return (
    <MDXEditor
      markdown={markdown}
      className="full-demo-mdxeditor"
      contentEditableClassName="prose max-w-full font-sans"
      plugins={allPlugins()}
    />
  );
};

export default MarkdownInput;
