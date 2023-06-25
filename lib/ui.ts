import { App, Modal, Plugin, Setting, Notice } from 'obsidian';
import { FlomoImporter } from './importer';


export class ImporterUI extends Modal {
    plugin: Plugin;
    rawPath: string;

    constructor(app: App, plugin: Plugin) {
        super(app);
        this.plugin = plugin;
        this.rawPath = "";
    }

    async onSubmit(): Promise<void> {
        const targetMemoLocation = this.plugin.settings.flomoTarget + "/" +
            this.plugin.settings.memoTarget;

        const res = await this.app.vault.adapter.exists(targetMemoLocation);
        if (!res) {
            console.debug(`DEBUG: creating memo root -> ${targetMemoLocation}`);
            await this.app.vault.adapter.mkdir(`${targetMemoLocation}`);
        }

        try {
            const config = this.plugin.settings;
            config["rawDir"] = this.rawPath;

            const flomo = await (new FlomoImporter(this.app, config)).import();

            new Notice(`🎉 Import Completed.\nTotal: ${flomo.stat["memo"].toString()} memos`)
            this.rawPath = "";


        } catch (err) {
            this.rawPath = "";
            console.log(err);
            new Notice(`Flomo Importer Error. Details:\n${err}`);
        }

    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h3", { text: "Flomo Importer" });

        const fileLocContol: HTMLInputElement = contentEl.createEl("input", { type: "file", cls: "uploadbox" })
        fileLocContol.setAttr("accept", ".zip");
        fileLocContol.onchange = (ev) => {
            this.rawPath = ev.currentTarget.files[0]["path"];
            console.log(this.rawPath)
        };

        contentEl.createEl("br");

        new Setting(contentEl)
            .setName('Flomo Root Location')
            .setDesc('set the flomo root location')
            .addText(text => text
                .setPlaceholder('flomo')
                .setValue(this.plugin.settings.flomoTarget)
                .onChange(async (value) => {
                    this.plugin.settings.flomoTarget = value;
                }));

        new Setting(contentEl)
            .setName('Memos Location')
            .setDesc('set the location to store memos (under flomo root)')
            .addText((text) => text
                .setPlaceholder('memos')
                .setValue(this.plugin.settings.memoTarget)
                .onChange(async (value) => {
                    this.plugin.settings.memoTarget = value;
                }));

        new Setting(contentEl)
            .setName('Moments Options')
            .setDesc('set moments options')
            .addDropdown((drp) => {
                drp.addOption("copy_with_link", "Generate Moments")
                    .addOption("skip", "Skip Moments")
                    .setValue(this.plugin.settings.optionsMoments)
                    .onChange(async (value) => {
                        this.plugin.settings.optionsMoments = value;
                    })
            })

        new Setting(contentEl)
            .setName('Canvas Options')
            .setDesc('set canvas options')
            .addDropdown((drp) => {
                drp.addOption("copy_with_link", "Generate Canvas")
                    .addOption("copy_with_content", "Generate Canvas with content")
                    .addOption("skip", "Skip Canvas")
                    .setValue(this.plugin.settings.optionsCanvas)
                    .onChange(async (value) => {
                        this.plugin.settings.optionsCanvas = value;
                    })
            });

        new Setting(contentEl).setName('Experimental Options').setDesc('set experimental options')

        const expOptionBlock: HTMLDivElement = contentEl.createEl("div", { cls: "expOptionBlock" });
        const expOptionLabel: HTMLLabelElement = expOptionBlock.createEl("label");
        const allowBiLink: HTMLInputElement = expOptionLabel.createEl("input", { type: "checkbox", cls: "ckbox" })
        allowBiLink.checked = this.plugin.settings.expOptionAllowbilink;
        allowBiLink.onchange = (ev) => {
            this.plugin.settings.expOptionAllowbilink = ev.currentTarget.checked;
        };

        expOptionLabel.createEl("small", { text: "Convert bidirectonal link: [[link]]" });


        new Setting(contentEl)
            .addButton((btn) => {
                btn.setButtonText("Cancel")
                    .setCta()
                    .onClick(async () => {
                        await this.plugin.saveSettings();
                        this.close();
                    })
            })
            .addButton((btn) => {
                btn.setButtonText("Import")
                    .setCta()
                    .onClick(async () => {
                        if (this.rawPath != "") {
                            await this.onSubmit();
                            await this.plugin.saveSettings();
                            this.close();
                        }
                        else {
                            new Notice("No File Selected.")
                        }
                    })
            });
    }

    onClose() {
        this.rawPath = "";
        const { contentEl } = this;
        contentEl.empty();
    }
} 