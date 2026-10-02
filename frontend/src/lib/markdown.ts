// Minimal, safe Markdown renderer for untrusted model output.
// Everything is HTML-escaped FIRST, then a restricted set of Markdown
// constructs is turned back into markup. Because the angle brackets are
// already entities before any tag is inserted, a model that emits <script>
// or an onerror attribute cannot inject anything.

function escapeHtml(text: string): string {
    const map: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    };
    return text.replace(/[&<>"']/g, (c) => map[c]);
}

function inline(text: string): string {
    return text
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
        .replace(/\[(\d{1,2})\]/g, '<span class="cite-ref" data-cite="$1">$1</span>');
}

function splitRow(line: string): string[] {
    return line
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((c) => c.trim());
}

export function renderMarkdown(src: string): string {
    const lines = escapeHtml(src).replace(/\r\n?/g, "\n").split("\n");
    const out: string[] = [];
    let i = 0;

    const isTableDivider = (s: string) => /^\|?[\s:|-]+\|[\s:|-]*$/.test(s) && s.includes("-");

    while (i < lines.length) {
        const line = lines[i];
        if (!line.trim()) {
            i++;
            continue;
        }

        if (line.trim().startsWith("|") && isTableDivider(lines[i + 1] || "")) {
            const head = splitRow(line.trim());
            i += 2;
            const body: string[][] = [];
            while (i < lines.length && lines[i].trim().startsWith("|")) {
                body.push(splitRow(lines[i].trim()));
                i++;
            }
            out.push(
                "<table><thead><tr>" +
                head.map((c) => "<th>" + inline(c) + "</th>").join("") +
                "</tr></thead><tbody>" +
                body.map((r) => "<tr>" + r.map((c) => "<td>" + inline(c) + "</td>").join("") + "</tr>").join("") +
                "</tbody></table>"
            );
            continue;
        }

        const heading = line.match(/^(#{1,4})\s+(.*)$/);
        if (heading) {
            const level = Math.min(Math.max(heading[1].length, 2), 4);
            out.push("<h" + level + ">" + inline(heading[2]) + "</h" + level + ">");
            i++;
            continue;
        }

        if (/^&gt;\s?/.test(line)) {
            const quote: string[] = [];
            while (i < lines.length && /^&gt;\s?/.test(lines[i])) {
                quote.push(lines[i].replace(/^&gt;\s?/, ""));
                i++;
            }
            out.push("<blockquote>" + inline(quote.join(" ")) + "</blockquote>");
            continue;
        }

        if (/^\s*[-*+]\s+/.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
                items.push(inline(lines[i].replace(/^\s*[-*+]\s+/, "")));
                i++;
            }
            out.push("<ul>" + items.map((t) => "<li>" + t + "</li>").join("") + "</ul>");
            continue;
        }

        if (/^\s*\d+[.)]\s+/.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
                items.push(inline(lines[i].replace(/^\s*\d+[.)]\s+/, "")));
                i++;
            }
            out.push("<ol>" + items.map((t) => "<li>" + t + "</li>").join("") + "</ol>");
            continue;
        }

        const para: string[] = [];
        while (
            i < lines.length &&
            lines[i].trim() &&
            !/^(#{1,4}\s|\s*[-*+]\s|\s*\d+[.)]\s|&gt;\s?)/.test(lines[i]) &&
            !lines[i].trim().startsWith("|")
        ) {
            para.push(lines[i].trim());
            i++;
        }
        if (para.length) out.push("<p>" + inline(para.join(" ")) + "</p>");
    }

    return out.join("");
}
