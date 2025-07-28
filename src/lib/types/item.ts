import type { Id, DBItem } from '$types/db-item';
import type { Measurement, MeasurementType } from '$types/measurement';
import type { Department } from '$types/department';


export type ItemMap = {
	[ key : Id ] : Item;
}

export interface Item extends DBItem {
	originalInput      : string;
	quantity           : number;
	measurement        : Measurement;
	measurementType    : MeasurementType;
	description        : string;
	department         : Department;
	ingredient?        : string;
	preparation?       : string;
	checked?           : boolean;
	displayedQuantity? : number;
	aiParsed?          : boolean;
}

export type PartialItem = Partial<Item>;
