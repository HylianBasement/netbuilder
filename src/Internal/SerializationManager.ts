import { Option } from "@rbxts/rust-classes";

import { RemoteDefinitionNamespace, SerializableClass, SerializableClassInstance } from "../definitions";

import Serialization from "../Symbol/Serialization";

import isSerializedObject from "../Util/isSerializedObject";
import netBuilderFormat from "../Util/netBuilderFormat";

namespace SerializationManager {
	export function Serialize(namespace: RemoteDefinitionNamespace, v: defined) {
		return isSerializableClassInstance(namespace, v)
			? "Serialize" in v
				? v.Serialize()
				: v.serialize()
			: v;
	}

	export function Deserialize(namespace: RemoteDefinitionNamespace, v: defined) {
		const serializables = namespace[Serialization] as Map<string, SerializableClass>;

		return isSerializedObject(v)
			? Option.wrap(serializables.get(v.ClassName))
					.andWith((s) => Option.some(s.deserialize(v.Value)))
					.expect(
						netBuilderFormat(
							`Class "${v.ClassName}" is not a registered serializable class.`,
						),
					)
			: v;
	}

	function isSerializableClassInstance(
		namespace: RemoteDefinitionNamespace,
		value: unknown,
	): value is SerializableClassInstance {
		if (!typeIs(value, "table")) {
			return false;
		}

		const mt = getmetatable(value);

		if (!typeIs(mt, "table") || !("ClassName" in mt)) {
			return false;
		}

		const serializables = namespace[Serialization] as Map<string, SerializableClass>;

		return serializables.has((mt as { ClassName: string }).ClassName);
	}
}

export = SerializationManager;
