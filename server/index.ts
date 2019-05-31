import { DidChangeConfigurationNotification, InitializeParams, TextDocumentSyncKind } from 'vscode-languageserver';

import { Client } from './services/Client';
import { ClientSettings } from './services/ClientSettings';
import { CodeCompletion } from './services/CodeCompletion';
import { DocCollection } from './services/DocCollection';
import { DocFormatting } from './services/DocFormatting';
import { DocSymbolMap } from './services/DocSymbolMap';
import { DocValidation } from './services/DocValidation';

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

Client.connection.onInitialize((params: InitializeParams) => {
	ClientSettings.service.initialize(params);
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

Client.connection.onInitialized(() => {
	if (ClientSettings.service.hasWorkspaceConfigCapability) {
		// Register for all configuration changes.
		Client.connection.client.register(DidChangeConfigurationNotification.type);
	}
	if (ClientSettings.service.hasWorkspaceFolderCapability) {
		Client.connection.workspace.getWorkspaceFolders().then(folders => folders.forEach(folder => {
			Client.connection.console.log(folder.uri);
		}));
		Client.connection.workspace.onDidChangeWorkspaceFolders(changed => {
			Client.connection.console.log('Workspace folder change event received.' + changed);
		});
	}
});

Client.connection.onDidChangeConfiguration(changed => {
	ClientSettings.service.reset(changed);
	DocCollection.service.all().forEach(DocValidation.service.validate);
});
Client.connection.onDidChangeWatchedFiles(() => {
	Client.connection.console.log('We received an file change event');
});
Client.connection.onCompletion(p => CodeCompletion.service.getCompletionItems(p));
Client.connection.onCompletionResolve(p => CodeCompletion.service.getCompletionDescription(p));
Client.connection.onDocumentFormatting(p => DocFormatting.service.formatAll(p));
Client.connection.onDocumentRangeFormatting(p => DocFormatting.service.formatRange(p));
Client.connection.onDocumentOnTypeFormatting(p => DocFormatting.service.formatOnType(p));
Client.connection.onDocumentSymbol(p => DocSymbolMap.service.getDocSymbols(p));
Client.connection.onWorkspaceSymbol(p => DocSymbolMap.service.getDocSymbolsFromWorkspace(p));

DocCollection.service.onDidOpen(() => {
});
DocCollection.service.onDidClose(closed => {
	ClientSettings.service.delete(closed.document);
	DocSymbolMap.service.delete(closed.document);
});
DocCollection.service.onDidChangeContent(changed => {
	DocValidation.service.validate(changed.document);
});

Client.connection.listen(); 				// Listen on the Connection.service
DocCollection.service.listen(Client.connection); // Make the text document manager listen on the Connection.service (for open, change and close text document events)