# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.1] - 2022-06-13
### Changed
- Changed type validation messages and added a validation step for tables with non-string indices.

## [0.6.0] - 2022-05-30
### Added
- Added a `ConnectParallel` method to both dispatchers.
- Exposed the `Check` utility type.

### Changed
- Internal changes
- Improved the generated remotes types for better visualization.
- More JSDoc texts to some object fields for readability.

### Fixed
- Fixed object type configuration in `NetBuilder:Configure` not working applying the settings.

## [0.5.0] - 2022-05-20
### Added
- Added `PreGeneration` configuration field.
- Added `CacheFunctions` configuration field.
- Added `Label` configuration field.
- Added `Debug` configuration field.
- Added a `Wait` method to both dispatchers.

### Changed
- **[breaking]** Changed `SupressWarnings` method in `ConfigurationBuilder` to `SuppressWarnings`. (typo fix)
- **[breaking]** Changed `SetRoot` method in `ConfigurationBuilder` to `SetRootInstance`.
- **[breaking]** Changed RootInstance option to only accept a Instance.
- The `Connect` method on both dispatchers now returns its `RBXScriptConnection`.
- `ClientDispatcher` will now throw an error if the remote instance could not be found.

### Removed
- Removed deprecated configuration methods from `NetBuilder`.

## [0.4.0] - 2022-04-30
### Added
- Added `RootName` field to configuration.
- Added `SetRootName` method to `ConfigurationBuilder`.

## [0.3.0] - 2022-04-29
### Added
- Added `Serialization.CreateSerializationDefinition`.
- Added `SerializationDefinition`.

### Changed
- `SerializationCreator`'s methods (for serializers) now have a definition parameter, so that it can be used for manual serialization.
- Exposed the `Serialization` namespace.
- Exposed the `SerializedObject` type.

## [0.2.3] - 2022-04-28
### Changed
- Removes a `print(obj)` call from a module. Yeah...

## [0.2.2] - 2022-04-28
### Changed
- Internal improvements on middleware code.
- Updated the readme file to be a bit more consistent.

### Fixed
- Fixed serialization not working for serializers.

## [0.2.1] - 2022-04-23
### Fixed
- Fixed `ClientDispatcher` and `ServerDispatcher` types not being emitted.

## [0.2.0] - 2022-04-22
### Added
- Added `NetBuilder.CreateTypeChecker`
- Added `NetBuilder:AsNamespace`
- Added `DefinitionBuilder`
- Added `ConfigurationBuilder`
- Added a logger feature.
- Added type validation when sending requests.

### Changed
- **[breaking]** Changed the way definitions are referenced. `ClientDispatcher` and `ServerDispatcher` are no longer needed to be imported. Instead, definitions can be directly acessed via `Definitions.Client.*` or `Definitions.Server.*`.
- **[breaking]** `NetBuilder:SetRoot` and `NetBuilder:SupressWarnings` are now deprecated. Use the `NetBuilder:Configure` method instead, which accepts a dictionary or a function that returns a `ConfigurationBuilder`.
- **[breaking]** Definitions now must be created via `DefinitionBuilder`.
- **[breaking]** Namespaces now must be created via `NetBuilder:AsNamespace`.
- **[breaking]** Changed the `With` prefix from `NetBuilder`'s methods to `Use`.
- **[breaking]** Changed the `Add` prefix from `NetBuilder`'s methods to `Bind`.

### Fixed
- Properly handle timeout for async functions.

### Removed
- Removed `EventBuilder`
- Removed `FunctionBuilder`
- Removed `Client` from the imports.
- Removed `Server` from the imports.

## [0.1.0] - 2022-04-03
### Added
- Added `NetBuilder`
- Added `NetBuilder.CreateSerializer`
- Added `NetBuilder.CreateMiddleware`
- Added `EventBuilder`
- Added `FunctionBuilder`
- Added `Client`
- Added `Server`
- Added `RateLimiter`
- Added `Tracer`