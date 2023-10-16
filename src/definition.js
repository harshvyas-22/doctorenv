export const DefinitionDictionary = new Map();

export const DefinitionStatus = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  PARTIAL: "PARTIAL",
};

export class Definition {
  constructor({ name, checker, suggestions, definitions }) {
    if (checker && definitions?.length > 0)
      throw new Error(
        `Definition ${name} has both checker and definitions. You cannot use in the same time.`
      );

    if (!name) throw new Error("Definition name is required");

    this.name = name;
    this.checker = checker;
    this.status = DefinitionStatus.PENDING;
    this.suggestions = suggestions ?? [];
    this.isGroup = definitions?.length > 0;
    this.definitions = [];

    if (this.isGroup)
      this.definitions = definitions.map((d) => new Definition(d));
  }

  get hasSucceed() {
    return this.status === DefinitionStatus.SUCCESS;
  }

  pushSuggestion(suggestion) {
    this.suggestions.push(suggestion);
  }

  async evaluate(definition = this) {
    DefinitionDictionary.set(definition.name, definition);

    for (const def of definition.definitions) {
      DefinitionDictionary.set(definition.name, definition);
      await definition.evaluate(def);
    }

    if (!definition.isGroup) {
      definition.status = definition.checker
        ? (await definition.checker({ definition }))
          ? DefinitionStatus.SUCCESS
          : DefinitionStatus.FAILED
        : DefinitionStatus.SUCCESS;
    } else {
      const statuses = definition.definitions.map((def) => def.status);
      const allFailed = statuses.every((s) => s === DefinitionStatus.FAILED);
      const hasFailed = statuses.some((s) => s === DefinitionStatus.FAILED);

      const allSuccess = statuses.every((s) => s === DefinitionStatus.SUCCESS);
      const hasSuccess = statuses.some((s) => s === DefinitionStatus.SUCCESS);

      if (allFailed && hasFailed) definition.status = DefinitionStatus.FAILED;
      else if (allSuccess && hasSuccess)
        definition.status = DefinitionStatus.SUCCESS;
      else definition.status = DefinitionStatus.PARTIAL;
    }

    return this;
  }
}
