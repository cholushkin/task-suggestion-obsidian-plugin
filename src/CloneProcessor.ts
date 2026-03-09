export class CloneProcessor {

  public process(src: string, monday: Date): string {

    console.log("[TaskSuggestion] Processing content");

    let out = src;

    out = this.fixDayHeaders(out, monday);
    out = this.uncheckAll(out);
    out = this.removeNestedListItems(out);

    console.log("[TaskSuggestion] Cleaning complete");

    return out;
  }

  private fixDayHeaders(text: string, monday: Date): string {

    const lines = text.split(/\r?\n/);
    const dayHeaderRegex = /^###\s*Day\s*(\d+)\.\s*.*$/i;

    const formatted = lines.map((line) => {

      const m = line.match(dayHeaderRegex);
      if (!m) return line;

      const idx = parseInt(m[1], 10);
      if (isNaN(idx) || idx < 1 || idx > 7) return line;

      const date = new Date(monday);
      date.setDate(monday.getDate() + (idx - 1));

      const weekday = this.weekdayName(date);
      const ddMmmYYYY = this.formatDateDDMMMYYYY(date);

      return `### Day ${idx}. ${weekday} ${ddMmmYYYY}`;
    });

    return formatted.join("\n");
  }

  private uncheckAll(text: string): string {

    return text.replace(
        /^(\s*[-*+]\s*)\[(?:x|X)\]/gm,
        "$1[ ]"
    );
  }

  private removeNestedListItems(text: string): string {

    const lines = text.split(/\r?\n/);
    const result: string[] = [];

    const nestedItemRegex = /^\s+[-*+]\s/;

    for (const line of lines) {

      if (nestedItemRegex.test(line)) {
        continue;
      }

      result.push(line);
    }

    return result.join("\n");
  }

  private weekdayName(d: Date): string {

    const names = [
      "Sunday","Monday","Tuesday","Wednesday",
      "Thursday","Friday","Saturday"
    ];

    return names[d.getDay()];
  }

  private formatDateDDMMMYYYY(d: Date): string {

    const day = d.getDate().toString().padStart(2, "0");

    const months = [
      "Jan","Feb","Mar","Apr","May","Jun",
      "Jul","Aug","Sep","Oct","Nov","Dec"
    ];

    const mmm = months[d.getMonth()];
    const y = d.getFullYear();

    return `${day}-${mmm}-${y}`;
  }
}