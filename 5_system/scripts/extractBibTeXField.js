function extractBibTeXField(tp, field, options = {}) {
  // Get the full content of the current note
  const entry = tp.file.content;

  // Regular expression to match a specified field in the BibTeX entry
  const regex = new RegExp(`${field}\\s*=\\s*\\{(.+?)\\}`, "is");
  const match = regex.exec(entry);

  // Extract the matched content if available, otherwise return an empty string
  let result = match ? match[1] : "";

  // Remove LaTeX-like commands with braces (e.g., \emph{}, \textbf{})
  result = result.replace(/\\[a-zA-Z]+\{([^}]+)\}/g, "$1");

  // Remove standalone LaTeX commands without braces (e.g., \textbf)
  result = result.replace(/\\[a-zA-Z]+/g, "");

  // Iteratively remove any remaining braces while preserving nested text
  while (result.includes("{") || result.includes("}")) {
    result = result.replace(/[{}]/g, "");
  }

  // Handle the "author" field based on provided options
  if (field.toLowerCase() === "author") {
    if (options.firstOnly) {
      const firstAuthor = result.split(" and ")[0].trim();
      return firstAuthor;
    } else if (options.firstLastOnly) {
      const authors = result.split(" and ").map((author) => author.trim());

      const formatLastName = (lastName) => {
        return lastName.replace(/[\s-]+/g, "_").toLowerCase();
      };

      if (authors.length === 1) {
        const lastName = authors[0].split(",")[0].trim();
        return formatLastName(lastName);
      } else if (authors.length === 2) {
        const lastNames = authors.map((author) =>
          formatLastName(author.split(",")[0].trim())
        );
        return `${lastNames[0]}_and_${lastNames[1]}`;
      } else {
        const firstLastName = authors[0].split(",")[0].trim();
        return `${formatLastName(firstLastName)}_et_al`;
      }
    } else {
      return result;
    }
  }

  // Handle the "file" field to format it as a downloadable Markdown link
  if (field.toLowerCase() === "file") {
    // Extract the file path from the "file" field
    const filePath = result.split(/[:;]/)[0].trim(); // Splitting by ":" or ";" to handle multiple formats
    if (!filePath) return ""; // Return empty if no file path is found

    // Display with a file icon if the option is set
    const displayText = options.useIcon ? "📄" : filePath.split("/").pop();

    return `[${displayText}](file://${filePath})`;
  }

  // For other fields, return the cleaned-up result
  return result;
}

module.exports = extractBibTeXField;
