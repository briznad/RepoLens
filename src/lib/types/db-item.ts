export type Id = string;

export interface DBItem {
	createdAt  : string;
	createdBy  : string;
	deletedAt? : string;
	deletedBy? : string;
	id         : Id;
	updatedAt  : string;
	updatedBy  : string;
}
