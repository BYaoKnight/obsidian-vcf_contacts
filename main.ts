import { log } from 'console';
import { App, Editor, FileManager, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile, TFolder, Vault, parseYaml, stringifyYaml } from 'obsidian';
import { normalizePath } from "obsidian";
import { isStringObject } from 'util/types';
// import "./src/utf8";
// import "./src/vcard";

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	ContactsFolder: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	ContactsFolder: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();
		
		// This creates an icon in the left ribbon.
		//const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
		//	// Called when the user clicks the icon.
		//	new Notice('This is a notice!');
		//});
		// Perform additional things with the ribbon
		//ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		//const statusBarItemEl = this.addStatusBarItem();
		//statusBarItemEl.setText('Status Bar Text');

		this.addCommand({
			id: 'new-contact',
			name: 'create new contact note',
			callback: () => {
				const nullcontact = new VCARD()
				const fp=normalizePath(this.settings.ContactsFolder+`/Contact ${findNextFileNumber(this.settings.ContactsFolder, this.app.vault)}.md`)
				const ctt="---\n"+nullcontact.toyaml()+"\n---\n"
				this.app.vault.create(fp,ctt)
    			.then(createdFile => this.app.workspace.getLeaf().openFile(createdFile,{active: true}));
				new Notice('new contact successfully created')
			}
		});
		this.addCommand({
			id: 'gen-vcf',
			name: 'generate VCF',
			callback: () => {
				new GenerateVCFModal(this.app,this.settings.ContactsFolder).open();
			}
		});
		this.addCommand({
			id: 'load-vcf',
			name: 'load VCF',
			callback: () => {
				new LoadVCFModal(this.app,this.settings.ContactsFolder).open();
			}
		});
		/*
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});*/

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			//console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

		/*
		const folder = vault.getAbstractFileByPath(folderPath)
		if (!folder) {
		  new Notice(`Can not find path: '${folderPath}'. Please update "Contacts" plugin settings`);
		  return;
		}
	  
		vault.create(normalizePath(join(folderPath, `Contact ${findNextFileNumber(folderPath, vault)}.md`)), getNewFileContent(template, hashtag));
		*/
class GenerateVCFModal extends Modal {
	ofilepath: string;
	ofilename: string;

	constructor(app: App, path: string) {
		super(app);
		this.ofilepath=path;
		this.ofilename='myContacts_' + formatDate(new Date()) + '.vcf';
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h1", { text: "generate vCard file (.vcf)" });

		new Setting(contentEl)
			.setName("Name")
			.setDesc('where your contact\'s notes are to be stored')
			.addText((text) => text
				.setPlaceholder("filename")
				.setValue(this.ofilename)
				.onChange((value) => {
					this.ofilename = value
				}));

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("generate")
					.setCta()
					.onClick(() => {
						const folder = this.app.vault.getAbstractFileByPath(this.ofilepath);
						if (!(folder instanceof TFolder)) {
							new Notice(`Can not find path: '${this.ofilepath}'. Please update "myContacts" plugin settings`);
							return;
						}
						this.close();
						this.onSubmit(folder);
					}));
	}
	onSubmit(folder :TFolder) {
		let file : string = "";
		let content: string = "haha";
		this.ofilename = normalizePath(this.ofilepath + '/' + this.ofilename);
		//console.log("writing "+this.ofilename+" from "+folder.path)
		this.app.vault.create(this.ofilename, "").then((ofile) => {
			Vault.recurseChildren(folder,(file:TAbstractFile)=>{
				const vault = this.app.vault;
				let output_content: string;
				if(!(file instanceof TFile)
				|| file.extension != "md"){return;}
				let fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
				if(fm === undefined) {return;}
				vault.append(ofile,VCARD.stringify(fm)||"");
			})
			new Notice(ofile.path + " successfully generated");
		});
		
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}



class LoadVCFModal extends Modal {
	ofolderpath: string;
	ifilename: string="vcf/.vcf";

	constructor(app: App, ofolder:string) {
		super(app);
		this.ofolderpath=ofolder;
	}

