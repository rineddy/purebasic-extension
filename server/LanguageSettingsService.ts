import {
	ClientCapabilities,
	DidChangeConfigurationParams,
	InitializeParams,
	TextDocument
} from 'vscode-languageserver';
import { ICustomSettings, pb } from './PureBasicAPI';

export class LanguageSettings {
	public initParams?: InitializeParams;
	public clientCapabilities?: ClientCapabilities;
	public hasWorkspaceConfigCapability: boolean = false;
	public hasWorkspaceFolderCapability: boolean = false;
	public hasDiagnosticRelatedInformationCapability: boolean = false;
	public static service = new LanguageSettings();

	private constructor() { }

	/**
	 * Default settings
	 */
	private readonly DEFAULT_SETTINGS = <ICustomSettings>{
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
	/**
	 * Cache the settings of all open documents
	 */
	private documentSettings: Map<string, Thenable<ICustomSettings>> = new Map();

	/**
	 * Initializes cached document settings and technical settings
	 */
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
			this.documentSettings.set('', globalSettings);
		}
	}
	/**
	 * Reset settings
	 * @param changed
	 */
	public reset(changed: DidChangeConfigurationParams) {
		// Clear cached document settings
		this.documentSettings.clear();
		if (!this.hasWorkspaceConfigCapability) {
			const globalSettings = Promise.resolve(<ICustomSettings>(changed.settings.purebasicLanguage || this.DEFAULT_SETTINGS));
			this.documentSettings.set('', globalSettings.then(this.loadIndentationRules));
		}
	}
	/**
	 * Load settings after opening document
	 * @param doc
	 */
	public load(doc: TextDocument): Thenable<ICustomSettings> {
		let settings = this.documentSettings.get(this.hasWorkspaceConfigCapability ? doc.uri : '');
		if (!settings) {
			settings = pb.connection.workspace.getConfiguration({ scopeUri: doc.uri, section: 'purebasicLanguage' });
			this.documentSettings.set(doc.uri, settings.then(this.loadIndentationRules));
		}
		return settings;
	}
	/**
	 * Delete settings before closing document
	 * @param doc
	 */
	public delete(doc: TextDocument) {
		this.documentSettings.delete(doc.uri);
	}
	/**
	 * Load indentation rules after converting string into regex
	 * @param settings
	 */
	private loadIndentationRules(settings: ICustomSettings): PromiseLike<ICustomSettings> {
		settings.indentationRules.forEach(r => {
			// convert indent rules from string to RegExp
			if (typeof (r.regex) === 'string') { r.regex = new RegExp(r.regex, r.flags); }
		});
		return Promise.resolve(settings);
	}

}
