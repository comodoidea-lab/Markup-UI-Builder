export const NODE_SCHEMA_DOC = `
ノードはJSONで表現します。利用可能な type:
- "frame": 画面そのもの(ルートのみ)。children を持つ。
- "box": flexコンテナ。children を持つ。
- "text": テキスト。"text" プロパティ必須。
- "button": ボタン。"text" プロパティ必須。
- "image": 画像プレースホルダ。"src" は省略可(灰色プレースホルダになる)。
- "input": テキスト入力。"placeholder" を指定。

各ノード: { "type": "...", "name": "短い説明", "text"?, "src"?, "placeholder"?, "style": {...}, "children"?: [...] }

style で使えるキー(すべて任意):
- direction: "row" | "column" (コンテナの並び方向)
- gap: number(px), paddingX: number, paddingY: number
- align: "start"|"center"|"end"|"stretch", justify: "start"|"center"|"end"|"between"
- width / height: number(px) | "fill"(親いっぱい) | "hug"(内容に合わせる)
- background: CSS色, color: 文字色, borderColor, borderWidth: number
- radius: number(px), shadow: "none"|"sm"|"md"|"lg", opacity: 0-1
- fontSize: number(px), fontWeight: 100-900, textAlign: "left"|"center"|"right"
- lineHeight: number(倍率), letterSpacing: number(px)

ルール:
- ルートは type "frame"。frame の style.width / style.height は変更しないでください(指定された画面サイズを使う)。
- レイアウトはすべて flex(direction/gap/padding/align/justify)で組む。絶対配置はない。
- 余白・階層・タイポグラフィに気を配り、実在のプロダクトのような完成度の高いUIにする。
- 色は具体的なhex値で指定し、一貫したカラーパレットを使う。
- テキストは日本語で、現実的な内容にする(lorem ipsumは禁止)。
`;

export function generateFramePrompt(
  userPrompt: string,
  width: number,
  height: number,
  hasImage: boolean,
): { system: string; user: string } {
  return {
    system: `あなたは一流のUIデザイナーです。ユーザーの要望から、モダンで美しいUI画面をノードツリーJSONとして設計します。
${NODE_SCHEMA_DOC}
出力は説明文なしで、JSONオブジェクト(ルートframe)のみを返してください。`,
    user: `${hasImage ? "添付画像を参考に、" : ""}次の要望のUI画面を ${width}x${height}px の frame として設計してください。

要望: ${userPrompt}

JSONのみを出力してください。frame の style は {"width": ${width}, "height": ${height}, "background": "...", "direction": "column", ...} としてください。`,
  };
}

export function editNodePrompt(
  nodeJson: string,
  instruction: string,
  isFrame: boolean,
): { system: string; user: string } {
  return {
    system: `あなたは一流のUIデザイナーです。既存のUIノードツリーJSONを、指示に従って修正します。
${NODE_SCHEMA_DOC}
出力は説明文なしで、修正後のノードJSONのみを返してください。指示と無関係な部分は変更しないでください。`,
    user: `次の${isFrame ? "画面(frame)" : "ノード"}を修正してください。

現在のノード:
\`\`\`json
${nodeJson}
\`\`\`

修正指示: ${instruction}

修正後のノードJSONのみを出力してください。ルートの type は "${isFrame ? "frame" : "同じtype"}" を維持してください。`,
  };
}

export function reviewFixPrompt(reviewPrompt: string, frameJson: string): { system: string; user: string } {
  return {
    system: `あなたは一流のUIデザイナーです。UIレビューの注釈指示に従い、画面のノードツリーJSONを修正します。
${NODE_SCHEMA_DOC}
出力は説明文なしで、修正後のframe JSONのみを返してください。`,
    user: `次のレビュー指示に従って画面を修正してください。

${reviewPrompt}

現在の画面:
\`\`\`json
${frameJson}
\`\`\`

修正後のframe JSONのみを出力してください。`,
  };
}
