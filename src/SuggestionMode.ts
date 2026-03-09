import { App, TFile, MarkdownView } from "obsidian";
import { TaskRepository, Task } from "./TaskRepository";

export class SuggestionMode {

    private app: App;
    private repo: TaskRepository;
    private file!: TFile;

    constructor(app: App, repo: TaskRepository) {
        this.app = app;
        this.repo = repo;

        this.installLinkInterceptor();
    }

    /* ---------------------------------------- */
    /* ENABLE SUGGESTION MODE                   */
    /* ---------------------------------------- */

    async enable(file: TFile) {

        this.file = file;

        const mode = await this.detectSuggestionMode(file);

        if (mode.active) {
            console.log("[TaskSuggestion] already in suggestion mode");
            return;
        }

        console.log("[TaskSuggestion] Suggestion mode enabled");

        await this.injectDiceLinks();
    }

    /* ---------------------------------------- */
    /* EXIT SUGGESTION MODE                     */
    /* ---------------------------------------- */

    async exit(file: TFile) {

        console.log("[TaskSuggestion] Suggestion mode exit");

        const content = await this.app.vault.read(file);

        const cleaned = content
            .replace(/\s*\[\[ts-roll-[^]]+]]/g, "")
            .replace(/\[\[ts-exit-suggestion-mode\|Exit suggestion mode]]/g, "");

        await this.app.vault.modify(file, cleaned);
    }

    /* ---------------------------------------- */
    /* MODE DETECTION                           */
    /* ---------------------------------------- */

    private async detectSuggestionMode(file: TFile): Promise<{ active: boolean }> {

        const content = await this.app.vault.read(file);

        const hasDice = content.includes("ts-roll-");
        const hasExit = content.includes("ts-exit-suggestion-mode");

        if (hasDice !== hasExit) {

            console.warn(
                "[TaskSuggestion] inconsistent suggestion mode state",
                { hasDice, hasExit }
            );
        }

        return {
            active: hasDice || hasExit
        };
    }

    /* ---------------------------------------- */
    /* LINK INTERCEPTION (GLOBAL)               */
    /* ---------------------------------------- */

    private installLinkInterceptor() {

        const workspace = this.app.workspace as any;

        if (workspace.__taskSuggestionInterceptorInstalled) return;

        workspace.__taskSuggestionInterceptorInstalled = true;

        const original = workspace.openLinkText;

        workspace.openLinkText = async (
            linktext: string,
            sourcePath: string,
            newLeaf?: boolean
        ) => {

            /* Only care about our links */
            if (!linktext.startsWith("ts-")) {
                return original.call(workspace, linktext, sourcePath, newLeaf);
            }

            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            const file = view?.file;

            if (!file) {
                return original.call(workspace, linktext, sourcePath, newLeaf);
            }

            const mode = await this.detectSuggestionMode(file);

            if (!mode.active) {
                return original.call(workspace, linktext, sourcePath, newLeaf);
            }

            if (linktext === "ts-exit-suggestion-mode") {
                await this.exit(file);
                return;
            }

            if (linktext.startsWith("ts-roll-")) {

                const id = linktext.replace("ts-roll-", "");

                await this.roll(id);

                return;
            }

            return original.call(workspace, linktext, sourcePath, newLeaf);
        };
    }

    /* ---------------------------------------- */
    /* TASK ROLL                                */
    /* ---------------------------------------- */

    private async roll(id: string) {

        const task = this.repo.getAll().find(t => t.id === id);
        if (!task) return;

        const candidates = this.repo.getByTag(task.tags);
        if (!candidates.length) return;

        const random =
            candidates[Math.floor(Math.random() * candidates.length)];

        this.replaceLine(id, random);
    }

    /* ---------------------------------------- */
    /* EDITOR LINE REPLACEMENT                  */
    /* ---------------------------------------- */

    private replaceLine(oldId: string, newTask: Task) {

        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) return;

        const editor = view.editor;

        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);

        if (!line || !line.includes(`#^${oldId}`)) return;

        const newLink =
            `[[${newTask.path}#^${newTask.id}|${newTask.title}]] [[ts-roll-${newTask.id}|🎲]]`;

        editor.replaceRange(
            newLink,
            { line: cursor.line, ch: 0 },
            { line: cursor.line, ch: line.length }
        );
    }

    /* ---------------------------------------- */
    /* INSERT DICE LINKS                        */
    /* ---------------------------------------- */

    private async injectDiceLinks() {

        const content = await this.app.vault.read(this.file);
        const lines = content.split("\n");

        const updated = lines.map(line => {

            const match = line.match(/\[\[.*?#\^([a-zA-Z0-9-]+).*?]]/);
            if (!match) return line;

            const id = match[1];

            if (line.includes("ts-roll-")) return line;

            return `${line} [[ts-roll-${id}|🎲]]`;
        });

        if (!content.includes("ts-exit-suggestion-mode")) {

            updated.push("");
            updated.push("---");
            updated.push("[[ts-exit-suggestion-mode|Exit suggestion mode]]");
        }

        await this.app.vault.modify(this.file, updated.join("\n"));
    }
}