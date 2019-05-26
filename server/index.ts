import {
	DidChangeConfigurationNotification,
	InitializeParams,
	TextDocumentSyncKind,
} from 'vscode-languageserver';

import { CodeCompletion } from './CodeCompletionService';
import { CodeFormatting } from './CodeFormattingService';
import { DocMap } from './DocMapService';
import { DocValidation } from './DocValidationService';
import { LanguageSettings } from './LanguageSettingsService';
import { pb } from './PureBasicAPI';

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

pb.connection.onInitialize((params: InitializeParams) => {
	LanguageSettings.service.initialize(params);
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

pb.connection.onInitialized(() => {
	if (LanguageSettings.service.hasWorkspaceConfigCapability) {
		// Register for all configuration changes.
		pb.connection.client.register(DidChangeConfigurationNotification.type);
	}
	if (LanguageSettings.service.hasWorkspaceFolderCapability) {
		pb.connection.workspace.getWorkspaceFolders().then(folders => folders.forEach(folder => {
			pb.connection.console.log(folder.uri);
		}));
		pb.connection.workspace.onDidChangeWorkspaceFolders(changed => {
			pb.connection.console.log('Workspace folder change event received.' + changed);
		});
	}
});

pb.connection.onDidChangeConfiguration(changed => {
	LanguageSettings.service.reset(changed);
	pb.documentation.all().forEach(DocValidation.service.validate);
});
pb.connection.onDidChangeWatchedFiles(() => {
	pb.connection.console.log('We received an file change event');
});
pb.connection.onCompletion(CodeCompletion.service.getCompletionItems);
pb.connection.onCompletionResolve(CodeCompletion.service.getCompletionDescription);
pb.connection.onDocumentFormatting(p => CodeFormatting.service.formatAll(p));
pb.connection.onDocumentRangeFormatting(p => CodeFormatting.service.formatRange(p));
pb.connection.onDocumentOnTypeFormatting(p => CodeFormatting.service.formatOnType(p));
pb.connection.onDocumentSymbol(p => DocMap.service.getDocSymbols(p));
pb.connection.onWorkspaceSymbol(p => DocMap.service.getDocSymbolsFromWorkspace(p));

pb.documentation.onDidOpen(() => {
});
pb.documentation.onDidClose(closed => {
	LanguageSettings.service.delete(closed.document);
	DocMap.service.delete(closed.document);
});
pb.documentation.onDidChangeContent(changed => {
	DocValidation.service.validate(changed.document);
});

pb.connection.listen(); 				// Listen on the pb.connection
pb.documentation.listen(pb.connection); // Make the text document manager listen on the pb.connection (for open, change and close text document events)