import { ClientCapabilities, DidChangeConfigurationParams, InitializeParams, TextDocument } from 'vscode-languageserver';
import { PurebasicSettings } from '../models';
import { Client } from '.';

/**
 * Service for doc user settings
 */
export class DocSettings {
	public static service = new DocSettings();
	public initParams?: InitializeParams;
	public clientCapabilities?: ClientCapabilities;
	public hasWorkspaceConfigCapability: boolean = false;
	public hasWorkspaceFolderCapability: boolean = false;
	public hasDiagnosticRelatedInformationCapability: boolean = false;
	private cachedDocSettings: Map<string, Thenable<PurebasicSettings>> = new Map();

	private constructor() { }

	public initialize(params: InitializeParams) {
		this.initParams = params;
		this.clientCapabilities = this.initParams.capabilities;
		// Does the client support the `workspace/configuration` request?
		// If not, we will fall back using Global Settings
		this.hasWorkspaceConfigCapability = !!(this.clientCapabilities.workspace && this.clientCapabilities.workspace.configuration);
		this.hasWorkspaceFolderCapability = !!(this.clientCapabilities.workspace && this.clientCapabilities.workspace.workspaceFolders);
		this.hasDiagnosticRelatedInformationCapability = !!(this.clientCapabilities.textDocument && this.clientCapabilities.textDocument.publishDiagnostics && this.clientCapabilities.textDocument.publishDiagnostics.relatedInformation);
		// The global settings, used when the `workspace/configuration` request is not supported by the client.
		// Please note that this is not the case when using this server with the client provided in this example but could happen with other clients.
		if (!this.hasWorkspaceConfigCapability) {
			const globalSettings = Promise.resolve(PurebasicSettings.Default);
			this.cachedDocSettings.set('', globalSettings);
		}
	}
	public reset(changed: DidChangeConfigurationParams) {
		// Clear cached document settings
		this.cachedDocSettings.clear();
		if (!this.hasWorkspaceConfigCapability) {
			const globalSettings = Promise.resolve(<PurebasicSettings>(changed.settings.purebasicLanguage || PurebasicSettings.Default));
			this.cachedDocSettings.set('', globalSettings.then(this.loadIndentationRules));
		}
	}
	public load(doc: TextDocument): Thenable<PurebasicSettings> {
		let settings = this.cachedDocSettings.get(this.hasWorkspaceConfigCapability ? doc.uri : '');
		if (!settings) {
			settings = Client.connection.workspace.getConfiguration({ scopeUri: doc.uri, section: 'purebasicLanguage' });
			this.cachedDocSettings.set(doc.uri, settings.then(this.loadIndentationRules));
		}
		return settings;
	}
	public delete(doc: TextDocument) {
		this.cachedDocSettings.delete(doc.uri);
	}
	private loadIndentationRules(settings: PurebasicSettings): PromiseLike<PurebasicSettings> {
		settings.indentationRules.forEach(r => {
			// convert indent rules from string to RegExp
			if (typeof (r.regex) === 'string') { r.regex = new RegExp(r.regex, r.flags); }
		});
		return Promise.resolve(settings);
	}

}
