declare module "mammoth/mammoth.browser.js" {
  export interface ExtractResult {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }

  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<ExtractResult>;

  const mammoth: { extractRawText: typeof extractRawText };
  export default mammoth;
}
