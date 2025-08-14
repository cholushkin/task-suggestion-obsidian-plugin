export class CloneProcessor {
  private static DONE_BLOCK =
    '\n\n---\n\n<div class="tsop-done-container"><button class="tsop-done-btn">done</button></div>\n';

  /** Process the weekly note:
   * - Insert "New Tip" button next to each "Tip of the day" callout
   * - Replace "### Day N. ..." headers with actual dates, starting from the given Monday
   * - Uncheck all checkboxes
   * - Remove nested list items (keep only top-level list items)
   * - Append a "done" button at the end
   */
  public process(src: string, monday: Date): string {
    let out = src;

    // 1) Tip button next to "Tip of the day" callouts
    out = this.injectTipButtons(out);

    // 2) Replace headers for days with concrete dates starting from Monday
    out = this.fixDayHeaders(out, monday);

    // 3) Uncheck all checkboxes
    out = this.uncheckAll(out);

    // 4) Remove nested items (any line that starts with indentation + list marker)
    out = this.removeNestedListItems(out);

    // 5) Append Done button
    out = this.appendDoneButton(out);

    return out;
  }

  // --- Step 1: Add a "New Tip" button next to "Tip of the day" callouts
  private injectTipButtons(text: string): string {
    // Match the exact callout line and append a tip button wrapper
    // Example line: > [!Tip of the day]
    return text.replace(
      /^(>\s*\[\!Tip of the day\].*)$/gmi,
      (_m, line) => `${line} <span class="tsop-tip-wrap"><button class="tsop-tip-btn">New Tip</button></span>`
    );
  }

  // --- Step 2: Replace "### Day N. Weekday ..." headers with Monday..Sunday with correct dates
  private fixDayHeaders(text: string, monday: Date): string {
    // We’ll scan all day headers in order. For each match, compute date = monday + (N-1) days
    // Expected header examples:
    // "### Day 1. Monday 11-Aug-2025"
    // "### Day 2. Tuesday 12-Aug-2025"
    const lines = text.split(/\r?\n/);
    const dayHeaderRegex = /^###\s*Day\s*(\d+)\.\s*.*$/i;

    const formatted = lines.map((line) => {
      const m = line.match(dayHeaderRegex);
      if (!m) return line;
      const idx = parseInt(m[1], 10);
      if (isNaN(idx) || idx < 1 || idx > 7) return line; // Guard: we expect Day 1..7
      const date = new Date(monday);
      date.setDate(monday.getDate() + (idx - 1));
      const weekday = this.weekdayName(date);
      const ddMmmYYYY = this.formatDateDDMMMYYYY(date);
      return `### Day ${idx}. ${weekday} ${ddMmmYYYY}`;
    });

    return formatted.join("\n");
  }

  // --- Step 3: Uncheck all checkboxes
  private uncheckAll(text: string): string {
    // Replace - [x] or - [X] with - [ ]
    return text.replace(/^(\s*[-*+]\s*)\[(?:x|X)\]/gm, "$1[ ]");
  }

  // --- Step 4: Remove nested list items (keep only top-level)
  private removeNestedListItems(text: string): string {
    const lines = text.split(/\r?\n/);
    const result: string[] = [];
    const nestedItemRegex = /^\s+[-*+]\s/; // any indentation before a list marker
    for (const line of lines) {
      if (nestedItemRegex.test(line)) {
        // skip nested list items
        continue;
      }
      result.push(line);
    }
    return result.join("\n");
  }

  // --- Step 5: Append a "Done" button block
  private appendDoneButton(text: string): string {
    const trimmed = text.replace(/\s+$/g, "");
    return trimmed + CloneProcessor.DONE_BLOCK;
  }

  // Helpers
  private weekdayName(d: Date): string {
    // English weekday names with capitalized first letter
    const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return names[d.getDay()];
  }

  private formatDateDDMMMYYYY(d: Date): string {
    // Example: 11-Aug-2025
    const day = d.getDate().toString().padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mmm = months[d.getMonth()];
    const y = d.getFullYear();
    return `${day}-${mmm}-${y}`;
  }
}
