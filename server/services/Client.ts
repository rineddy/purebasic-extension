import { ProposedFeatures, createConnection } from 'vscode-languageserver';

/**
 * Provide a connection for the server. The connection uses Node's IPC as a transport.
 * Also include all preview / proposed LSP features.
 */
export namespace Client {
	export const connection = createConnection(ProposedFeatures.all);
}