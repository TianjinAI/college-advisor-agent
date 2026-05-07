interface ModelSwitcherProps {
  availableModels: string[];
  currentModel: string;
  onChange: (model: string) => void;
  isLoading?: boolean;
}

export default function ModelSwitcher({
  availableModels,
  currentModel,
  onChange,
  isLoading = false,
}: ModelSwitcherProps) {
  return (
    <div className="model-switcher">
      <label htmlFor="model-selector">Model</label>
      <select
        id="model-selector"
        className="model-select"
        value={currentModel}
        onChange={(event) => onChange(event.target.value)}
        disabled={isLoading || availableModels.length === 0}
      >
        {availableModels.map((model) => (
          <option key={model} value={model}>
            {model}
          </option>
        ))}
      </select>
    </div>
  );
}
