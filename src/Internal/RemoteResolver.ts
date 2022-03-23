import { ReplicatedStorage } from "@rbxts/services";
import { Iterator, Option } from "@rbxts/rust-classes";

import {
	NetBuilderConfiguration,
	Remote,
	RemoteDefinition,
	RemoteDefinitionMembers,
	RemoteDefinitionNamespace,
} from "../definitions";

import Configuration from "../Symbol/Configuration";
import NamespaceId from "../Symbol/NamespaceId";
import NamespaceParent from "../Symbol/NamespaceParent";

import netBuilderWarn from "../Util/netBuilderWarn";
import getRemoteInstanceKind from "../Util/getRemoteInstanceKind";
import definitionInfo from "../Util/definitionInfo";

interface TreeNode {
	Name: string;
	Remote: Option<Remote>;
}

interface Entry {
	Members: RemoteDefinitionMembers;
	Manager: RemoteResolver<Callback>;
	IsSender: boolean;
	Tree: readonly TreeNode[];
}

/** @internal */
class RemoteResolver<F extends Callback> {
	private static readonly entries = new Array<Entry>();

	private static defaultRootName = "NetBuilderRemotes";

	private static root: Instance;

	private constructor(private readonly remote: Remote<F>) {}

	private static generate(parent: Instance, tree: readonly TreeNode[]) {
		const wasFound = Iterator.fromItems(...tree)
			.findMap<Remote<Callback>>((node) =>
				node.Remote.isSome() && parent.Name === node.Name ? node.Remote : Option.none(),
			)
			.andWith((remote) => {
				remote.Parent = parent;

				return Option.some(true);
			})
			.unwrapOr(false);

		if (!wasFound) {
			const newTree = [...tree];
			newTree.shift();

			const first = newTree[0];

			if (first) {
				const dir =
					parent.FindFirstChild(first.Name) ?? this.createDirectory(first.Name, parent);

				this.generate(dir as Folder, newTree);
			}
		}

		return tree;
	}

	private static createTree(remote: Remote, definition: RemoteDefinition) {
		const { root } = this;

		function visitNamespaces(tree: TreeNode[], namespace: RemoteDefinitionNamespace, first?: true) {
			const name = namespace[NamespaceId] as string | undefined;
			const parent = namespace[NamespaceParent] as RemoteDefinitionNamespace | undefined;

			tree.unshift({
				Name: name ?? root.Name,
				Remote: first ? Option.some(remote) : Option.none(),
			});

			if (parent) visitNamespaces(tree, parent);

			return tree;
		}

		return visitNamespaces([], (definition as unknown as RemoteDefinitionMembers).Namespace, true);
	}

	private static createDirectory(name: string, parent: Instance) {
		const folder = new Instance("Folder");
		folder.Parent = parent;
		folder.Name = name;

		return folder;
	}

	private static unwrapRootInstance(root: NetBuilderConfiguration["RootInstance"]) {
		return typeIs(root, "function")
			? Option.some(root(ReplicatedStorage))
			: root
			? Option.some(root)
			: Option.none<Instance>();
	}

	// Server
	public static For<F extends Callback>(definition: RemoteDefinition, isSender: boolean) {
		const def = definition as unknown as RemoteDefinitionMembers;
		const config = def.Namespace[Configuration] as NetBuilderConfiguration;

		this.unwrapRootInstance(config.RootInstance)
			.andWith<Instance>((root) =>
				root.Parent && this.root !== root ? Option.some(root) : Option.none(),
			)
			.andWith((root) => {
				this.root = root;

				return Option.some(true);
			})
			.unwrapOr(!this.root && this.createDirectory(this.defaultRootName, ReplicatedStorage));

		const { entries } = this;
		const { Id, Kind } = def;

		let isDuplicate = false;

		return [
			Iterator.fromItems(...entries)
				.find(({ Members, IsSender }) => Members.Id === Id && IsSender === isSender)
				.andWith(({ Members, Manager, Tree }) => {
					isDuplicate = true;

					if ((Members as unknown as RemoteDefinition) === definition) {
						netBuilderWarn(
							definition,
							`Detected a duplicated server dispatcher of ${[
								...Tree.map(({ Name }) => Name),
								Id,
							].join(".")}. A new instance will not be created.`,
						);
					} else {
						netBuilderWarn(
							definition,
							`"${Id}" is conflicting with an existing ${getRemoteInstanceKind(
								Kind,
							)}.\n\nPath: ${[
								...Tree.map(({ Name }) => Name),
								Tree[0].Remote ? definitionInfo(def) : Id,
							].join(" -> ")}`,
						);
					}

					return Option.some(Manager);
				})
				.unwrapOrElse(() => {
					const Remote = new Instance(getRemoteInstanceKind(Kind)) as Remote<F>;
					Remote.Name = Id;

					const Manager = new RemoteResolver(Remote);

					entries.push({
						Tree: this.generate(this.root, this.createTree(Remote, definition)),
						Members: definition as unknown as RemoteDefinitionMembers,
						IsSender: isSender,
						Manager,
					});

					return Manager;
				})
				.GetInstance(),
			isDuplicate,
		] as LuaTuple<[Remote<F>, boolean]>;
	}

	// Client
	public static Request<F extends Callback>(definition: RemoteDefinitionMembers) {
		const root = this.unwrapRootInstance(
			(definition.Namespace[Configuration] as NetBuilderConfiguration).RootInstance,
		) as Option<{ Name: string; Parent?: Instance }>;

		const parent = root.andWith((root) => Option.some(root.Parent!)).unwrapOr(ReplicatedStorage);

		return Promise.retryWithDelay(
			() =>
				new Promise((res, rej) => {
					const remote = parent
						.WaitForChild(root.unwrapOr({ Name: this.defaultRootName }).Name)
						.FindFirstChild(definition.Id, true);

					remote ? res(remote) : rej();
				}),
			50,
			math.pi / 100,
		)
			.catch(() =>
				netBuilderWarn(definition, `Could not find ${definitionInfo(definition)} in the tree.`),
			)
			.await()[1] as Remote<F> | undefined;
	}

	public GetInstance() {
		return this.remote;
	}
}

export = RemoteResolver;
