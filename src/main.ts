import { Notice, Plugin, TFile, TAbstractFile } from "obsidian";
import { CloneProcessor } from "./CloneProcessor";

const FOLDER_PREFIX = "!WeekPlans/";          // Change this to your target folder
const CLONE_SUFFIX = " - (WIP)";              // Suffix for cloned notes
const DONE_BTN_SELECTOR = ".tsop-done-btn";
const TIP_BTN_SELECTOR = ".tsop-tip-btn";

export default class TaskSuggestionPlugin extends Plugin {
    onload() {
        // Context menu on files inside the target folder
        this.registerEvent(
            this.app.workspace.on("file-menu", (menu, file) => {
                if (
                    file instanceof TFile &&
                    file.extension === "md" &&
                    file.path.startsWith(FOLDER_PREFIX)
                ) {
                    menu.addItem((item) => {
                        item
                            .setTitle("Create tasks suggestion")
                            .setIcon("check")
                            .onClick(() => this.createTasksSuggestion(file));
                    });
                }
            })
        );

        // Wire up buttons added by CloneProcessor
        this.registerMarkdownPostProcessor((el) => {
            // Tip button
            el.querySelectorAll<HTMLButtonElement>(TIP_BTN_SELECTOR).forEach((btn) => {
                if ((btn as any)._tsopBound) return;
                (btn as any)._tsopBound = true;
                btn.addEventListener("click", () => {
                    new Notice("📝 (demo) New Tip clicked");
                });
            });

            // Done button
            el.querySelectorAll<HTMLButtonElement>(DONE_BTN_SELECTOR).forEach((btn) => {
                if ((btn as any)._tsopBound) return;
                (btn as any)._tsopBound = true;
                btn.addEventListener("click", async () => this.finalizeCurrentDoc());
            });
        });

        console.log("TaskSuggestionPlugin loaded");
    }

    onunload() {
        console.log("TaskSuggestionPlugin unloaded");
    }

    // Create the cloned + processed weekly note
    private async createTasksSuggestion(srcFile: TFile) {
        try {
            const vault = this.app.vault;
            const srcContent = await vault.read(srcFile);

            const nextMonday = this.getNextMonday();
            const nextMondayFileDate = this.formatDateYYYYMMDD(nextMonday); // YYYY-MM-DD (for filename start)
            const { folderPath, baseName } = this.splitPath(srcFile.path);

            // Keep the "rest of title" after the first space (after date), or default
            const firstSpace = baseName.indexOf(" ");
            const restOfTitle =
                firstSpace > 0 ? baseName.substring(firstSpace + 1).trim() : "Week Plan";

            const targetBase = `${nextMondayFileDate} ${restOfTitle}${CLONE_SUFFIX}`;
            const targetFilePath = await this.getUniqueFilePath(folderPath, targetBase, "md");

            // Process the content via CloneProcessor
            const processed = new CloneProcessor().process(srcContent, nextMonday);

            const created = await vault.create(targetFilePath, processed);

            new Notice(`✨ Created tasks suggestion: "${created.basename}"`);
            const leaf = this.app.workspace.getLeaf(true);
            await leaf.openFile(created);
        } catch (err) {
            console.error(err);
            new Notice("⚠️ Failed to create tasks suggestion. Check console for details.");
        }
    }

    // When user clicks the "Done" button inside the processed note
    private async finalizeCurrentDoc() {
        const file = this.app.workspace.getActiveFile();
        if (!file) {
            new Notice("No active file.");
            return;
        }
        try {
            const vault = this.app.vault;
            let content = await vault.read(file);

            // Strip all plugin buttons
            content = content
                // remove individual buttons
                .replace(/<button class="tsop-(?:tip|done)-btn"[^>]*>.*?<\/button>/g, "")
                // remove empty helper spans/divs leftover:
                .replace(/<span class="tsop-tip-wrap">\s*<\/span>/g, "")
                .replace(/<div class="tsop-done-container">\s*<\/div>/g, "")
                .replace(/\n{3,}$/g, "\n\n");

            await vault.modify(file, content);

            // Rename to remove the suffix
            const { folderPath, baseName } = this.splitPath(file.path);
            const newBase = baseName.endsWith(CLONE_SUFFIX)
                ? baseName.slice(0, -CLONE_SUFFIX.length)
                : baseName; // if somehow no suffix, keep name

            const targetPath = await this.getUniqueFilePath(folderPath, newBase, "md");
            if (targetPath !== file.path) {
                const renamed = await vault.rename(file, targetPath);
                // Open the renamed file
                const leaf = this.app.workspace.getLeaf(true);
                await leaf.openFile(this.app.vault.getAbstractFileByPath(targetPath) as TFile);
            }

            new Notice("✅ Finalized: removed buttons and cleared (WIP) suffix.");
        } catch (e) {
            console.error(e);
            new Notice("⚠️ Failed to finalize the document. See console.");
        }
    }

    /** Returns the next Monday (if today is Monday, returns today). */
    private getNextMonday(): Date {
        const today = new Date();
        const day = today.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
        const monday = 1;
        const daysUntilNextMonday = ((monday - day + 7) % 7);
        const next = new Date(today);
        next.setDate(today.getDate() + daysUntilNextMonday);
        next.setHours(0, 0, 0, 0);
        return next;
    }

    /** Format date as "YYYY-MM-DD" for filenames (e.g., 2025-08-11) */
    private formatDateYYYYMMDD(d: Date): string {
        const y = d.getFullYear();
        const m = (d.getMonth() + 1).toString().padStart(2, "0");
        const day = d.getDate().toString().padStart(2, "0");
        return `${y}-${m}-${day}`;
    }

    private splitPath(path: string): { folderPath: string; baseName: string } {
        const lastSlash = path.lastIndexOf("/");
        const folderPath = lastSlash >= 0 ? path.substring(0, lastSlash) : "";
        const fileName = lastSlash >= 0 ? path.substring(lastSlash + 1) : path;
        const baseName = fileName.replace(/\.md$/i, "");
        return { folderPath, baseName };
    }

    private async getUniqueFilePath(
        folderPath: string,
        baseName: string,
        ext: string
    ): Promise<string> {
        const makePath = (n?: number) =>
            (folderPath ? folderPath + "/" : "") +
            (n && n > 1 ? `${baseName} ${n}.${ext}` : `${baseName}.${ext}`);

        let n = 1;
        let candidate = makePath();
        while (this.exists(candidate)) {
            n++;
            candidate = makePath(n);
        }
        return candidate;
    }

    private exists(path: string): boolean {
        const f: TAbstractFile | null = this.app.vault.getAbstractFileByPath(path);
        return f !== null;
    }
}
