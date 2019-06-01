import { SymbolKind } from 'vscode-languageserver';
import { DocSymbolValidator } from '../helpers';

/**
 * Type of document symbol
 */
export namespace DocSymbolType {
	export const Module = <DocSymbolType>{
		icon: SymbolKind.Module,
		validator: DocSymbolValidator.ValidName,
	};
	export const Procedure = <DocSymbolType>{
		icon: SymbolKind.Function,
		validator: DocSymbolValidator.ValidName,
	};
	export const Macro = <DocSymbolType>{
		icon: SymbolKind.Function,
		validator: DocSymbolValidator.ValidName,
	};
	export const Interface = <DocSymbolType>{
		icon: SymbolKind.Interface,
		validator: DocSymbolValidator.ValidName,
	};
	export const Structure = <DocSymbolType>{
		icon: SymbolKind.Struct,
		validator: DocSymbolValidator.ValidName,
	};
	export const Enum = <DocSymbolType>{
		icon: SymbolKind.Enum,
		validator: DocSymbolValidator.ValidName$,
	};
	export const EnumMember = <DocSymbolType>{
		icon: SymbolKind.EnumMember,
		validator: DocSymbolValidator.ValidConstantName$,
	};
	export const Constant = <DocSymbolType>{
		icon: SymbolKind.Constant,
		validator: DocSymbolValidator.ValidConstantName$,
	};
	export const Import = <DocSymbolType>{
		icon: SymbolKind.Package,
		validator: DocSymbolValidator.ValidString,
	};
}
export type DocSymbolType = { readonly icon?: SymbolKind; readonly validator?: DocSymbolValidator };
