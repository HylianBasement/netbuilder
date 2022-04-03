import {
	DefinitionNamespace,
	SerializationType,
	SerializableClass,
	SerializableClassInstance,
	NetBuilderSerializer,
	SerializedObject,
	SerializationMap as ISerializationMap,
} from "../definitions";

import Serializables from "../Symbol/Serializables";
import Serializers from "../Symbol/Serializers";
import SerializationMap from "../Symbol/SerializationMap";

namespace Serialization {
	export function Serialize(namespace: DefinitionNamespace, value: defined) {
		const map = namespace[SerializationMap] as ISerializationMap;

		const mt = getmetatable(value) as never;
		const serializer = map.SerializerClasses.get(mt)?.Serializer;

		if (serializer) {
			return serializer.Serialize(namespace, value);
		}

		return isSerializableClassInstance(namespace, value)
			? {
					SerializationType: SerializationType.Implemented,
					SerializationId: (
						namespace[SerializationMap] as ISerializationMap
					).Serializables.get(mt)!,
					Value: "Serialize" in value ? value.Serialize() : value.serialize(),
			  }
			: value;
	}

	export function Deserialize(namespace: DefinitionNamespace, value: defined) {
		if (!isSerializedObject(value)) {
			return value;
		}

		if (value.SerializationType === SerializationType.Implemented) {
			const serializables = namespace[Serializables] as Array<SerializableClass>;
			const mt = serializables[value.SerializationId - 1];

			return "deserialize" in mt
				? mt.deserialize(value.Value)
				: (
						mt as unknown as {
							Deserialize(serialized: object): SerializableClassInstance;
						}
				  ).Deserialize(value.Value);
		}

		const serializers = namespace[Serializers] as Array<NetBuilderSerializer<defined>>;

		return serializers[value.SerializationId - 1].Deserialize(value.Value);
	}

	export function IsSerializer(value: defined): value is NetBuilderSerializer<defined> {
		return (
			type(value) === "table" && "Class" in value && "Serialize" in value && "Deserialize" in value
		);
	}

	function isSerializedObject(value: defined): value is SerializedObject<defined> {
		return (
			type(value) === "table" &&
			"SerializationType" in value &&
			"SerializationId" in value &&
			"Value" in value
		);
	}

	function isSerializableClassInstance(
		namespace: DefinitionNamespace,
		value: unknown,
	): value is SerializableClassInstance {
		if (!typeIs(value, "table")) {
			return false;
		}

		const mt = getmetatable(value) as never;

		if (!mt) {
			return false;
		}

		const map = namespace[SerializationMap] as ISerializationMap;

		return map.Serializables.has(mt);
	}
}

export = Serialization;