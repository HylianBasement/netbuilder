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

import symbolDictionary from "../Util/symbolDictionary";

/** @internal */
namespace Serialization {
	export function Serialize(namespace: DefinitionNamespace, value: defined) {
		const symbols = symbolDictionary(namespace);
		const map = symbols[SerializationMap] as ISerializationMap;

		const mt = getmetatable(value) as never;
		const serializer = map.SerializerClasses.get(mt)?.Serializer;

		if (serializer) {
			return serializer.Serialization(namespace, value);
		}

		return isSerializableClassInstance(namespace, value)
			? {
					SerializationType: SerializationType.Implemented,
					SerializationId: (symbols[SerializationMap] as ISerializationMap).Serializables.get(
						mt,
					)!,
					Value: "Serialize" in value ? value.Serialize() : value.serialize(),
			  }
			: value;
	}

	export function Deserialize(namespace: DefinitionNamespace, value: defined) {
		if (!isSerializedObject(value)) {
			return value;
		}

		const symbols = symbolDictionary(namespace);

		if (value.SerializationType === SerializationType.Implemented) {
			const serializables = symbols[Serializables] as Array<SerializableClass>;
			const mt = serializables[value.SerializationId - 1];

			return "deserialize" in mt
				? mt.deserialize(value.Value)
				: (
						mt as unknown as {
							Deserialize(serialized: object): SerializableClassInstance;
						}
				  ).Deserialize(value.Value);
		}

		const serializers = symbols[Serializers] as Array<NetBuilderSerializer<defined>>;

		return serializers[value.SerializationId - 1].Deserialization(value.Value);
	}

	export function IsSerializer(value: defined): value is NetBuilderSerializer<defined> {
		return (
			type(value) === "table" &&
			"Class" in value &&
			"Serialization" in value &&
			"Deserialization" in value
		);
	}

	export function Contains(namespace: DefinitionNamespace, object: object) {
		const symbols = symbolDictionary(namespace);
		const map = symbols[SerializationMap] as ISerializationMap;

		const mt = getmetatable(object) as never;

		return mt !== undefined && (map.SerializerClasses.has(mt) || map.Serializables.has(mt));
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

		const map = symbolDictionary(namespace)[SerializationMap] as ISerializationMap;

		return map.Serializables.has(mt);
	}
}

export = Serialization;
