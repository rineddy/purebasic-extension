import { ClosureStatus, DocSymbolType } from '.';

/**
 * Text token extracted from document
 */
export class DocToken {
	public startIndex?: number;
	public readonly index: number;
	public readonly lastIndex: number;
	public readonly groups: { [key: string]: string };
	closure?: ClosureStatus;
	type?: DocSymbolType;

	public constructor(init?: Partial<DocToken>) {
		Object.assign(this, init);
	}
}