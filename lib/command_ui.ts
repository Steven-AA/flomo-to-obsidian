import { App, DataAdapter, Modal, Plugin, Setting, Notice } from 'obsidian';
import { FlomoDataLoader } from './flomo_data_loader';
import *  as fs from 'fs-extra';
import decompress from 'decompress';
import * as path from 'path';
import * as os from 'os';



export class CommandUI extends Modal {
    plugin: Plugin;
    fdl: FlomoDataLoader;
    flomoFolderPath: string;
    attachementPath: string;
    statusBar: HTMLElement;
    rawPath: string;
    fsa: DataAdapter;
    targetRoot: string;

	constructor(app: App, plugin: Plugin) {
		super(app);
		this.plugin = plugin;
        this.statusBar = this.plugin.addStatusBarItem();
        this.fdl = new FlomoDataLoader();
        this.fsa = this.app.vault.adapter;
        this.rawPath = "";
        this.targetRoot = "flomo";
        console.log("CommandUI Class Loaded");
	}

    createFlomoIndex() {
        const index_file = `${this.targetRoot}/Flomo Moments.md`;

        if(this.fdl.stat["memo"]>0){
            this.fsa.write(index_file,`updated at: ${(new Date()).toLocaleString()}\n\n`)
            this.fdl.retrieveTags((tag) => {
                this.fsa.append(index_file, `#${tag} `)
            });
            this.fsa.append(index_file, "\n\n---\n\n")
            this.fdl.retrieveMemos((title, tsp, memo) => {
                this.fsa.append(index_file, `![[flomo/memo/${tsp.split(" ")[0]}/${title}]]\n\n---\n\n`)
            });
        }
    }

    importMemo() {
        if(this.fdl.stat["memo"]>0){
            var proogress = 0;
            this.fdl.retrieveMemos((title, tsp, memo) => {
                // update attachment path
                const re = /!\[\]\(file\//gi;
                memo = memo.replace(re, "![](flomo/");
                // create memo files
                this.fsa.exists(`${this.targetRoot}/memo/${tsp}`).then((tsp_res) => {
                    if(!tsp_res){
                        this.fsa.mkdir(`${this.targetRoot}/memo/${tsp}`);
                        console.debug(`DEBUG: creating subfoder -> ${this.targetRoot}/memo/${tsp}`);
                    }
                    console.debug(`DEBUG: creating memo -> ${this.targetRoot}/memo/${tsp}/${title}.md`);
                    this.fsa.write(`${this.targetRoot}/memo/${tsp}/${title}.md`, memo);
                    // update status in status bar
                    this.statusBar.setText(`[${(++proogress).toString()}/${this.fdl.stat["memo"].toString()}] Flomo Memos imported.`);
                });
            })
        }
    }

    copyAttachments() {
        const attachementPath = fs.readJsonSync(`${this.app.vault.adapter.basePath}/${this.app.vault.configDir}/app.json`)["attachmentFolderPath"] + "/flomo/";
        console.debug(`DEBUG: get flomo attachment root -> ${attachementPath}`);

        this.fsa.mkdir(attachementPath)
        const flomo_home = path.join(os.tmpdir(), "flomo");

        if(!fs.existsSync(flomo_home)){
            fs.mkdirSync(flomo_home)
        }

        const tmp_loc = fs.mkdtempSync(path.join(flomo_home, "data_"));
        decompress(this.rawPath, tmp_loc)
        .then((files) => {
            for(const f of files){
                if(f.type=="directory" && f.path.endsWith("/file/")){
                    console.debug(`DEBUG: copy ${tmp_loc}/${f.path} -> ${this.app.vault.adapter.basePath + "/" + attachementPath}`);
                    fs.copySync(`${tmp_loc}/${f.path}`, this.app.vault.adapter.basePath + "/" + attachementPath);
                    fs.removeSync(tmp_loc);
                    break
                }
            }
            new Notice(`🎉 Completed.\n Total: ${this.fdl.stat["memo"].toString()}  Flomo memos imported.`)
            console.debug("DEBUG: copy completed");         
            console.debug("DEBUG: attachemnts are copied over to obsidian");    
        })
    }

    onSubmit() {
        if(this.targetRoot == ""){
            console.debug("DEBUG: targetRoot is empty, set it to 'flomo'");
            this.targetRoot = "flomo";
        }
        this.fsa.exists(`${this.targetRoot}/memo`).then((res) => {
            if(!res){
                console.debug(`DEBUG: creating memo root -> ${this.targetRoot}/memo`);
                this.fsa.mkdir(`${this.targetRoot}/memo`);
            }
            try{
                this.fdl.loadFlomoDataFrom(this.rawPath);
                this.importMemo();
                this.createFlomoIndex();
                this.copyAttachments();
            }
            catch(err){
                console.log(err);
                new Notice(`Failed to import Flomo files. Details:\n------------------------------\n${err}`);
            }
        });
    }

	onOpen() { 
		const {contentEl} = this;
        
		contentEl.empty();
        contentEl.createEl("h3", {text: "Flomo to Obsidian: Importer"});
        contentEl.createEl("br");
        
        const fileLocContol: HTMLInputElement = contentEl.createEl("input", {type: "file"})
        fileLocContol.setAttr("accept", ".zip");
        fileLocContol.onchange = (ev)=>{
            this.rawPath = ev.currentTarget.files[0]["path"];
            console.log(this.rawPath)
        };

        contentEl.createEl("br");
        contentEl.createEl("br");

        new Setting(contentEl)
            .setName('Target location')
            .setDesc('set the target location to import flomo memos')
            .addText(text => text
                .setPlaceholder('flomo')
                .setValue(this.targetRoot)
                .onChange(async (value) => {
                    this.targetRoot = value;
                    console.debug(`DEBUG: Updated targetRoot -> ${this.targetRoot}`);
                }));

        new Setting(contentEl)
            .addButton((btn)=>{
                btn.setButtonText("Import")
                   .setCta()
                   .onClick(()=>{
                        if(this.rawPath != ""){
                            this.onSubmit();
                        }
                        else{
                            console.log("no file selected.")
                        }
                        this.close();
                   })
            });
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
} 