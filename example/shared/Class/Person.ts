import { NetBuilder, Serializable } from "@rbxts/netbuilder";

interface Props {
	name: string;
	age: number;
}

class Person implements Serializable<Props> {
	public constructor(private name: string, private age: number) {}

	public static Type = NetBuilder.CreateTypeChecker<Person>(
		(v) =>
			[v instanceof Person, `Expected Person, got ${typeOf(v)}.`] as LuaTuple<[boolean, string]>,
	);

	public static deserialize({ name, age }: Props) {
		return new Person(name, age);
	}

	private toString() {
		return `Person<${this.name}>`;
	}

	public Serialize() {
		return {
			name: this.name,
			age: this.age,
		};
	}

	public Introduce() {
		print(`Hello, my name is ${this.name} and I'm ${this.age} years old!`);
	}

	public IsUnderage() {
		return this.age < 18;
	}

	public IncrementAge(add: number) {
		this.age += add;
	}
}

export = Person;
