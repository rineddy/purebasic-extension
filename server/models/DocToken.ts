/**
 * Text token extracted from document
 */
export class DocToken {
	public readonly index: number;
	public readonly groups: { [key: string]: string };

	public constructor(init?: Partial<DocToken>) {
		Object.assign(this, init);
	}
}