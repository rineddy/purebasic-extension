import { ClientCapabilities, DidChangeConfigurationParams, InitializeParams, TextDocument } from 'vscode-languageserver';

import { Client } from './Client';
import { DocSettings } from '../models/DocSettings';

export class ClientSettings {
	public static service = new ClientSettings();
	public initParams?: InitializeParams;
	public clientCapabilities?: ClientCapabilities;
	public hasWorkspaceConfigCapability: boolean = false;
	public hasWorkspaceFolderCapability: boolean = false;
	public hasDiagnosticRelatedInformationCapability: boolean = false;
	private cachedDocSettings: Map<string, Thenable<DocSettings>> = new Map();

	private constructor() { }

	/**
	 * Default settings
	 */
	private readonly DEFAULT_SETTINGS = <DocSettings>{
		diagnostics: {
			maxNumberOfProblems: 1000
		},
		indentationRules: [
			{
				regex: /^;>\s*/i,
				before: 0, after: 1
			},
			{
				regex: /^;<\s*/i,
				before: -1, after: 0
			}
		]
	};
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
			const globalSettings = Promise.resolve(this.DEFAULT_SETTINGS);
			this.cachedDocSettings.set('', globalSettings);
		}
	}
	public reset(changed: DidChangeConfigurationParams) {
		// Clear cached document settings
		this.cachedDocSettings.clear();
		if (!this.hasWorkspaceConfigCapability) {
			const globalSettings = Promise.resolve(<DocSettings>(changed.settings.purebasicLanguage || this.DEFAULT_SETTINGS));
			this.cachedDocSettings.set('', globalSettings.then(this.loadIndentationRules));
		}
	}
	public load(doc: TextDocument): Thenable<DocSettings> {
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
	private loadIndentationRules(settings: DocSettings): PromiseLike<DocSettings> {
		settings.indentationRules.forEach(r => {
			// convert indent rules from string to RegExp
			if (typeof (r.regex) === 'string') { r.regex = new RegExp(r.regex, r.flags); }
		});
		return Promise.resolve(settings);
	}

}
