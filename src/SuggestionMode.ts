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
    /* ENABLE MODE                              */
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
    /* EXIT MODE                                */
    /* ---------------------------------------- */

    async exit(file: TFile) {

        console.log("[TaskSuggestion] Suggestion mode exit");

        const content = await this.app.vault.read(file);
        const lines = content.split("\n");

        const cleaned = lines
            .map(line => this.removeDiceFromLine(line))
            .filter(line => !line.includes("ts-exit-suggestion-mode"));

        await this.app.vault.modify(file, cleaned.join("\n"));
    }

    /* ---------------------------------------- */
    /* MODE DETECTION                           */
    /* ---------------------------------------- */

    private async detectSuggestionMode(file: TFile): Promise<{ active: boolean }> {

        const content = await this.app.vault.read(file);

        return {
            active:
                content.includes("ts-roll-") ||
                content.includes("ts-exit-suggestion-mode")
        };
    }

    /* ---------------------------------------- */
    /* LINK INTERCEPTION                        */
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

                await this.roll(file, id);

                return;
            }

            return original.call(workspace, linktext, sourcePath, newLeaf);
        };
    }

    /* ---------------------------------------- */
    /* ROLL TASK                                */
    /* ---------------------------------------- */

    private async roll(file: TFile, id: string) {

        const task = this.repo.getAll().find(t => t.id === id);
        if (!task) return;

        const candidates = this.repo.getByTag(task.tags);
        if (!candidates.length) return;

        const random =
            candidates[Math.floor(Math.random() * candidates.length)];

        await this.replaceLine(file, id, random);
    }

    /* ---------------------------------------- */
    /* REPLACE LINE                             */
    /* ---------------------------------------- */

    private async replaceLine(file: TFile, oldId: string, newTask: Task) {

        const content = await this.app.vault.read(file);
        const lines = content.split("\n");

        const updated = lines.map(line => {

            if (!this.lineContainsTaskId(line, oldId)) return line;

            const prefixMatch = line.match(/^(.*?)\[\[/);
            if (!prefixMatch) return line;

            const prefix = prefixMatch[1];

            return `${prefix}[[${newTask.path}#^${newTask.id}|${newTask.title}]] [[ts-roll-${newTask.id}|🎲]]`;
        });

        await this.app.vault.modify(file, updated.join("\n"));
    }

    /* ---------------------------------------- */
    /* ADD DICE                                 */
    /* ---------------------------------------- */

    private async injectDiceLinks() {

        const content = await this.app.vault.read(this.file);
        const lines = content.split("\n");

        const updated = lines.map(line => {

            const id = this.extractTaskId(line);

            if (!id) return line;

            if (line.includes("ts-roll-")) return line;

            return `${line} [[ts-roll-${id}|🎲]]`;
        });

        if (!updated.some(l => l.includes("ts-exit-suggestion-mode"))) {
            updated.push("[[ts-exit-suggestion-mode|Exit suggestion mode]]");
        }

        await this.app.vault.modify(this.file, updated.join("\n"));
    }

    /* ---------------------------------------- */
    /* HELPERS                                  */
    /* ---------------------------------------- */

    private extractTaskId(line: string): string | null {

        const match = line.match(/\[\[.*?#\^([a-zA-Z0-9-]+).*?]]/);

        return match ? match[1] : null;
    }

    private lineContainsTaskId(line: string, id: string): boolean {

        const regex = new RegExp(`#\\^${id}\\b`);

        return regex.test(line);
    }

    private removeDiceFromLine(line: string): string {

        return line.replace(/\s*\[\[ts-roll-[^\]]+\]\]/g, "").trimEnd();
    }
}