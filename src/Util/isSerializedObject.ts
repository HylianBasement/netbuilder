import { SerializedObject } from "../definitions";

export = (value: unknown): value is SerializedObject =>
	typeIs(value, "table") && "ClassName" in value && "Value" in value;