	onOpen() {
		const { contentEl } = this;
		const vault = this.app.vault;
		//console.log(vault.getFiles())
		contentEl.createEl("h1", { text: "load vCard file (.vcf)" });

		new Setting(contentEl)
			.setName("vcf file")
			.setDesc('vcf to read the contacts from')
			.addText((text) => text
				.setPlaceholder("filename")
				.setValue(this.ifilename)
				.onChange((value) => {
					this.ifilename = value
				}));

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("load")
					.setCta()
					.onClick(() => {
						let ifilepath= normalizePath(this.ofolderpath+"/"+this.ifilename)
						const ifile = this.app.vault.getAbstractFileByPath(ifilepath);
						//console.log(ifilepath)
						if (!(ifile instanceof TFile)) {
							new Notice(`Can not find path: '${this.ifilename}'. Please update "myContacts" plugin settings`);
							return;
						}
						const folder = this.app.vault.getAbstractFileByPath(this.ofolderpath);
						if (!(folder instanceof TFolder)) {
							new Notice(`Can not find path: '${this.ofolderpath}'. Please update "myContacts" plugin settings`);
							return;
						}
						this.close();
						this.onSubmit(ifile,folder);
					}));
	}

	onSubmit(ifile:TFile, folder:TFolder) {
		//console.log("load submitted")
		const vault = this.app.vault;
		vault.cachedRead(ifile)
		.then((res)=> {
						let doublons:VCARD[]=[];
			VCARD.parse(res).forEach(c => {
				let ofile = c.name +".md"
				let path=normalizePath(folder.path+"/"+ofile)
				let content="---\n"+c.toyaml()+"\n---\n"
				let file = vault.getAbstractFileByPath(path)
				if(file == null){
					vault.create(path,content)
				}else{
					console.log("doublons: "+c.name)
					doublons.push(c)
					//TODO LATER
					//try merge if file exist
					
				}
			});
			if(doublons.length==0){return;}
			vault.create(normalizePath(folder.path+"/doublons_"+formatDate(new Date())+".md"),"")
			.then((file) => {
				doublons.forEach(e => {
					vault.append(file, "# "+e.name+"\n"+e.toyaml()+"\n\n\n")
				});
			})

			new Notice(ifile.path + " successfully loaded");
		})

		//TODO
		// read .vcf -> VCARD[]
		//foreach
			// create file if not exist 
			// set frontmatter

	}
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {//TODO 
		const { containerEl } = this;
		containerEl.empty();
		
		new Setting(containerEl)
			.setName('Contacts Folder')
			.setDesc('where your contact\'s notes are to be stored')
			.addText(text => text
				.setPlaceholder('Contacts')
				.setValue(this.plugin.settings.ContactsFolder)
				.onChange(async (value) => {
					this.plugin.settings.ContactsFolder = value;
					await this.plugin.saveSettings();
				}));
	}
}










































function formatDate(date : Date) { 
	return date.toISOString().replace('T', '_').replaceAll('-', '').replaceAll(':','').substring(0, 13);
}
function findNextFileNumber(folderPath: string, vault: Vault) {
	const folder = vault.getAbstractFileByPath(
	  normalizePath(folderPath)
	) as TFolder;
  
	let nextNumber = 0;
	Vault.recurseChildren(folder, (contactNote) => {
	  if (!(contactNote instanceof TFile)) {
		return;
	  }
	  const name = contactNote.basename;
	  const regex = /Contact(?<number>\s\d+)*/g;
	  for (const match of name.matchAll(regex)) {
		if (!match.groups || !match.groups.number) {
		  if (nextNumber === 0) {
			nextNumber = 1;
		  }
		  continue;
		}
		const currentNumberString = match.groups.number.trim();
		if (currentNumberString != undefined && currentNumberString !== "") {
		  const currentNumber = parseInt(currentNumberString);
		  nextNumber = Math.max(nextNumber, (currentNumber + 1));
		}
	  }
	});
	return nextNumber === 0 ? "" : nextNumber.toString();
}

class VCARD{
	name: string="";
	dname : VCARD_name= new VCARD_name();
	birthday: string;
	tel: string[]=[];
	email: string[]=[];


