export type CharSet = {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  horizontal: string;
  vertical: string;
  topJoin: string;
  bottomJoin: string;
  warn: string;
  info: string;
  bullet: string;
  pairSeparator: string;
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
  warn: "⚠",
  info: "ℹ",
  bullet: "•",
  pairSeparator: "│",
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
  warn: "!",
  info: "i",
  bullet: "*",
  pairSeparator: "|",
};
