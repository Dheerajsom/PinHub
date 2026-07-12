export type CharSet = {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  horizontal: string;
  vertical: string;
  topJoin: string;
  bottomJoin: string;
  danger?: string;
  warn: string;
  info: string;
  note?: string;
  bullet: string;
  pairSeparator: string;
  dash?: string;
  itemSeparator?: string;
};

export const unicodeChars: CharSet = {
  topLeft: "┌",
  topRight: "┐",
  bottomLeft: "└",
  bottomRight: "┘",
  horizontal: "─",
  vertical: "│",
  topJoin: "┬",
  bottomJoin: "┴",
  danger: "✖",
  warn: "⚠",
  info: "ℹ",
  note: "†",
  bullet: "•",
  pairSeparator: "│",
  dash: "—",
  itemSeparator: "·",
};

export const asciiChars: CharSet = {
  topLeft: "+",
  topRight: "+",
  bottomLeft: "+",
  bottomRight: "+",
  horizontal: "-",
  vertical: "|",
  topJoin: "+",
  bottomJoin: "+",
  danger: "X",
  warn: "!",
  info: "i",
  note: "^",
  bullet: "*",
  pairSeparator: "|",
  dash: "-",
  itemSeparator: ".",
};