	static STR ={
		name:"N",
		tel:"TEL",
		email:"EMAIL",
		birthday:"BDAY:",
		utf8:";CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:",
		begin : "BEGIN:VCARD",
		version:"VERSION:2.1",
		end : "END:VCARD",
		nl:"\n"
	}
	static parse(str:string){
				let objs: VCARD[] =[]
		let obj:VCARD= new VCARD();
		let lines = str.split(/\r?\n/)
		let crt=-1,nxt=0;
				for (let j=0; j < lines.length; j++) {
			if((crt+1)==nxt){
				if(lines[j]   == VCARD.STR.begin
				&& lines[++j] == VCARD.STR.version){crt++;obj= new VCARD();}
				continue
			}
			if(crt == nxt){
				let line = lines[j];
				while(line.endsWith("=")){line=line.slice(0,-1) +lines[++j]}
				const val= line.split(":")[1]
				if(line == VCARD.STR.end){nxt++;objs.push(obj);continue}
				if(line.startsWith("FN")){
					if(line.contains(VCARD.STR.utf8)){
						//console.log(val)
						obj.name=VCARD.scanUTF8(val)
					}else{
						obj.name=val
					}
					continue
				}
				if(line.startsWith("N")){
					//console.log(val)
					let vals=val.split(";",5)
					if(line.contains(VCARD.STR.utf8)){
						vals= vals.map(VCARD.scanUTF8)
					}
					let tmp =new VCARD_name(vals)
					obj.dname=  tmp
					continue
				}
				if(line.startsWith(VCARD.STR.birthday)){
					obj.birthday= val
					continue
				}
				if(line.startsWith(VCARD.STR.tel)){
					obj.tel.push(val)
					continue
				}
				if(line.startsWith(VCARD.STR.email)){
					if(line.contains(VCARD.STR.utf8)){
						//console.log(val)
						obj.email.push(VCARD.scanUTF8(val))
					}else{
						obj.email.push(val)
					}
					continue
				}
			}
			else return []
		}
	
		return objs;
	}
	static stringify(obj: any):string{
		let s ="";
	
		if(!obj.name ||obj.name===""){return "";}
		if((!obj.tel   ||obj.tel==="")
		 &&(!obj.email ||obj.email==="")){return "";}

		if(!obj.dname || obj.dname===""){
			s= "N"+VCARD.STR.utf8+VCARD.printUTF8(obj.name)
			s+=";;;;\nF"+s+"\n"
		}else{
			let tmp: string[] = []
			const dn=obj.dname
			tmp.push(dn.last,dn.first,dn.mid,dn.prefix,dn.suffix)
			let str = tmp.map(VCARD.printUTF8).join(";")
			s="FN"+VCARD.STR.utf8+VCARD.printUTF8(obj.name)
			s+="\nN"+VCARD.STR.utf8+str+"\n"
		}

		if(obj.birthday){s+=VCARD.STR.birthday+obj.birthday+"\n"}
		if(obj.tel){
			if(obj.tel instanceof Object){
				for (const [k, v] of Object.entries(obj.tel)) {
					if(typeof v != "string" && typeof v !="number"){return"";}
					s+=VCARD.STR.tel+":"+v+"\n"
				}
			}else{
				s+=VCARD.STR.tel+":"+obj.tel+"\n"
			}
		}
		if(obj.email){
			if(obj.email instanceof Object){
				// obj.email.forEach(e => {
				// 	s+=STR.email+STR.utf8+printUTF8(e)+"\n";
				// });
			}else{
				s+=VCARD.STR.email+VCARD.STR.utf8+VCARD.printUTF8(obj.email)+"\n";
			}
		}
		return VCARD.STR.begin+VCARD.STR.nl+VCARD.STR.version+VCARD.STR.nl+ s +VCARD.STR.end+VCARD.STR.nl;
	}
	toyaml(){
		let ret = ""
		ret+="name: "+ this.name
		ret+="\ndname: "
		for (const [k,v] of Object.entries(this.dname)) {
			ret+="\n "+k+": "+v
		}
		ret+="\nbirthday: "+ (this.birthday||"")
		ret+="\ntel: "
		for (const [k,v] of Object.entries(this.tel)) {
			ret+="\n "+k+": \""+v+"\""
		}
		ret+="\nemail: "
		for (const [k,v] of Object.entries(this.email)) {
			ret+="\n "+k+": "+v
		}
		return ret;
	}

