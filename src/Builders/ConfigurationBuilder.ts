import { NetBuilderConfiguration, NetBuilderLogger } from "../definitions";

class ConfigurationBuilder<O extends keyof ConfigurationBuilder = never> {
	private configuration: NetBuilderConfiguration = { SuppressWarnings: false };

	/** Changes the logger to all of the namespace's definitions. */
	public SetLogger(logger: NetBuilderLogger) {
		this.configuration.Logger = logger;

		return this as unknown as Omit<ConfigurationBuilder<O | "SetLogger">, O | "SetLogger">;
	}

	/** Sets the root instance of the remotes from the namespace. */
	public SetRoot(root: Instance | ((replicatedStorage: ReplicatedStorage) => Instance)) {
		this.configuration.RootInstance = root;

		return this as unknown as Omit<ConfigurationBuilder<O | "SetRoot">, O | "SetRoot">;
	}

	/** Disables the warnings emitted from the namespace. */
	public SupressWarnings(value = true) {
		this.configuration.SuppressWarnings = value;

		return this as unknown as Omit<
			ConfigurationBuilder<O | "SupressWarnings">,
			O | "SupressWarnings"
		>;
	}

	private Build() {
		return this.configuration;
	}
}

export = ConfigurationBuilder;
