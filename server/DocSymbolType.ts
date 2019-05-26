import { DocSymbolValidator } from './DocSymbolValidator';
import { SymbolKind } from 'vscode-languageserver';

/**
 * Type of document symbol
 */
export namespace DocSymbolType {
	export const Unknown = {};
	export const Module = {
		icon: SymbolKind.Module,
		validator: DocSymbolValidator.ValidName,
	};
	export const Procedure = {
		icon: SymbolKind.Function,
		validator: DocSymbolValidator.ValidName,
	};
	export const Macro = {
		icon: SymbolKind.Function,
		validator: DocSymbolValidator.ValidName,
	};
	export const Interface = {
		icon: SymbolKind.Interface,
		validator: DocSymbolValidator.ValidName,
	};
	export const Structure = {
		icon: SymbolKind.Struct,
		validator: DocSymbolValidator.ValidName,
	};
	export const Enum = {
		icon: SymbolKind.Enum,
		validator: DocSymbolValidator.ValidName$,
	};
	export const EnumMember = {
		icon: SymbolKind.EnumMember,
		validator: DocSymbolValidator.ValidConstantName$,
	};
	export const Constant = {
		icon: SymbolKind.Constant,
		validator: DocSymbolValidator.ValidConstantName$,
	};
	export const Import = {
		icon: SymbolKind.Package,
		validator: DocSymbolValidator.ValidString,
	};
}
export type DocSymbolType = { readonly icon?: SymbolKind; readonly validator?: DocSymbolValidator };
