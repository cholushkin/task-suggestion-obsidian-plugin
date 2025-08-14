import { Notice, Plugin, TFile, TAbstractFile } from "obsidian";

const FOLDER_PREFIX = "!WeekPlans/"; // Change this to your target folder
const CLONE_SUFFIX = " - (WIP)";    // Suffix for cloned notes
const DONE_MARKER =
    '<div class="tsop-container"><button class="tsop-done-btn">done</button></div>';

export default class TaskSuggestionPlugin extends Plugin {
    onload() {
        // Add right-click (context) menu item on files inside the target folder
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

        // Post-processor: wire up "done" buttons appended by this plugin
        this.registerMarkdownPostProcessor((el) => {
            const buttons = el.querySelectorAll<HTMLButtonElement>(".tsop-done-btn");
            buttons.forEach((btn) => {
                // Avoid double-binding when Obsidian re-renders
                if ((btn as any)._tsopBound) return;
                (btn as any)._tsopBound = true;

                btn.addEventListener("click", () => {
                    new Notice("✅ Task suggestion marked as done (demo)!");
                });
            });
        });

        console.log("TaskSuggestionPlugin loaded");
    }

    onunload() {
        console.log("TaskSuggestionPlugin unloaded");
    }

    private async createTasksSuggestion(srcFile: TFile) {
        try {
            const vault = this.app.vault;
            const srcContent = await vault.read(srcFile);

            // Build target path (same folder, new filename built from NEXT Monday + rest of title + suffix)
            const { folderPath, baseName } = this.splitPath(srcFile.path);

            // Extract the "rest of the title" after the leading date and a space, if present.
            // Expected format: "YYYY-MM-DD Some Title"
            const firstSpace = baseName.indexOf(" ");
            const restOfTitle =
                firstSpace > 0 ? baseName.substring(firstSpace + 1).trim() : baseName;

            const nextMonday = this.getNextMonday();
            const nextMondayStr = this.formatDateYYYYMMDD(nextMonday);

            const targetBase =
                `${nextMondayStr} ` +
                (restOfTitle.length ? restOfTitle : "Week Plan") +
                CLONE_SUFFIX;

            const targetFilePath = await this.getUniqueFilePath(
                folderPath,
                targetBase,
                "md"
            );

            const newContent =
                srcContent.trimEnd() +
                "\n\n---\n\n" +
                "> _Tasks suggestion action_\n\n" +
                DONE_MARKER +
                "\n";

            const created = await vault.create(targetFilePath, newContent);

            new Notice(`✨ Created tasks suggestion: "${created.basename}"`);
            // Optionally open the new file in the current leaf
            const leaf = this.app.workspace.getLeaf(true);
            await leaf.openFile(created);
        } catch (err) {
            console.error(err);
            new Notice(
                "⚠️ Failed to create tasks suggestion. Check console for details."
            );
        }
    }

    /** Returns the next Monday following the C# reference logic:
     * daysUntilNextMonday = ((Monday - today.DayOfWeek + 7) % 7)
     * If today is Monday, returns today.
     */
    private getNextMonday(): Date {
        const today = new Date();
        const day = today.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
        const monday = 1;
        const daysUntilNextMonday = ((monday - day + 7) % 7);
        const next = new Date(today);
        next.setDate(today.getDate() + daysUntilNextMonday);
        // normalize to start of day to avoid TZ surprises in filenames
        next.setHours(0, 0, 0, 0);
        return next;
    }

    /** Format date as "YYYY-MM-DD" to match "2025-08-11 Week Plan" style */
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
