type BaseTab = {
	link: string;
	activeOnDescendent?: boolean;
	matchPath?: RegExp;
};

interface TabOptionalTitle extends BaseTab {
	title?: string;
	icon: string;
}

interface TabOptionalIcon extends BaseTab {
	title: string;
	icon?: string;
}

export type Tab = TabOptionalTitle | TabOptionalIcon;
