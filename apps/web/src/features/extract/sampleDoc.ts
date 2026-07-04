export type SampleDocPair = {
  label: string;
  value: string;
};

export type SampleDocHeadersBlock = {
  type: "headers";
  headers: SampleDocPair[];
};

export type SampleDocParagraphBlock = {
  type: "paragraph";
  text: string;
};

export type SampleDocFieldsBlock = {
  type: "fields";
  fields: SampleDocPair[];
};

export type SampleDocTableBlock = {
  type: "table";
  headers: string[];
  rows: string[][];
};

export type SampleDocBlock =
  | SampleDocHeadersBlock
  | SampleDocParagraphBlock
  | SampleDocFieldsBlock
  | SampleDocTableBlock;

const HEADER_RE = /^(From|To|Subject|Date|Cc):\s*(.*)$/i;
const FIELD_RE = /^([A-Za-z][A-Za-z ()/%-]{2,40}):\s+(\S.*)$/;

function isTableLine(line: string) {
  const pipeCount = (line.match(/\|/g) ?? []).length;
  const spacedPipeCount = (line.match(/ \| /g) ?? []).length;
  return pipeCount >= 2 || spacedPipeCount >= 2;
}

function parseFieldLine(line: string): SampleDocPair | null {
  const match = line.match(FIELD_RE);
  if (!match) return null;

  const value = match[2].trim();
  if (value.length >= 60) return null;

  return {
    label: match[1].trim(),
    value,
  };
}

function parseDelimitedRow(line: string) {
  return line.split("|").map((cell) => cell.trim());
}

export function parseSampleDoc(text: string): SampleDocBlock[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const blocks: SampleDocBlock[] = [];
  let index = 0;

  const headers: SampleDocPair[] = [];
  while (index < lines.length) {
    const match = lines[index].match(HEADER_RE);
    if (!match) break;

    headers.push({
      label: match[1],
      value: match[2].trim(),
    });
    index += 1;
  }
  if (headers.length > 0) blocks.push({ type: "headers", headers });

  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === "") {
      index += 1;
      continue;
    }

    if (isTableLine(line)) {
      const tableLines: string[] = [];
      while (index < lines.length && isTableLine(lines[index])) {
        tableLines.push(lines[index]);
        index += 1;
      }

      const [headerLine, ...rowLines] = tableLines;
      blocks.push({
        type: "table",
        headers: parseDelimitedRow(headerLine),
        rows: rowLines.map(parseDelimitedRow),
      });
      continue;
    }

    const firstField = parseFieldLine(line);
    if (firstField) {
      const fields = [firstField];
      index += 1;

      while (index < lines.length) {
        const field = parseFieldLine(lines[index]);
        if (!field) break;

        fields.push(field);
        index += 1;
      }

      blocks.push({ type: "fields", fields });
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const paragraphLine = lines[index];
      if (paragraphLine.trim() === "" || isTableLine(paragraphLine) || parseFieldLine(paragraphLine)) break;

      paragraphLines.push(paragraphLine.trim());
      index += 1;
    }

    if (paragraphLines.length > 0) {
      blocks.push({
        type: "paragraph",
        text: paragraphLines.join(" "),
      });
    }
  }

  return blocks;
}
