import { DidChangeConfigurationNotification, InitializeParams, TextDocumentSyncKind } from 'vscode-languageserver';
import { ClientConnection } from './ClientConnection';
import { DocSettings } from './DocSettings';
import { DocHandler } from './DocHandler';
import { DocValidation } from './DocValidation';
import { CodeCompletion } from './CodeCompletion';
import { DocFormatter } from './DocFormatter';
import { DocSymbolMapper } from './DocSymbolMapper';

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

ClientConnection.instance.onInitialize((params: InitializeParams) => {
	DocSettings.instance.initialize(params);
	return {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Full,
			completionProvider: { resolveProvider: true }, 	// Tell the client that the server provides code completion
			workspaceSymbolProvider: true,					// Tell the client that the server provides workspace symbols
			documentSymbolProvider: true,				 	// Tell the client that the server provides document symbols
			documentRangeFormattingProvider: true,			// Tell the client that the server supports formatting
			documentFormattingProvider: true, 				// Tell the client that the server supports formatting
			documentOnTypeFormattingProvider: {				// Tell the client that the server supports formatting
				firstTriggerCharacter: ':'
				, moreTriggerCharacter: ['\n', '(', '[', '{']
			},
			// definitionProvider: true,
			// typeDefinitionProvider: undefined,
			// codeActionProvider: true,
			// codeLensProvider: undefined,
			// documentLinkProvider: undefined,
			// documentHighlightProvider: true,
			// colorProvider: undefined,
			// referencesProvider: undefined,
			// signatureHelpProvider: undefined,
			// executeCommandProvider: undefined,
			// hoverProvider: undefined,
			// renameProvider: undefined,
		}
	};
});

ClientConnection.instance.onInitialized(() => {
	if (DocSettings.instance.hasWorkspaceConfigCapability) {
		// Register for all configuration changes.
		ClientConnection.instance.client.register(DidChangeConfigurationNotification.type);
	}
	if (DocSettings.instance.hasWorkspaceFolderCapability) {
		ClientConnection.instance.workspace.getWorkspaceFolders().then(folders => folders.forEach(folder => {
			ClientConnection.instance.console.log(folder.uri);
		}));
		ClientConnection.instance.workspace.onDidChangeWorkspaceFolders(changed => {
			ClientConnection.instance.console.log('Workspace folder change event received.' + changed);
		});
	}
});

ClientConnection.instance.onDidChangeConfiguration(changed => {
	DocSettings.instance.reset(changed);
	DocHandler.instance.all().forEach(DocValidation.instance.validate);
});
ClientConnection.instance.onDidChangeWatchedFiles(() => {
	ClientConnection.instance.console.log('We received an file change event');
});
ClientConnection.instance.onCompletion(p => CodeCompletion.instance.getCompletionItems(p));
ClientConnection.instance.onCompletionResolve(p => CodeCompletion.instance.getCompletionDescription(p));
ClientConnection.instance.onDocumentFormatting(p => DocFormatter.instance.formatAll(p));
ClientConnection.instance.onDocumentRangeFormatting(p => DocFormatter.instance.formatRange(p));
ClientConnection.instance.onDocumentOnTypeFormatting(p => DocFormatter.instance.formatOnType(p));
ClientConnection.instance.onDocumentSymbol(p => DocSymbolMapper.instance.getDocSymbols(p));
ClientConnection.instance.onWorkspaceSymbol(p => DocSymbolMapper.instance.getDocSymbolsFromWorkspace(p));

DocHandler.instance.onDidOpen(() => {
});
DocHandler.instance.onDidClose(closed => {
	DocSettings.instance.delete(closed.document);
	DocSymbolMapper.instance.delete(closed.document);
});
DocHandler.instance.onDidChangeContent(changed => {
	DocValidation.instance.validate(changed.document);
});

ClientConnection.instance.listen(); 					// Listen on the Connection.service
DocHandler.instance.listen(ClientConnection.instance); // Make the text document manager listen on the Connection.service (for open, change and close text document events)