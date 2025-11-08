<%*
try {
  const content = tp.file.content || "";

  // Extract meeting date/time
  const dateMatch = content.match(/(\w+\s\d{1,2},\s\d{4})\sat\s(\d{1,2}:\d{2}\s?[AP]M)\sto\s(\d{1,2}:\d{2}\s?[AP]M)/i);

  // Defaults
  let meetingDate = tp.date.now("YYYY-MM-DD");
  let meetingTime = tp.date.now("HH-mm");
  let dailyTag = "daily/" + tp.date.now("YYYY/MM");

  // Parse + rename if possible
  if (dateMatch) {
    const parsedDate = moment(dateMatch[1], "MMM D, YYYY");
    const parsedStart = moment(dateMatch[2], "h:mm A");
    const parsedEnd   = moment(dateMatch[3], "h:mm A");
    if (parsedDate.isValid() && parsedStart.isValid() && parsedEnd.isValid()) {
      meetingDate = parsedDate.format("YYYY-MM-DD");
      meetingTime = parsedStart.format("HH-mm");
      dailyTag = "daily/" + parsedDate.format("YYYY/MM");
      await tp.file.rename(meetingDate + "_" + meetingTime);
    }
  }

  // Description = first non-empty line
  const firstLine = (content.split("\n").find(l => l.trim() !== "") || "");
  const description = firstLine.replace(/\*\*/g, "");

  // Escape for YAML
  const esc = (s) => (s || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  // Extract attendees (same logic as before)
  const extractAttendees = (txt) => {
    const blocks = [];
    const blockLabelRe = /(Attendees|Participants|Required attendees?|Optional|Invitees)\s*:?\s*([\s\S]*?)(?:\n\s*\n|$)/ig;
    let m;
    while ((m = blockLabelRe.exec(txt)) !== null) blocks.push(m[2]);

    const whoLineRe = /^Who:\s*(.+)$/igm;
    let w;
    while ((w = whoLineRe.exec(txt)) !== null) blocks.push(w[1]);

    if (blocks.length === 0) {
      const emailLines = txt.split("\n").filter(l => /@/.test(l));
      if (emailLines.length) blocks.push(emailLines.join(", "));
    }

    const tokens = blocks.join("\n").split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    const seen = new Set();
    const results = [];

    for (const token of tokens) {
      const emailMatch = token.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
      const email = emailMatch ? emailMatch[0] : null;
      let name = token;
      if (email) name = name.replace(email, "");
      name = name.replace(/[<>()"]/g, " ").replace(/\s+/g, " ").trim();

      if (/^(attendees?|participants?|required|optional|invitees|who)\s*:?$/i.test(name)) continue;

      let label = null;
      if (name && email) label = `${name} <${email}>`;
      else if (email) label = email;
      else if (name) label = name;

      if (label && !seen.has(label.toLowerCase())) {
        seen.add(label.toLowerCase());
        results.push(label);
      }
    }

    return results.filter(v => !/^(unknown|tbd|n\/a)$/i.test(v));
  };

  const attendees = extractAttendees(content);

  // Build YAML pieces
  const yamlTop = [
    "---",
    "date: " + meetingDate,
    "type: meeting",
    "tags:",
    "  - " + dailyTag,
    "attendees:",
    ...(attendees.length ? attendees.map(a => `  - "${esc(a)}"`) : ['  - ', '  - ']),
    `description: "${esc(description)}"`,
    "---"
  ].join("\n");

  const body = [
    "",
    "## Agenda/Questions",
    "- ",
    "",
    "---",
    "",
    "## Notes"
  ].join("\n");

  // Compose and **force** YAML to be the very first thing
  let finalRaw = yamlTop + "\n" + body;

  // Extra safeguards:
  // 1) Normalize line endings
  finalRaw = finalRaw.replace(/\r\n/g, "\n");
  // 2) Strip BOM and any leading whitespace/zero-width chars
  finalRaw = finalRaw.replace(/^\uFEFF/, "").replace(/^[\s\u200B]+/, "");
  // 3) If anything still crept in before the first '---', drop everything up to it
  let finalContent = finalRaw.replace(/^[\s\S]*?(?=---)/, "");
  // 4) Ensure it starts EXACTLY with '---'
  if (!finalContent.startsWith("---")) {
    finalContent = "---\n" + finalContent.replace(/^[\-\s]*/, "");
  }

  const file = app.workspace.getActiveFile();
  await app.vault.modify(file, finalContent);

  tR = "";
} catch (e) {
  new Notice("Templater error: " + (e?.message || e), 8000);
  throw e;
}
%>