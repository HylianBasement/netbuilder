import {
	DefinitionNamespace,
	SerializationType,
	SerializableClass,
	SerializableClassInstance,
	NetBuilderSerializer,
	SerializedObject,
	SerializationMap as ISerializationMap,
	Definition,
	DefinitionMembers,
	SerializationDefinition,
} from "../definitions";

import Serializables from "../Symbol/Serializables";
import Serializers from "../Symbol/Serializers";
import SerializationMap from "../Symbol/SerializationMap";

import symbolDictionary from "../Util/symbolDictionary";

/**
 * Collection of functions used to manually serialize registered class objects.
 *
 * Util for serializing nested classes.
 */
namespace Serialization {
	/** Serializes a registered class object. */
	export function Serialize<T extends object>(definition: SerializationDefinition, value: T) {
		const namespace = getNamespaceFromDefinition(definition);
		const symbols = symbolDictionary(namespace);
		const map = symbols[SerializationMap] as ISerializationMap;

		const mt = getmetatable(value) as never;
		const serializer = map.SerializerClasses.get(mt)?.Serializer;

		if (serializer) {
			return serializer.Serialization(namespace, value, definition) as SerializedObject<T>;
		}

		return (
			isSerializableClassInstance(namespace, value)
				? {
						SerializationType: SerializationType.Implemented,
						SerializationId: (
							symbols[SerializationMap] as ISerializationMap
						).Serializables.get(mt)!,
						Value:
							"Serialize" in value
								? value.Serialize(definition)
								: value.serialize(definition),
				  }
				: value
		) as never;
	}

	/** Deserializes a serialized object according to the class it references. */
	export function Deserialize(definition: SerializationDefinition, value: defined) {
		if (!isSerializedObject(value)) {
			return value;
		}

		const symbols = symbolDictionary(getNamespaceFromDefinition(definition));

		if (value.SerializationType === SerializationType.Implemented) {
			const serializables = symbols[Serializables] as Array<SerializableClass>;
			const mt = serializables[value.SerializationId - 1];

			return "deserialize" in mt
				? mt.deserialize(value.Value, definition)
				: (
						mt as unknown as {
							Deserialize(
								serialized: object,
								definition: SerializationDefinition,
							): SerializableClassInstance;
						}
				  ).Deserialize(value.Value, definition);
		}

		const serializers = symbols[Serializers] as Array<NetBuilderSerializer<defined>>;

		return serializers[value.SerializationId - 1].Deserialization(value.Value, definition);
	}

	/**
	 * Checks to see if `value` is a serializer.
	 * @internal
	 */
	export function IsSerializer(value: defined): value is NetBuilderSerializer<defined> {
		return (
			type(value) === "table" &&
			"Class" in value &&
			"Serialization" in value &&
			"Deserialization" in value
		);
	}

	/**
	 * Creates a definition containing only useful fields for serialization.
	 * @internal
	 */
	export function CreateSerializationDefinition(
		definition: DefinitionMembers,
	): SerializationDefinition {
		const serializationDefinition = {
			Id: definition.Id,
			Kind: definition.Kind,
			Namespace: definition.Namespace,
		};

		table.freeze(serializationDefinition);

		return serializationDefinition;
	}

	/** Checks if the class is registered in the definition's namespace. */
	export function Contains(definition: SerializationDefinition, object: object) {
		const symbols = symbolDictionary(getNamespaceFromDefinition(definition));
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

	function getNamespaceFromDefinition(definition: SerializationDefinition) {
		return (definition as unknown as DefinitionMembers).Namespace;
	}
}

export = Serialization;
