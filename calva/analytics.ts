import * as vscode from 'vscode';
import * as UA from 'universal-analytics';
import * as uuid from "uuid/v4";
import * as os from 'os';

// var debug = require('debug');
// debug.log = console.info.bind(console);


function userAllowsTelemetry(): boolean {
    const config = vscode.workspace.getConfiguration('telemetry');
    return config.get<boolean>('enableTelemetry', false);
}

export default class Analytics {
    private visitor: UA.Visitor;
    private extension: vscode.Extension<any>;
    private extensionVersion: string;
    private store: vscode.Memento;
    private GA_ID = (process.env.CALVA_DEV_GA ? process.env.CALVA_DEV_GA : 'FUBAR-69796730-3').replace(/^FUBAR/, "UA");

    constructor(context: vscode.ExtensionContext) {
        this.extension = vscode.extensions.getExtension("cospaia.clojure4vscode")!;
        this.extensionVersion = this.extension.packageJSON.version;
        this.store = context.globalState;

        this.visitor = UA(this.GA_ID, this.userID());
        this.visitor.set("cd1", this.extensionVersion);
        this.visitor.set("cn", `calva-${this.extensionVersion}`);
        this.visitor.set("ua", `Calva/${this.extensionVersion} (${os.platform()}; ${os.release()}; ${os.type}) VSCode/${vscode.version}`);
    }

    private userID(): string {
        const KEY = 'userLogID';
        if (this.store.get(KEY) == undefined) {
            const newID = uuid();
            this.store.update(KEY, newID)
            return newID;
        } else {
            return this.store.get(KEY);
        }
    }

    private getVisitor(): UA.Visitor | { pageview, event, screenview } {
        const noop = {
            send: function () {
                //console.log("Not logging!");
            }
        }
        if (userAllowsTelemetry()) {
            return this.visitor;
        } else {
            return {
                pageview: function (...args) { return noop },
                event: function (...args) { return noop },
                screenview: function (...args) { return noop }
            }
        }
    }

    logPath(path: string) {
        this.getVisitor().pageview(path).send();
    }

    logView(view: string) {
        this.getVisitor().screenview(view, "Calva", this.extensionVersion, this.extension.id).send();
    }

    logEvent(category: string, action: string, label?: string, value?: string) {
        this.getVisitor().event({ ec: category, ea: action, el: label, ev: value }).send();
    }
}