	static scanUTF8(s:string){
		if(s==="")return "";
		let str: string[]=s.split("=")
		//console.log(str)
		let bytes: number[]=[]
		for (let i = 1; i < str.length; i++) {
			const e = str[i];
			bytes[i-1]=parseInt(e,16);
		}
		//console.log(bytes)
		let codes= UTF8.bytes2values(bytes);
		//console.log(codes)
		return String.fromCodePoint(...codes)
	}
	static printUTF8(s:string){
		if(!s || s=="")return ""
		let o = ""
		for (let i = 0; i < s.length; i++) {
			const c = UTF8.values2bytes(s.charCodeAt(i));
			for (let i = 0; i < c.length; i++) {
				o+="="+c[i].toString(16);
			}
		}
		return o
	}
}
class VCARD_name{
	prefix: string="";	//3
	first: string="";	//1
	mid: string="";		//2
	last: string="";	//0
	suffix: string="";	//4
	constructor(sa:string[]=["","","","",""]){
		//console.log(" constructing dname")
		this.last = sa[0]
		this.first= sa[1]
		this.mid  = sa[2]
		this.prefix = sa[3]
		this.suffix = sa[4]
	}
}

class UTF8{
	static values2bytes(c: number){
		if(c<128) return [c];
		const msk = [0,192,224,240]
		let cnt=0
		let r=c % 64
		let ret: number[]=[r];
		while(c >=64){
			ret[0]+=128
			c = (c-r) / 64
			r=c % 64
			ret.unshift(r)
			cnt++
		}
		ret[0]+=msk[cnt]
		return ret;
	}
	static bytes2values(l:number[]){
		let c:number[]=[]
		for( let i=0,j=0; i<l.length ;i++,j++){
			let s=""+l[i]
			if(l[i]>=192){
				s+=" - "+ l[i+1]
				if(l[i]>=224){
					s+=" - "+ l[i+2]
					if(l[i]>=240){
						s+=" - "+ l[i+3]
						c[j]=l[i]-240
						c[j]=c[j]*64 + (l[++i]-128)
					}else{
						c[j]=l[i]-224
					}
					c[j]=c[j]*64 + (l[++i]-128)
				}else{
					c[j]=l[i]-192
				}
				c[j]=c[j]*64 + (l[++i]-128)
			}else{
				c[j]=l[i]
			}
			//console.log(s + " # "+c[j])
		}
		return c;
	}
}

/*
const test_obj={
	name:"alpha",
	deck:"hahaah",
	tel:{b:"+3344",c:"4455"},
	email:"bravo"
}
//console.log(stringifyVCard(test_obj))
//const test_vstring = "=97=108=112=104=97"//"=193=162=193=165=193=180=193=161"
// console.log(scanUTF8(test_vstring))
// console.log(scanUTF8(printUTF8("éùöœê")))
// const val="=97=108=112=104=97;=97=108=116=104=97;=97=118=112=104=97;=97=100=112=104=97;=97=108=110=104=97"
// const a=val.split(";")
// console.log(a)
// console.log(a.map(scanUTF8))
let test_vcard="BEGIN:VCARD\n\
VERSION:2.1\n\
N;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:=97=108=112=104=97;;;;\n\
FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:=97=108=112=104=97\n\
TEL:+3344\n\
TEL:4455\n\
EMAIL;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:=98=114=97=118=111\n\
END:VCARD\n\
BEGIN:VCARD\n\
VERSION:2.1\n\
N;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:=97=108=113=104=97;;;;\n\
FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:=97=108=113=104=97\n\
TEL:+335674\n\
TEL:445665\n\
EMAIL;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:=98=114=97=118=111=99\n\
END:VCARD\n"
let a=VCARD.parse(test_vcard)
console.log(a)
//console.log(a.)
a.forEach(e => {
	console.log(e.toyaml())
});
   //const currentdate = new Date();
   //console.log(formatDate(currentdate));
//*/
//console.log("plugin loaded \t" + formatDate(new Date()))