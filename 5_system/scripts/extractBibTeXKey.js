function extractBibTeXKey(tp) {
  const entry = tp.file.content;
  const regex = new RegExp(`@\\w+\\{([^,]+),`);
  const match = regex.exec(entry);
  return match ? match[1] : "";
}

module.exports = extractBibTeXKey;